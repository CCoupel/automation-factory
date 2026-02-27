"""
Git commit, push, and branch management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from git import GitCommandError

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.git_credential import GitCredential
from app.schemas.git_operations import (
    GitChangesResponse,
    GitFileChange,
    GitCommitRequest,
    GitCommitResponse,
    GitPushResponse,
    GitBranchInfo,
    GitBranchListResponse,
    GitBranchCreateRequest,
    GitBranchSwitchRequest,
    GitBranchSwitchResponse,
)
from app.services.git_service import GitService
from app.services.project_access_service import check_project_access
from app.utils.encryption import decrypt_token

router = APIRouter(prefix="/projects", tags=["Git Operations"])


async def _resolve_git_config(
    project: Project, db: AsyncSession
) -> tuple[str, str, str | None]:
    """
    Load project git config and decrypt credential token.
    Returns (git_url, git_branch, token_or_none).
    Raises 400 if project has no git_url.
    """
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


@router.get("/{project_id}/git/changes", response_model=GitChangesResponse)
async def get_changes(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get list of changed files between DB artifacts and the remote branch."""
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, git_branch, token = await _resolve_git_config(project, db)

    git_service = GitService(data_dir=settings.DATA_DIR)
    try:
        changes, branch = await git_service.get_changes(
            project_id, git_url, git_branch, token, db
        )
    except GitCommandError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Git error: {e.stderr.strip() if e.stderr else str(e)}",
        )

    return GitChangesResponse(
        changes=[GitFileChange(**c) for c in changes],
        branch=branch,
        has_remote=True,
    )


@router.post("/{project_id}/git/commit", response_model=GitCommitResponse)
async def commit_changes(
    project_id: str,
    body: GitCommitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Commit current artifact changes."""
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, git_branch, token = await _resolve_git_config(project, db)

    git_service = GitService(data_dir=settings.DATA_DIR)
    try:
        result = await git_service.commit(
            project_id=project_id,
            git_url=git_url,
            git_branch=git_branch,
            token=token,
            message=body.message,
            author_name=current_user.username,
            author_email=current_user.email,
            db=db,
        )
    except GitCommandError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Git commit failed: {e.stderr.strip() if e.stderr else str(e)}",
        )

    return GitCommitResponse(**result)


@router.post("/{project_id}/git/push", response_model=GitPushResponse)
async def push_changes(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Push committed changes to the remote repository."""
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, git_branch, token = await _resolve_git_config(project, db)

    git_service = GitService(data_dir=settings.DATA_DIR)
    try:
        result = await git_service.push(
            project_id=project_id,
            git_url=git_url,
            git_branch=git_branch,
            token=token,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except GitCommandError as e:
        stderr = e.stderr.strip() if e.stderr else str(e)
        if "rejected" in stderr or "non-fast-forward" in stderr:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Push rejected: remote has new commits. Sync required.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Git push failed: {stderr}",
        )

    return GitPushResponse(**result)


@router.get("/{project_id}/git/branches", response_model=GitBranchListResponse)
async def list_branches(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List local and remote branches."""
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, git_branch, token = await _resolve_git_config(project, db)

    git_service = GitService(data_dir=settings.DATA_DIR)
    try:
        branches, current = await git_service.list_branches(
            project_id, git_url, git_branch, token
        )
    except GitCommandError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Git error: {e.stderr.strip() if e.stderr else str(e)}",
        )

    return GitBranchListResponse(
        branches=[GitBranchInfo(**b) for b in branches],
        current=current,
    )


@router.post(
    "/{project_id}/git/branches",
    response_model=GitBranchInfo,
    status_code=status.HTTP_201_CREATED,
)
async def create_branch(
    project_id: str,
    body: GitBranchCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new branch from the current HEAD."""
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, git_branch, token = await _resolve_git_config(project, db)

    git_service = GitService(data_dir=settings.DATA_DIR)
    try:
        await git_service.create_branch(
            project_id, git_url, git_branch, token, body.name
        )
    except GitCommandError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Git error: {e.stderr.strip() if e.stderr else str(e)}",
        )

    return GitBranchInfo(name=body.name, is_current=True, is_remote=False)


@router.post("/{project_id}/git/branches/switch", response_model=GitBranchSwitchResponse)
async def switch_branch(
    project_id: str,
    body: GitBranchSwitchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Switch to a different branch (re-imports all artifacts)."""
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, _, token = await _resolve_git_config(project, db)

    git_service = GitService(data_dir=settings.DATA_DIR)
    try:
        artifacts, warnings = await git_service.switch_branch(
            project_id=project_id,
            git_url=git_url,
            branch=body.name,
            token=token,
            db=db,
        )
    except GitCommandError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Git error: {e.stderr.strip() if e.stderr else str(e)}",
        )

    await db.commit()

    return GitBranchSwitchResponse(
        branch=body.name,
        artifacts_imported=len(artifacts),
        warnings=warnings,
    )
