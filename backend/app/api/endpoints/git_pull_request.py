"""
Pull request endpoints — create, get, and list PRs on the remote hosting platform.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.git_credential import GitCredential
from app.schemas.git_pull_request import (
    CreatePullRequestRequest,
    PullRequestInfo,
    PullRequestListResponse,
)
from app.services.pr_service import pr_service, PRService
from app.services.project_access_service import check_project_access
from app.utils.encryption import decrypt_token

router = APIRouter(prefix="/projects", tags=["Git Pull Requests"])


async def _resolve_git_config(
    project: Project, db: AsyncSession
) -> tuple[str, str, str | None]:
    """Load project git config and decrypt credential token."""
    if not project.git_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This project is not linked to a Git repository.",
        )

    git_url = project.git_url
    git_branch = project.git_branch or "main"
    token = None

    if project.git_credentials_id:
        result = await db.execute(
            select(GitCredential).where(GitCredential.id == project.git_credentials_id)
        )
        credential = result.scalar_one_or_none()
        if credential and credential.token_encrypted:
            token = decrypt_token(credential.token_encrypted)

    return git_url, git_branch, token


def _require_supported_provider(git_url: str) -> str:
    """Detect provider; raise 400 if unsupported."""
    provider = PRService.detect_provider(git_url)
    if provider == "unsupported":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pull request creation is only supported for GitHub repositories.",
        )
    return provider


def _require_token(token: str | None) -> str:
    """Raise 400 if no credential/token is configured."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A Git credential with a token is required to manage pull requests.",
        )
    return token


@router.post(
    "/{project_id}/git/pull-request",
    response_model=PullRequestInfo,
    status_code=status.HTTP_201_CREATED,
)
async def create_pull_request(
    project_id: str,
    body: CreatePullRequestRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a pull request on the remote hosting platform."""
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, git_branch, token = await _resolve_git_config(project, db)
    _require_supported_provider(git_url)
    token = _require_token(token)

    repo_info = PRService.extract_repo_info(git_url)

    try:
        result = await pr_service.create_pull_request(
            token=token,
            owner=repo_info["owner"],
            repo=repo_info["repo"],
            title=body.title,
            description=body.description,
            source_branch=git_branch,
            target_branch=body.target_branch,
            draft=body.draft,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PullRequestInfo(**result)


@router.get(
    "/{project_id}/git/pull-request/{pr_number}",
    response_model=PullRequestInfo,
)
async def get_pull_request(
    project_id: str,
    pr_number: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single pull request by number."""
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, _, token = await _resolve_git_config(project, db)
    _require_supported_provider(git_url)
    token = _require_token(token)

    repo_info = PRService.extract_repo_info(git_url)

    try:
        result = await pr_service.get_pull_request(
            token=token,
            owner=repo_info["owner"],
            repo=repo_info["repo"],
            pr_number=pr_number,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PullRequestInfo(**result)


@router.get(
    "/{project_id}/git/pull-requests",
    response_model=PullRequestListResponse,
)
async def list_pull_requests(
    project_id: str,
    state: str = Query(default="open", pattern="^(open|closed|all)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List pull requests for the current branch."""
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, git_branch, token = await _resolve_git_config(project, db)
    _require_supported_provider(git_url)
    token = _require_token(token)

    repo_info = PRService.extract_repo_info(git_url)

    try:
        results = await pr_service.list_pull_requests(
            token=token,
            owner=repo_info["owner"],
            repo=repo_info["repo"],
            state=state,
            head_branch=git_branch,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return PullRequestListResponse(
        pull_requests=[PullRequestInfo(**pr) for pr in results]
    )
