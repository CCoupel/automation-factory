"""
Integration tests for pull request endpoints.

Uses shared conftest fixtures (in-memory SQLite, test_user, authenticated_client).
PRService HTTP calls are mocked.
"""

import pytest
from unittest.mock import patch, AsyncMock

from app.models.project import Project
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


async def _create_credential(session, user):
    """Create a git credential with an encrypted token."""
    credential = GitCredential(
        user_id=user.id,
        name="My Token",
        provider="github",
        token_encrypted=encrypt_token("ghp_test123"),
    )
    session.add(credential)
    await session.commit()
    await session.refresh(credential)
    return credential


MOCK_PR = {
    "number": 42,
    "title": "Add feature",
    "description": "A new feature",
    "url": "https://github.com/example/repo/pull/42",
    "status": "open",
    "source_branch": "main",
    "target_branch": "main",
    "created_at": "2026-01-15T10:00:00Z",
    "provider": "github",
}


# ---------------------------------------------------------------------------
# Tests: POST /projects/{id}/git/pull-request
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestCreatePullRequest:

    async def test_create_pr_success(self, authenticated_client, test_user, test_session):
        cred = await _create_credential(test_session, test_user)
        project = await _create_git_project(test_session, test_user, cred_id=cred.id)

        with patch(
            "app.services.pr_service.pr_service.create_pull_request",
            new_callable=AsyncMock,
            return_value=MOCK_PR,
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/pull-request",
                json={"title": "Add feature", "description": "A new feature"},
            )

        assert response.status_code == 201
        data = response.json()
        assert data["number"] == 42
        assert data["title"] == "Add feature"
        assert data["provider"] == "github"

    async def test_create_pr_no_credential(self, authenticated_client, test_user, test_session):
        project = await _create_git_project(test_session, test_user)

        response = await authenticated_client.post(
            f"/api/projects/{project.id}/git/pull-request",
            json={"title": "PR"},
        )

        assert response.status_code == 400
        assert "credential" in response.json()["detail"].lower()

    async def test_create_pr_unsupported_provider(self, authenticated_client, test_user, test_session):
        cred = await _create_credential(test_session, test_user)
        project = await _create_git_project(
            test_session, test_user,
            git_url="https://gitlab.com/example/repo.git",
            cred_id=cred.id,
        )

        response = await authenticated_client.post(
            f"/api/projects/{project.id}/git/pull-request",
            json={"title": "PR"},
        )

        assert response.status_code == 400
        assert "GitHub" in response.json()["detail"]

    async def test_create_pr_no_git_url(self, authenticated_client, test_user, test_session):
        project = Project(
            name="No Git", description="", owner_id=test_user.id,
        )
        test_session.add(project)
        await test_session.commit()
        await test_session.refresh(project)

        response = await authenticated_client.post(
            f"/api/projects/{project.id}/git/pull-request",
            json={"title": "PR"},
        )

        assert response.status_code == 400
        assert "not linked" in response.json()["detail"]

    async def test_create_pr_github_error(self, authenticated_client, test_user, test_session):
        cred = await _create_credential(test_session, test_user)
        project = await _create_git_project(test_session, test_user, cred_id=cred.id)

        with patch(
            "app.services.pr_service.pr_service.create_pull_request",
            new_callable=AsyncMock,
            side_effect=ValueError("GitHub API error (422): Validation Failed"),
        ):
            response = await authenticated_client.post(
                f"/api/projects/{project.id}/git/pull-request",
                json={"title": "PR"},
            )

        assert response.status_code == 400
        assert "422" in response.json()["detail"]

    async def test_create_pr_title_required(self, authenticated_client, test_user, test_session):
        cred = await _create_credential(test_session, test_user)
        project = await _create_git_project(test_session, test_user, cred_id=cred.id)

        response = await authenticated_client.post(
            f"/api/projects/{project.id}/git/pull-request",
            json={"title": ""},
        )

        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Tests: GET /projects/{id}/git/pull-request/{pr_number}
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestGetPullRequest:

    async def test_get_pr_success(self, authenticated_client, test_user, test_session):
        cred = await _create_credential(test_session, test_user)
        project = await _create_git_project(test_session, test_user, cred_id=cred.id)

        with patch(
            "app.services.pr_service.pr_service.get_pull_request",
            new_callable=AsyncMock,
            return_value=MOCK_PR,
        ):
            response = await authenticated_client.get(
                f"/api/projects/{project.id}/git/pull-request/42"
            )

        assert response.status_code == 200
        assert response.json()["number"] == 42

    async def test_get_pr_not_found(self, authenticated_client, test_user, test_session):
        cred = await _create_credential(test_session, test_user)
        project = await _create_git_project(test_session, test_user, cred_id=cred.id)

        with patch(
            "app.services.pr_service.pr_service.get_pull_request",
            new_callable=AsyncMock,
            side_effect=ValueError("GitHub API error (404): Not Found"),
        ):
            response = await authenticated_client.get(
                f"/api/projects/{project.id}/git/pull-request/999"
            )

        assert response.status_code == 400
        assert "404" in response.json()["detail"]


# ---------------------------------------------------------------------------
# Tests: GET /projects/{id}/git/pull-requests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestListPullRequests:

    async def test_list_prs_success(self, authenticated_client, test_user, test_session):
        cred = await _create_credential(test_session, test_user)
        project = await _create_git_project(test_session, test_user, cred_id=cred.id)

        with patch(
            "app.services.pr_service.pr_service.list_pull_requests",
            new_callable=AsyncMock,
            return_value=[MOCK_PR],
        ):
            response = await authenticated_client.get(
                f"/api/projects/{project.id}/git/pull-requests"
            )

        assert response.status_code == 200
        data = response.json()
        assert len(data["pull_requests"]) == 1
        assert data["pull_requests"][0]["number"] == 42

    async def test_list_prs_empty(self, authenticated_client, test_user, test_session):
        cred = await _create_credential(test_session, test_user)
        project = await _create_git_project(test_session, test_user, cred_id=cred.id)

        with patch(
            "app.services.pr_service.pr_service.list_pull_requests",
            new_callable=AsyncMock,
            return_value=[],
        ):
            response = await authenticated_client.get(
                f"/api/projects/{project.id}/git/pull-requests?state=closed"
            )

        assert response.status_code == 200
        assert response.json()["pull_requests"] == []
