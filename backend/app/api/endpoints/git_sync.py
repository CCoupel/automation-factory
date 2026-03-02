"""
Git sync and conflict resolution endpoints.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from git import GitCommandError

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_artifact import ProjectArtifact
from app.models.git_credential import GitCredential
from app.schemas.git_sync import (
    FileSyncStatus,
    GitSyncResponse,
    ConflictResolveRequest,
    ConflictResolveResponse,
)
from app.services.git_service import GitService
from app.services.conflict_resolution_service import conflict_resolution_service
from app.services.project_access_service import check_project_access
from app.utils.encryption import decrypt_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["Git Sync"])


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


@router.post("/{project_id}/git/sync", response_model=GitSyncResponse)
async def sync_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Sync local artifacts with the remote branch.

    Flow: ensure repo → serialize → fetch → check divergence →
    classify files → return sync status.
    """
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, git_branch, token = await _resolve_git_config(project, db)

    git_service = GitService(data_dir=settings.DATA_DIR)

    try:
        # Ensure repo exists with full history for merge-base
        repo_path = await git_service.ensure_repo(
            project_id, git_url, git_branch, token
        )

        # Serialize current DB artifacts to disk
        await git_service.serialize_artifacts_to_disk(project_id, repo_path, db)

        # Fetch remote
        await git_service.fetch_remote(project_id, git_url, git_branch, token)

        # Check divergence
        divergence = await git_service.get_divergence_info(project_id, git_branch)

    except GitCommandError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Git sync failed: {e.stderr.strip() if e.stderr else str(e)}",
        )

    merge_base = divergence["merge_base"]
    local_ahead = divergence["local_ahead"]
    remote_ahead = divergence["remote_ahead"]

    # Up to date
    if remote_ahead == 0 and local_ahead == 0:
        git_service.cleanup_repo(project_id)
        return GitSyncResponse(
            status="up_to_date",
            remote_ahead_by=0,
            local_ahead_by=0,
        )

    # Only remote ahead → fast-forward
    if remote_ahead > 0 and local_ahead == 0:
        try:
            await git_service.fast_forward(project_id, git_branch)
            # Re-import artifacts from the fast-forwarded state
            await _reimport_artifacts(git_service, project_id, repo_path, db)
        except GitCommandError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fast-forward failed: {e.stderr.strip() if e.stderr else str(e)}",
            )

        git_service.cleanup_repo(project_id)
        return GitSyncResponse(
            status="fast_forward",
            remote_ahead_by=remote_ahead,
            local_ahead_by=0,
        )

    # Both sides have commits → three-way diff
    try:
        changed_local = await git_service.get_changed_files_between(
            project_id, merge_base, "HEAD"
        )
        changed_remote = await git_service.get_changed_files_between(
            project_id, merge_base, f"origin/{git_branch}"
        )
    except GitCommandError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Diff failed: {e.stderr.strip() if e.stderr else str(e)}",
        )

    all_changed = set(changed_local) | set(changed_remote)

    # Load artifact type map from DB
    result = await db.execute(
        select(ProjectArtifact).where(ProjectArtifact.project_id == project_id)
    )
    artifacts = result.scalars().all()
    type_map = {a.path: a.artifact_type for a in artifacts}

    auto_merged: list[FileSyncStatus] = []
    conflicted: list[FileSyncStatus] = []

    for path in sorted(all_changed):
        base_content = await git_service.get_file_at_ref(project_id, merge_base, path)
        local_content = await git_service.get_file_at_ref(project_id, "HEAD", path)
        remote_content = await git_service.get_file_at_ref(
            project_id, f"origin/{git_branch}", path
        )

        artifact_type = type_map.get(path, "file")

        file_status = conflict_resolution_service.classify_file(
            path, artifact_type, base_content, local_content, remote_content,
        )

        if file_status.auto_merged:
            auto_merged.append(file_status)
        else:
            conflicted.append(file_status)

    if conflicted:
        return GitSyncResponse(
            status="conflicts",
            auto_merged_files=auto_merged,
            conflicted_files=conflicted,
            remote_ahead_by=remote_ahead,
            local_ahead_by=local_ahead,
        )

    # All files auto-merged: apply merged content, create merge commit
    try:
        for f in auto_merged:
            if f.merged_content is not None:
                await _update_artifact_content(db, project_id, f.path, f.merged_content)

        await db.flush()

        merge_result = await git_service.create_merge_commit(
            project_id=project_id,
            git_branch=git_branch,
            author_name=current_user.username,
            author_email=current_user.email,
            message="Auto-merge remote changes",
            db=db,
        )
    except GitCommandError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Merge commit failed: {e.stderr.strip() if e.stderr else str(e)}",
        )

    git_service.cleanup_repo(project_id)

    return GitSyncResponse(
        status="auto_merged",
        auto_merged_files=auto_merged,
        remote_ahead_by=remote_ahead,
        local_ahead_by=local_ahead,
    )


