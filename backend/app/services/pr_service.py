"""
Pull Request service — GitHub API client.

Detects the hosting provider from the git URL and creates/lists/gets
pull requests via the provider's REST API.  Only GitHub is supported
for now; other providers return "unsupported".
"""

import logging
import re
from urllib.parse import urlparse

from app.core.http_service import BaseHTTPService

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"


class PRService(BaseHTTPService):
    def __init__(self):
        super().__init__(timeout=30)

    # ------------------------------------------------------------------
    # URL helpers
    # ------------------------------------------------------------------

    @staticmethod
    def detect_provider(git_url: str) -> str:
        """Return 'github' or 'unsupported' based on the git URL hostname."""
        if git_url.startswith("git@"):
            # SSH: git@github.com:owner/repo.git
            match = re.match(r"git@([^:]+):", git_url)
            hostname = match.group(1) if match else ""
        else:
            hostname = urlparse(git_url).hostname or ""

        if hostname == "github.com":
            return "github"
        return "unsupported"

    @staticmethod
    def extract_repo_info(git_url: str) -> dict[str, str]:
        """Extract owner and repo name from a git URL.

        Handles HTTPS (https://github.com/owner/repo.git)
        and SSH (git@github.com:owner/repo.git) formats.
        """
        if git_url.startswith("git@"):
            match = re.match(r"git@[^:]+:(.+?)(?:\.git)?$", git_url)
            if match:
                parts = match.group(1).split("/")
                return {"owner": parts[0], "repo": parts[1]}
        else:
            path = urlparse(git_url).path.strip("/")
            path = re.sub(r"\.git$", "", path)
            parts = path.split("/")
            if len(parts) >= 2:
                return {"owner": parts[0], "repo": parts[1]}

        raise ValueError(f"Cannot extract owner/repo from URL: {git_url}")

    # ------------------------------------------------------------------
    # GitHub API helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _github_headers(token: str) -> dict[str, str]:
        return {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json",
        }

    @staticmethod
    def _map_pr(data: dict, provider: str = "github") -> dict:
        """Map a GitHub PR JSON object to our PullRequestInfo shape."""
        if data.get("merged"):
            pr_status = "merged"
        elif data.get("draft"):
            pr_status = "draft"
        elif data.get("state") == "closed":
            pr_status = "closed"
        else:
            pr_status = "open"

        return {
            "number": data["number"],
            "title": data["title"],
            "description": data.get("body"),
            "url": data["html_url"],
            "status": pr_status,
            "source_branch": data["head"]["ref"],
            "target_branch": data["base"]["ref"],
            "created_at": data["created_at"],
            "provider": provider,
        }

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    async def create_pull_request(
        self,
        token: str,
        owner: str,
        repo: str,
        title: str,
        description: str,
        source_branch: str,
        target_branch: str,
        draft: bool = False,
    ) -> dict:
        """Create a pull request on GitHub."""
        session = await self.get_session()
        url = f"{GITHUB_API}/repos/{owner}/{repo}/pulls"
        payload = {
            "title": title,
            "body": description,
            "head": source_branch,
            "base": target_branch,
            "draft": draft,
        }
        logger.info("Creating PR on %s/%s: %s → %s", owner, repo, source_branch, target_branch)

        async with session.post(url, json=payload, headers=self._github_headers(token)) as resp:
            body = await resp.json()
            if resp.status == 201:
                return self._map_pr(body)
            # Surface GitHub's error message
            detail = body.get("message", "Unknown GitHub error")
            errors = body.get("errors", [])
            if errors:
                detail = f"{detail}: {errors}"
            logger.warning("GitHub PR creation failed (%s): %s", resp.status, detail)
            raise ValueError(f"GitHub API error ({resp.status}): {detail}")

    async def get_pull_request(
        self, token: str, owner: str, repo: str, pr_number: int
    ) -> dict:
        """Get a single pull request by number."""
        session = await self.get_session()
        url = f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}"

        async with session.get(url, headers=self._github_headers(token)) as resp:
            body = await resp.json()
            if resp.status == 200:
                return self._map_pr(body)
            detail = body.get("message", "Unknown GitHub error")
            raise ValueError(f"GitHub API error ({resp.status}): {detail}")

    async def list_pull_requests(
        self,
        token: str,
        owner: str,
        repo: str,
        state: str = "open",
        head_branch: str | None = None,
    ) -> list[dict]:
        """List pull requests, optionally filtered by source branch."""
        session = await self.get_session()
        url = f"{GITHUB_API}/repos/{owner}/{repo}/pulls"
        params: dict[str, str] = {"state": state}
        if head_branch:
            params["head"] = f"{owner}:{head_branch}"

        async with session.get(url, params=params, headers=self._github_headers(token)) as resp:
            body = await resp.json()
            if resp.status == 200:
                return [self._map_pr(pr) for pr in body]
            detail = body.get("message", "Unknown GitHub error")
            raise ValueError(f"GitHub API error ({resp.status}): {detail}")


# Singleton
pr_service = PRService()
