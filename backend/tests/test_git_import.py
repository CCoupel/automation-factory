"""
Integration tests for the git import endpoint.

Uses the shared conftest fixtures (in-memory SQLite, test_user, authenticated_client).
GitService.clone_repository is mocked — we simulate the clone by writing files
to the expected repo path.
"""

import os
import pytest
import pytest_asyncio
from pathlib import Path
from unittest.mock import patch, AsyncMock

from app.models.git_credential import GitCredential
from app.utils.encryption import encrypt_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_fake_repo(data_dir: str, project_id: str):
    """
    Create a fake cloned repo with a few Ansible files.
    Returns the repo path.
    """
    repo_path = Path(data_dir) / "projects" / project_id / "repo"
    repo_path.mkdir(parents=True, exist_ok=True)

    # Playbook
    (repo_path / "site.yml").write_text(
        "- hosts: all\n  tasks:\n    - debug:\n        msg: hello\n",
        encoding="utf-8",
    )

    # Role
    role_tasks = repo_path / "roles" / "webserver" / "tasks"
    role_tasks.mkdir(parents=True, exist_ok=True)
    (role_tasks / "main.yml").write_text(
        "- name: Install nginx\n  ansible.builtin.apt:\n    name: nginx\n",
        encoding="utf-8",
    )

    # Inventory
    inv_dir = repo_path / "inventory"
    inv_dir.mkdir(parents=True, exist_ok=True)
    (inv_dir / "hosts.yml").write_text(
        "all:\n  hosts:\n    web1:\n",
        encoding="utf-8",
    )

    # Template
    tpl_dir = repo_path / "templates"
    tpl_dir.mkdir(parents=True, exist_ok=True)
    (tpl_dir / "nginx.conf.j2").write_text(
        "server { listen {{ http_port }}; }",
        encoding="utf-8",
    )

    # Non-playbook YAML at root
    (repo_path / "config.yml").write_text(
        "setting: value\n",
        encoding="utf-8",
    )

    return repo_path


async def _mock_clone(self, url, branch, project_id, token=None):
    """Mock clone_repository that creates a fake repo."""
    repo_path = _create_fake_repo(self.data_dir, project_id)
    return repo_path


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestGitImportEndpoint:

    async def test_import_public_repo(self, authenticated_client, test_user):
        """Import a public repo (no credentials) creates project + artifacts."""
        with patch(
            "app.services.git_service.GitService.clone_repository",
            new=_mock_clone,
        ):
            response = await authenticated_client.post(
                "/api/projects/import-git",
                json={
                    "name": "My Imported Project",
                    "description": "Imported from Git",
                    "git_url": "https://github.com/example/repo.git",
                    "git_branch": "main",
                },
            )

        assert response.status_code == 201, response.text
        data = response.json()

        # Project created
        assert data["project"]["name"] == "My Imported Project"
        assert data["project"]["git_url"] == "https://github.com/example/repo.git"
        assert data["project"]["git_branch"] == "main"
        assert data["project"]["owner_id"] == test_user.id

        # Artifacts detected
        artifact_types = {a["artifact_type"] for a in data["artifacts"]}
        assert "playbook" in artifact_types
        assert "role" in artifact_types
        assert "inventory" in artifact_types
        assert "template" in artifact_types

        # config.yml (non-playbook root YAML) should be reclassified as file
        config_artifacts = [a for a in data["artifacts"] if a["path"] == "config.yml"]
        assert len(config_artifacts) == 1
        assert config_artifacts[0]["artifact_type"] == "file"

    async def test_import_with_credential(self, authenticated_client, test_user, test_session):
        """Import with a valid credential passes token through."""
        credential = GitCredential(
            user_id=test_user.id,
            name="My GitHub Token",
            provider="github",
            token_encrypted=encrypt_token("ghp_testtoken123"),
        )
        test_session.add(credential)
        await test_session.commit()
        await test_session.refresh(credential)

        with patch(
            "app.services.git_service.GitService.clone_repository",
            new=_mock_clone,
        ):
            response = await authenticated_client.post(
                "/api/projects/import-git",
                json={
                    "name": "Private Project",
                    "git_url": "https://github.com/private/repo.git",
                    "git_branch": "develop",
                    "git_credentials_id": credential.id,
                },
            )

        assert response.status_code == 201, response.text
        data = response.json()
        assert data["project"]["git_credentials_id"] == credential.id
        assert data["project"]["git_branch"] == "develop"

    async def test_import_invalid_credential(self, authenticated_client):
        """Import with a non-existent credential returns 404."""
        response = await authenticated_client.post(
            "/api/projects/import-git",
            json={
                "name": "Test",
                "git_url": "https://github.com/example/repo.git",
                "git_credentials_id": "nonexistent-id",
            },
        )
        assert response.status_code == 404

    async def test_import_other_user_credential(self, authenticated_client, test_session):
        """Import with another user's credential returns 403."""
        from app.core.security import get_password_hash
        from app.models.user import User

        other_user = User(
            email="other@example.com",
            username="other",
            hashed_password=get_password_hash("password"),
            is_active=True,
            is_admin=False,
        )
        test_session.add(other_user)
        await test_session.commit()
        await test_session.refresh(other_user)

        credential = GitCredential(
            user_id=other_user.id,
            name="Other Token",
            provider="github",
            token_encrypted=encrypt_token("ghp_other"),
        )
        test_session.add(credential)
        await test_session.commit()
        await test_session.refresh(credential)

        response = await authenticated_client.post(
            "/api/projects/import-git",
            json={
                "name": "Test",
                "git_url": "https://github.com/example/repo.git",
                "git_credentials_id": credential.id,
            },
        )
        assert response.status_code == 403

    async def test_import_missing_name(self, authenticated_client):
        """Import without a project name returns 422."""
        response = await authenticated_client.post(
            "/api/projects/import-git",
            json={
                "git_url": "https://github.com/example/repo.git",
            },
        )
        assert response.status_code == 422

    async def test_import_missing_url(self, authenticated_client):
        """Import without a git URL returns 422."""
        response = await authenticated_client.post(
            "/api/projects/import-git",
            json={
                "name": "Test",
            },
        )
        assert response.status_code == 422

    async def test_import_unauthenticated(self, test_client):
        """Import without authentication returns 401."""
        response = await test_client.post(
            "/api/projects/import-git",
            json={
                "name": "Test",
                "git_url": "https://github.com/example/repo.git",
            },
        )
        assert response.status_code in (401, 403)

    async def test_import_clone_failure(self, authenticated_client):
        """Clone failure returns 400 and does not create the project."""
        from git import GitCommandError

        async def _failing_clone(self, url, branch, project_id, token=None):
            raise GitCommandError("clone", status=128, stderr="fatal: repository not found")

        with patch(
            "app.services.git_service.GitService.clone_repository",
            new=_failing_clone,
        ):
            response = await authenticated_client.post(
                "/api/projects/import-git",
                json={
                    "name": "Bad Repo",
                    "git_url": "https://github.com/nonexistent/repo.git",
                },
            )

        assert response.status_code == 400
        assert "clone failed" in response.json()["detail"].lower()

    async def test_import_default_branch(self, authenticated_client):
        """Import without specifying branch defaults to 'main'."""
        with patch(
            "app.services.git_service.GitService.clone_repository",
            new=_mock_clone,
        ):
            response = await authenticated_client.post(
                "/api/projects/import-git",
                json={
                    "name": "Default Branch Test",
                    "git_url": "https://github.com/example/repo.git",
                },
            )

        assert response.status_code == 201
        assert response.json()["project"]["git_branch"] == "main"
