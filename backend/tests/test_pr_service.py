"""
Unit tests for PRService (provider detection, URL parsing, API calls).
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.pr_service import PRService


# ------------------------------------------------------------------ #
# detect_provider
# ------------------------------------------------------------------ #


class TestDetectProvider:
    def test_github_https(self):
        assert PRService.detect_provider("https://github.com/owner/repo.git") == "github"

    def test_github_ssh(self):
        assert PRService.detect_provider("git@github.com:owner/repo.git") == "github"

    def test_github_https_no_git_suffix(self):
        assert PRService.detect_provider("https://github.com/owner/repo") == "github"

    def test_gitlab_https(self):
        assert PRService.detect_provider("https://gitlab.com/owner/repo.git") == "gitlab"

    def test_gitlab_ssh(self):
        assert PRService.detect_provider("git@gitlab.com:owner/repo.git") == "gitlab"

    def test_bitbucket_unsupported(self):
        assert PRService.detect_provider("git@bitbucket.org:owner/repo.git") == "unsupported"

    def test_self_hosted_unsupported(self):
        assert PRService.detect_provider("https://git.example.com/owner/repo") == "unsupported"


# ------------------------------------------------------------------ #
# extract_repo_info
# ------------------------------------------------------------------ #


class TestExtractRepoInfo:
    def test_https_with_git_suffix(self):
        info = PRService.extract_repo_info("https://github.com/acme/widgets.git")
        assert info == {"owner": "acme", "repo": "widgets"}

    def test_https_without_git_suffix(self):
        info = PRService.extract_repo_info("https://github.com/acme/widgets")
        assert info == {"owner": "acme", "repo": "widgets"}

    def test_ssh_url(self):
        info = PRService.extract_repo_info("git@github.com:acme/widgets.git")
        assert info == {"owner": "acme", "repo": "widgets"}

    def test_ssh_no_git_suffix(self):
        info = PRService.extract_repo_info("git@github.com:acme/widgets")
        assert info == {"owner": "acme", "repo": "widgets"}

    def test_gitlab_https(self):
        info = PRService.extract_repo_info("https://gitlab.com/acme/widgets.git")
        assert info == {"owner": "acme", "repo": "widgets"}

    def test_gitlab_ssh(self):
        info = PRService.extract_repo_info("git@gitlab.com:acme/widgets.git")
        assert info == {"owner": "acme", "repo": "widgets"}

    def test_invalid_url_raises(self):
        with pytest.raises(ValueError, match="Cannot extract owner/repo"):
            PRService.extract_repo_info("not-a-url")


# ------------------------------------------------------------------ #
# _map_pr
# ------------------------------------------------------------------ #


class TestMapPR:
    def _base_pr(self, **overrides):
        pr = {
            "number": 42,
            "title": "Add feature",
            "body": "Description here",
            "html_url": "https://github.com/acme/widgets/pull/42",
            "state": "open",
            "draft": False,
            "merged": False,
            "head": {"ref": "feat/x"},
            "base": {"ref": "main"},
            "created_at": "2026-01-15T10:00:00Z",
        }
        pr.update(overrides)
        return pr

    def test_open_pr(self):
        result = PRService._map_pr(self._base_pr())
        assert result["status"] == "open"
        assert result["number"] == 42
        assert result["source_branch"] == "feat/x"
        assert result["target_branch"] == "main"

    def test_draft_pr(self):
        result = PRService._map_pr(self._base_pr(draft=True))
        assert result["status"] == "draft"

    def test_merged_pr(self):
        result = PRService._map_pr(self._base_pr(merged=True, state="closed"))
        assert result["status"] == "merged"

    def test_closed_pr(self):
        result = PRService._map_pr(self._base_pr(state="closed"))
        assert result["status"] == "closed"


# ------------------------------------------------------------------ #
# API methods (mocked HTTP)
# ------------------------------------------------------------------ #


def _mock_response(status, json_data):
    """Create an async context-manager mock for aiohttp response."""
    resp = AsyncMock()
    resp.status = status
    resp.json = AsyncMock(return_value=json_data)
    ctx = AsyncMock()
    ctx.__aenter__ = AsyncMock(return_value=resp)
    ctx.__aexit__ = AsyncMock(return_value=False)
    return ctx


@pytest.mark.asyncio
class TestCreatePullRequest:
    async def test_create_success(self):
        service = PRService()
        pr_json = {
            "number": 1,
            "title": "My PR",
            "body": "desc",
            "html_url": "https://github.com/o/r/pull/1",
            "state": "open",
            "draft": False,
            "merged": False,
            "head": {"ref": "feat"},
            "base": {"ref": "main"},
            "created_at": "2026-01-15T10:00:00Z",
        }

        mock_session = MagicMock()
        mock_session.post = MagicMock(return_value=_mock_response(201, pr_json))
        service.get_session = AsyncMock(return_value=mock_session)

        result = await service.create_pull_request(
            token="tok", owner="o", repo="r",
            title="My PR", description="desc",
            source_branch="feat", target_branch="main",
        )
        assert result["number"] == 1
        assert result["status"] == "open"

    async def test_create_validation_error(self):
        service = PRService()
        error_json = {"message": "Validation Failed", "errors": [{"field": "head"}]}

        mock_session = MagicMock()
        mock_session.post = MagicMock(return_value=_mock_response(422, error_json))
        service.get_session = AsyncMock(return_value=mock_session)

        with pytest.raises(ValueError, match="GitHub API error.*422.*Validation Failed"):
            await service.create_pull_request(
                token="tok", owner="o", repo="r",
                title="PR", description="",
                source_branch="feat", target_branch="main",
            )


@pytest.mark.asyncio
class TestGetPullRequest:
    async def test_get_success(self):
        service = PRService()
        pr_json = {
            "number": 5,
            "title": "Fix",
            "body": None,
            "html_url": "https://github.com/o/r/pull/5",
            "state": "closed",
            "draft": False,
            "merged": True,
            "head": {"ref": "fix/bug"},
            "base": {"ref": "main"},
            "created_at": "2026-02-01T08:00:00Z",
        }

        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=_mock_response(200, pr_json))
        service.get_session = AsyncMock(return_value=mock_session)

        result = await service.get_pull_request("tok", "o", "r", 5)
        assert result["status"] == "merged"

    async def test_get_not_found(self):
        service = PRService()
        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=_mock_response(404, {"message": "Not Found"}))
        service.get_session = AsyncMock(return_value=mock_session)

        with pytest.raises(ValueError, match="GitHub API error.*404"):
            await service.get_pull_request("tok", "o", "r", 999)


@pytest.mark.asyncio
class TestListPullRequests:
    async def test_list_success(self):
        service = PRService()
        prs_json = [
            {
                "number": 1,
                "title": "PR1",
                "body": "",
                "html_url": "https://github.com/o/r/pull/1",
                "state": "open",
                "draft": False,
                "merged": False,
                "head": {"ref": "a"},
                "base": {"ref": "main"},
                "created_at": "2026-01-10T00:00:00Z",
            },
        ]

        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=_mock_response(200, prs_json))
        service.get_session = AsyncMock(return_value=mock_session)

        result = await service.list_pull_requests("tok", "o", "r")
        assert len(result) == 1
        assert result[0]["number"] == 1


# ------------------------------------------------------------------ #
# _map_gitlab_mr
# ------------------------------------------------------------------ #


class TestMapGitLabMR:
    def _base_mr(self, **overrides):
        mr = {
            "iid": 10,
            "title": "Add feature",
            "description": "MR description",
            "web_url": "https://gitlab.com/acme/widgets/-/merge_requests/10",
            "state": "opened",
            "draft": False,
            "source_branch": "feat/x",
            "target_branch": "main",
            "created_at": "2026-01-15T10:00:00Z",
        }
        mr.update(overrides)
        return mr

    def test_open_mr(self):
        result = PRService._map_gitlab_mr(self._base_mr())
        assert result["status"] == "open"
        assert result["number"] == 10
        assert result["source_branch"] == "feat/x"
        assert result["target_branch"] == "main"
        assert result["provider"] == "gitlab"

    def test_draft_mr(self):
        result = PRService._map_gitlab_mr(self._base_mr(draft=True))
        assert result["status"] == "draft"

    def test_merged_mr(self):
        result = PRService._map_gitlab_mr(self._base_mr(state="merged"))
        assert result["status"] == "merged"

    def test_closed_mr(self):
        result = PRService._map_gitlab_mr(self._base_mr(state="closed"))
        assert result["status"] == "closed"


# ------------------------------------------------------------------ #
# GitLab API methods (mocked HTTP)
# ------------------------------------------------------------------ #


@pytest.mark.asyncio
class TestCreateGitLabMR:
    async def test_create_success(self):
        service = PRService()
        mr_json = {
            "iid": 1,
            "title": "My MR",
            "description": "desc",
            "web_url": "https://gitlab.com/o/r/-/merge_requests/1",
            "state": "opened",
            "draft": False,
            "source_branch": "feat",
            "target_branch": "main",
            "created_at": "2026-01-15T10:00:00Z",
        }

        mock_session = MagicMock()
        mock_session.post = MagicMock(return_value=_mock_response(201, mr_json))
        service.get_session = AsyncMock(return_value=mock_session)

        result = await service.create_gitlab_merge_request(
            token="tok", owner="o", repo="r",
            title="My MR", description="desc",
            source_branch="feat", target_branch="main",
        )
        assert result["number"] == 1
        assert result["status"] == "open"
        assert result["provider"] == "gitlab"

    async def test_create_error(self):
        service = PRService()
        error_json = {"message": ["source_branch", "is invalid"]}

        mock_session = MagicMock()
        mock_session.post = MagicMock(return_value=_mock_response(400, error_json))
        service.get_session = AsyncMock(return_value=mock_session)

        with pytest.raises(ValueError, match="GitLab API error.*400"):
            await service.create_gitlab_merge_request(
                token="tok", owner="o", repo="r",
                title="MR", description="",
                source_branch="feat", target_branch="main",
            )


@pytest.mark.asyncio
class TestGetGitLabMR:
    async def test_get_success(self):
        service = PRService()
        mr_json = {
            "iid": 5,
            "title": "Fix",
            "description": None,
            "web_url": "https://gitlab.com/o/r/-/merge_requests/5",
            "state": "merged",
            "draft": False,
            "source_branch": "fix/bug",
            "target_branch": "main",
            "created_at": "2026-02-01T08:00:00Z",
        }

        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=_mock_response(200, mr_json))
        service.get_session = AsyncMock(return_value=mock_session)

        result = await service.get_gitlab_merge_request("tok", "o", "r", 5)
        assert result["status"] == "merged"

    async def test_get_not_found(self):
        service = PRService()
        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=_mock_response(404, {"message": "404 Not found"}))
        service.get_session = AsyncMock(return_value=mock_session)

        with pytest.raises(ValueError, match="GitLab API error.*404"):
            await service.get_gitlab_merge_request("tok", "o", "r", 999)


@pytest.mark.asyncio
class TestListGitLabMRs:
    async def test_list_success(self):
        service = PRService()
        mrs_json = [
            {
                "iid": 1,
                "title": "MR1",
                "description": "",
                "web_url": "https://gitlab.com/o/r/-/merge_requests/1",
                "state": "opened",
                "draft": False,
                "source_branch": "a",
                "target_branch": "main",
                "created_at": "2026-01-10T00:00:00Z",
            },
        ]

        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=_mock_response(200, mrs_json))
        service.get_session = AsyncMock(return_value=mock_session)

        result = await service.list_gitlab_merge_requests("tok", "o", "r")
        assert len(result) == 1
        assert result[0]["number"] == 1
        assert result[0]["provider"] == "gitlab"
