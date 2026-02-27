"""
Integration tests for git sync and conflict resolution endpoints.

Uses shared conftest fixtures (in-memory SQLite, test_user, authenticated_client).
GitService methods that touch real git repos are mocked.
"""

import pytest
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock

from app.models.project import Project
from app.models.project_artifact import ProjectArtifact


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_git_project(session, user, git_url="https://github.com/example/repo.git", git_branch="main"):
    project = Project(
        name="Git Project",
        description="A project with git",
        owner_id=user.id,
        git_url=git_url,
        git_branch=git_branch,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


async def _create_artifact(session, project_id, path="site.yml", artifact_type="playbook", raw_content="- hosts: all\n"):
    artifact = ProjectArtifact(
        project_id=project_id,
        artifact_type=artifact_type,
        path=path,
        raw_content=raw_content,
    )
    session.add(artifact)
    await session.commit()
    await session.refresh(artifact)
    return artifact


# ---------------------------------------------------------------------------
# Tests: POST /projects/{id}/git/sync
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestSync:

    async def test_sync_up_to_date(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id)

        with patch(
            "app.services.git_service.GitService.ensure_repo",
            new_callable=AsyncMock,
            return_value=Path("/tmp/fake-repo"),
        ), patch(
            "app.services.git_service.GitService.serialize_artifacts_to_disk",
            new_callable=AsyncMock,
        ), patch(
            "app.services.git_service.GitService.fetch_remote",
            new_callable=AsyncMock,
        ), patch(
            "app.services.git_service.GitService.get_divergence_info",
            new_callable=AsyncMock,
            return_value={"merge_base": "abc123", "local_ahead": 0, "remote_ahead": 0},
        ), patch(
            "app.services.git_service.GitService.cleanup_repo",
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/sync"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "up_to_date"
        assert data["remote_ahead_by"] == 0
        assert data["local_ahead_by"] == 0

    async def test_sync_fast_forward(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id)

        with patch(
            "app.services.git_service.GitService.ensure_repo",
            new_callable=AsyncMock,
            return_value=Path("/tmp/fake-repo"),
        ), patch(
            "app.services.git_service.GitService.serialize_artifacts_to_disk",
            new_callable=AsyncMock,
        ), patch(
            "app.services.git_service.GitService.fetch_remote",
            new_callable=AsyncMock,
        ), patch(
            "app.services.git_service.GitService.get_divergence_info",
            new_callable=AsyncMock,
            return_value={"merge_base": "abc123", "local_ahead": 0, "remote_ahead": 3},
        ), patch(
            "app.services.git_service.GitService.fast_forward",
            new_callable=AsyncMock,
        ), patch(
            "app.services.git_service.GitService.detect_structure",
            new_callable=AsyncMock,
            return_value=[],
        ), patch(
            "app.services.git_service.GitService.cleanup_repo",
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/sync"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "fast_forward"
        assert data["remote_ahead_by"] == 3

    async def test_sync_auto_merge(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id, path="site.yml")

        with patch(
            "app.services.git_service.GitService.ensure_repo",
            new_callable=AsyncMock,
            return_value=Path("/tmp/fake-repo"),
        ), patch(
            "app.services.git_service.GitService.serialize_artifacts_to_disk",
            new_callable=AsyncMock,
        ), patch(
            "app.services.git_service.GitService.fetch_remote",
            new_callable=AsyncMock,
        ), patch(
            "app.services.git_service.GitService.get_divergence_info",
            new_callable=AsyncMock,
            return_value={"merge_base": "abc123", "local_ahead": 1, "remote_ahead": 1},
        ), patch(
            "app.services.git_service.GitService.get_changed_files_between",
            new_callable=AsyncMock,
            side_effect=[
                ["site.yml"],       # local changed files
                ["other.yml"],      # remote changed files
            ],
        ), patch(
            "app.services.git_service.GitService.get_file_at_ref",
            new_callable=AsyncMock,
            side_effect=[
                "base content",     # site.yml at merge_base
                "local content",    # site.yml at HEAD
                "base content",     # site.yml at origin/main (unchanged)
                "base content",     # other.yml at merge_base
                "base content",     # other.yml at HEAD (unchanged)
                "remote content",   # other.yml at origin/main
            ],
        ), patch(
            "app.services.git_service.GitService.create_merge_commit",
            new_callable=AsyncMock,
            return_value={"commit_sha": "merge123", "message": "Auto-merge"},
        ), patch(
            "app.services.git_service.GitService.cleanup_repo",
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/sync"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "auto_merged"
        assert len(data["auto_merged_files"]) == 2
        assert len(data["conflicted_files"]) == 0

    async def test_sync_with_conflicts(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id, path="site.yml")

        with patch(
            "app.services.git_service.GitService.ensure_repo",
            new_callable=AsyncMock,
            return_value=Path("/tmp/fake-repo"),
        ), patch(
            "app.services.git_service.GitService.serialize_artifacts_to_disk",
            new_callable=AsyncMock,
        ), patch(
            "app.services.git_service.GitService.fetch_remote",
            new_callable=AsyncMock,
        ), patch(
            "app.services.git_service.GitService.get_divergence_info",
            new_callable=AsyncMock,
            return_value={"merge_base": "abc123", "local_ahead": 1, "remote_ahead": 1},
        ), patch(
            "app.services.git_service.GitService.get_changed_files_between",
            new_callable=AsyncMock,
            side_effect=[
                ["config.txt"],      # local changed
                ["config.txt"],      # remote changed
            ],
        ), patch(
            "app.services.git_service.GitService.get_file_at_ref",
            new_callable=AsyncMock,
            side_effect=[
                "line1\nline2\nline3\n",     # base
                "line1\nLOCAL\nline3\n",     # local (changed line 2)
                "line1\nREMOTE\nline3\n",    # remote (changed line 2)
            ],
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/sync"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "conflicts"
        assert len(data["conflicted_files"]) == 1
        assert data["conflicted_files"][0]["path"] == "config.txt"

    async def test_sync_no_git_url(self, authenticated_client, test_user, test_session):
        project = Project(name="No Git", owner_id=test_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        response = await authenticated_client.post(
            f"/api/projects/{project.id}/git/sync"
        )
        assert response.status_code == 400

    async def test_sync_unauthenticated(self, test_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        response = await test_client.post(
            f"/api/projects/{project.id}/git/sync"
        )
        assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: POST /projects/{id}/git/conflicts/resolve
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestResolveConflicts:

    async def test_resolve_ours(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id, path="site.yml")

        with patch(
            "app.services.git_service.GitService.create_merge_commit",
            new_callable=AsyncMock,
            return_value={"commit_sha": "merge456", "message": "Merge"},
        ), patch(
            "app.services.git_service.GitService.cleanup_repo",
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/conflicts/resolve",
                json={
                    "resolutions": [
                        {"path": "site.yml", "resolution": "ours"},
                    ],
                    "commit_message": "Keep our changes",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["commit_sha"] == "merge456"
        assert data["files_resolved"] == 1
        assert data["pushed"] is False

    async def test_resolve_theirs(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id, path="site.yml")

        with patch(
            "app.services.git_service.GitService.get_file_at_ref",
            new_callable=AsyncMock,
            return_value="remote content here",
        ), patch(
            "app.services.git_service.GitService.create_merge_commit",
            new_callable=AsyncMock,
            return_value={"commit_sha": "merge789", "message": "Merge"},
        ), patch(
            "app.services.git_service.GitService.cleanup_repo",
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/conflicts/resolve",
                json={
                    "resolutions": [
                        {"path": "site.yml", "resolution": "theirs"},
                    ],
                    "commit_message": "Take remote changes",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["commit_sha"] == "merge789"
        assert data["files_resolved"] == 1

    async def test_resolve_custom(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id, path="site.yml")

        with patch(
            "app.services.git_service.GitService.create_merge_commit",
            new_callable=AsyncMock,
            return_value={"commit_sha": "mergeabc", "message": "Merge"},
        ), patch(
            "app.services.git_service.GitService.cleanup_repo",
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/conflicts/resolve",
                json={
                    "resolutions": [
                        {
                            "path": "site.yml",
                            "resolution": "custom",
                            "custom_content": "merged content by user",
                        },
                    ],
                    "commit_message": "Manual merge",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["commit_sha"] == "mergeabc"

    async def test_resolve_with_auto_push(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id, path="site.yml")

        with patch(
            "app.services.git_service.GitService.create_merge_commit",
            new_callable=AsyncMock,
            return_value={"commit_sha": "merge_push", "message": "Merge"},
        ), patch(
            "app.services.git_service.GitService.push",
            new_callable=AsyncMock,
            return_value={"pushed": True, "branch": "main", "commit_sha": "merge_push"},
        ), patch(
            "app.services.git_service.GitService.cleanup_repo",
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/conflicts/resolve",
                json={
                    "resolutions": [
                        {"path": "site.yml", "resolution": "ours"},
                    ],
                    "commit_message": "Merge and push",
                    "auto_push": True,
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["pushed"] is True

    async def test_resolve_multiple_files(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id, path="site.yml")
        await _create_artifact(test_session, project.id, path="vars.yml", artifact_type="variable_file")

        with patch(
            "app.services.git_service.GitService.get_file_at_ref",
            new_callable=AsyncMock,
            return_value="remote vars content",
        ), patch(
            "app.services.git_service.GitService.create_merge_commit",
            new_callable=AsyncMock,
            return_value={"commit_sha": "multi_merge", "message": "Merge"},
        ), patch(
            "app.services.git_service.GitService.cleanup_repo",
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/conflicts/resolve",
                json={
                    "resolutions": [
                        {"path": "site.yml", "resolution": "ours"},
                        {"path": "vars.yml", "resolution": "theirs"},
                    ],
                    "commit_message": "Resolve multiple conflicts",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["files_resolved"] == 2

    async def test_resolve_no_git_url(self, authenticated_client, test_user, test_session):
        project = Project(name="No Git", owner_id=test_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        response = await authenticated_client.post(
            f"/api/projects/{project.id}/git/conflicts/resolve",
            json={
                "resolutions": [{"path": "f.yml", "resolution": "ours"}],
                "commit_message": "test",
            },
        )
        assert response.status_code == 400

    async def test_resolve_unauthenticated(self, test_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        response = await test_client.post(
            f"/api/projects/{project.id}/git/conflicts/resolve",
            json={
                "resolutions": [{"path": "f.yml", "resolution": "ours"}],
                "commit_message": "test",
            },
        )
        assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: Push rejection returns 409
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestPushRejection:

    async def test_push_rejected_returns_409(self, authenticated_client, test_user, test_session):
        from git import GitCommandError

        project = await _create_git_project(test_session, test_user)

        error = GitCommandError("push", status=1, stderr="rejected (non-fast-forward)")
        with patch(
            "app.services.git_service.GitService.push",
            new_callable=AsyncMock,
            side_effect=error,
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/push"
            )

        assert response.status_code == 409
        assert "rejected" in response.json()["detail"].lower() or "sync" in response.json()["detail"].lower()
