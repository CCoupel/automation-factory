"""
Integration tests for git commit, push, and branch operations.

Uses shared conftest fixtures (in-memory SQLite, test_user, authenticated_client).
GitService methods that touch real git repos are mocked.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock

from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.git_credential import GitCredential
from app.utils.encryption import encrypt_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _create_git_project(session, user, git_url="https://github.com/example/repo.git", git_branch="main", cred_id=None):
    """Create a project linked to a git repo."""
    project = Project(
        name="Git Project",
        description="A project with git",
        owner_id=user.id,
        git_url=git_url,
        git_branch=git_branch,
        git_credentials_id=cred_id,
    )
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project


async def _create_artifact(session, project_id, path="site.yml", raw_content="- hosts: all\n"):
    """Create a project artifact."""
    artifact = ProjectArtifact(
        project_id=project_id,
        artifact_type="playbook",
        path=path,
        raw_content=raw_content,
    )
    session.add(artifact)
    await session.commit()
    await session.refresh(artifact)
    return artifact


# ---------------------------------------------------------------------------
# Tests: GET /projects/{id}/git/changes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestGetChanges:

    async def test_get_changes_returns_diff(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id)

        mock_changes = [
            {"path": "site.yml", "status": "modified"},
            {"path": "new_file.yml", "status": "added"},
        ]

        with patch(
            "app.services.git_service.GitService.get_changes",
            new_callable=AsyncMock,
            return_value=(mock_changes, "main"),
        ):
            response = await authenticated_client.get(
                f"/api/projects/{project.id}/git/changes"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["branch"] == "main"
        assert len(data["changes"]) == 2
        assert data["changes"][0]["path"] == "site.yml"
        assert data["changes"][0]["status"] == "modified"
        assert data["has_remote"] is True

    async def test_get_changes_no_git_url(self, authenticated_client, test_user, test_session):
        """Project without git_url returns 400."""
        project = Project(
            name="No Git",
            owner_id=test_user.id,
        )
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        response = await authenticated_client.get(
            f"/api/projects/{project.id}/git/changes"
        )
        assert response.status_code == 400

    async def test_get_changes_unauthenticated(self, test_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        response = await test_client.get(
            f"/api/projects/{project.id}/git/changes"
        )
        assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Tests: POST /projects/{id}/git/commit
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestCommit:

    async def test_commit_success(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)

        mock_result = {
            "commit_sha": "abc123def456",
            "message": "Update playbook",
            "files_changed": 2,
        }

        with patch(
            "app.services.git_service.GitService.commit",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/commit",
                json={"message": "Update playbook"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["commit_sha"] == "abc123def456"
        assert data["message"] == "Update playbook"
        assert data["files_changed"] == 2

    async def test_commit_empty_message(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)

        response = await authenticated_client.post(
            f"/api/projects/{project.id}/git/commit",
            json={"message": ""},
        )
        assert response.status_code == 422

    async def test_commit_no_git_url(self, authenticated_client, test_user, test_session):
        project = Project(name="No Git", owner_id=test_user.id)
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        response = await authenticated_client.post(
            f"/api/projects/{project.id}/git/commit",
            json={"message": "test"},
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Tests: POST /projects/{id}/git/push
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestPush:

    async def test_push_success(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)

        mock_result = {
            "pushed": True,
            "branch": "main",
            "commit_sha": "abc123",
        }

        with patch(
            "app.services.git_service.GitService.push",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/push"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["pushed"] is True
        assert data["branch"] == "main"

    async def test_push_no_repo(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)

        with patch(
            "app.services.git_service.GitService.push",
            new_callable=AsyncMock,
            side_effect=ValueError("No local repository to push. Commit first."),
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/push"
            )

        assert response.status_code == 400
        assert "Commit first" in response.json()["detail"]

    async def test_push_with_credential(self, authenticated_client, test_user, test_session):
        credential = GitCredential(
            user_id=test_user.id,
            name="My Token",
            provider="github",
            token_encrypted=encrypt_token("ghp_test123"),
        )
        test_session.add(credential)
        await test_session.commit()
        await test_session.refresh(credential)

        project = await _create_git_project(
            test_session, test_user, cred_id=credential.id
        )

        mock_result = {"pushed": True, "branch": "main", "commit_sha": "abc"}

        with patch(
            "app.services.git_service.GitService.push",
            new_callable=AsyncMock,
            return_value=mock_result,
        ) as mock_push:
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/push"
            )

        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Tests: GET /projects/{id}/git/branches
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestListBranches:

    async def test_list_branches(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)

        mock_branches = [
            {"name": "main", "is_current": True, "is_remote": False},
            {"name": "develop", "is_current": False, "is_remote": True},
        ]

        with patch(
            "app.services.git_service.GitService.list_branches",
            new_callable=AsyncMock,
            return_value=(mock_branches, "main"),
        ):
            response = await authenticated_client.get(
                f"/api/projects/{project.id}/git/branches"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["current"] == "main"
        assert len(data["branches"]) == 2


# ---------------------------------------------------------------------------
# Tests: POST /projects/{id}/git/branches
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestCreateBranch:

    async def test_create_branch(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)

        with patch(
            "app.services.git_service.GitService.create_branch",
            new_callable=AsyncMock,
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/branches",
                json={"name": "feature/new-thing"},
            )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "feature/new-thing"
        assert data["is_current"] is True
        assert data["is_remote"] is False

    async def test_create_branch_invalid_name(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)

        response = await authenticated_client.post(
            f"/api/projects/{project.id}/git/branches",
            json={"name": "invalid branch name!"},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Tests: POST /projects/{id}/git/branches/switch
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestSwitchBranch:

    async def test_switch_branch(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)
        await _create_artifact(test_session, project.id)

        mock_artifacts = [MagicMock(), MagicMock(), MagicMock()]

        with patch(
            "app.services.git_service.GitService.switch_branch",
            new_callable=AsyncMock,
            return_value=(mock_artifacts, ["Warning: parse issue"]),
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/branches/switch",
                json={"name": "develop"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["branch"] == "develop"
        assert data["artifacts_imported"] == 3
        assert len(data["warnings"]) == 1

    async def test_switch_branch_empty_name(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)

        response = await authenticated_client.post(
            f"/api/projects/{project.id}/git/branches/switch",
            json={"name": ""},
        )
        assert response.status_code == 422