@router.post(
    "/{project_id}/git/conflicts/resolve",
    response_model=ConflictResolveResponse,
)
async def resolve_conflicts(
    project_id: str,
    body: ConflictResolveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Resolve file conflicts and create a merge commit.

    Each resolution is "ours", "theirs", or "custom" (with custom_content).
    """
    project, _ = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )
    git_url, git_branch, token = await _resolve_git_config(project, db)

    git_service = GitService(data_dir=settings.DATA_DIR)

    # Apply resolutions to DB artifacts
    for resolution in body.resolutions:
        if resolution.resolution == "ours":
            # Keep local — no change needed
            pass
        elif resolution.resolution == "theirs":
            # Take remote content
            remote_content = await git_service.get_file_at_ref(
                project_id, f"origin/{git_branch}", resolution.path,
            )
            if remote_content is not None:
                await _update_artifact_content(db, project_id, resolution.path, remote_content)
        elif resolution.resolution == "custom":
            if resolution.custom_content is not None:
                await _update_artifact_content(
                    db, project_id, resolution.path, resolution.custom_content,
                )

    await db.flush()

    # Create merge commit
    try:
        merge_result = await git_service.create_merge_commit(
            project_id=project_id,
            git_branch=git_branch,
            author_name=current_user.username,
            author_email=current_user.email,
            message=body.commit_message,
            db=db,
        )
    except GitCommandError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Merge commit failed: {e.stderr.strip() if e.stderr else str(e)}",
        )

    pushed = False
    if body.auto_push:
        try:
            await git_service.push(project_id, git_url, git_branch, token)
            pushed = True
        except GitCommandError as e:
            logger.warning("Auto-push after resolve failed: %s", e)

    git_service.cleanup_repo(project_id)

    return ConflictResolveResponse(
        commit_sha=merge_result["commit_sha"],
        files_resolved=len(body.resolutions),
        pushed=pushed,
    )


async def _update_artifact_content(
    db: AsyncSession, project_id: str, path: str, content: str,
) -> None:
    """Update raw_content for a project artifact by path."""
    result = await db.execute(
        select(ProjectArtifact).where(
            ProjectArtifact.project_id == project_id,
            ProjectArtifact.path == path,
        )
    )
    artifact = result.scalar_one_or_none()
    if artifact:
        artifact.raw_content = content
    else:
        # File exists on remote but not in DB — create it
        artifact = ProjectArtifact(
            project_id=project_id,
            artifact_type="file",
            path=path,
            raw_content=content,
        )
        db.add(artifact)


async def _reimport_artifacts(
    git_service: GitService, project_id: str, repo_path, db: AsyncSession,
) -> None:
    """Re-detect and update DB artifacts from current repo state."""
    detected = await git_service.detect_structure(repo_path)

    # Update existing artifacts and add new ones
    result = await db.execute(
        select(ProjectArtifact).where(ProjectArtifact.project_id == project_id)
    )
    existing = {a.path: a for a in result.scalars().all()}

    for item in detected:
        if item.path in existing:
            existing[item.path].raw_content = item.raw_content
        else:
            artifact = ProjectArtifact(
                project_id=project_id,
                artifact_type=item.artifact_type,
                path=item.path,
                raw_content=item.raw_content,
            )
            db.add(artifact)

    await db.flush()
