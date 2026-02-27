"""
Git import endpoint — import a project from a Git repository
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
from app.schemas.git_import import GitImportRequest, GitImportResponse, GitImportArtifactSummary
from app.schemas.project import ProjectResponse
from app.services.git_service import GitService
from app.utils.encryption import decrypt_token

router = APIRouter(prefix="/projects", tags=["Git Import"])


@router.post("/import-git", response_model=GitImportResponse, status_code=status.HTTP_201_CREATED)
async def import_from_git(
    request: GitImportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Import a project from a Git repository.

    1. Create the Project entity
    2. Resolve git credentials (if credential_id provided)
    3. Clone repo, detect structure, parse playbooks
    4. Create ProjectArtifact entries
    5. Return project + artifacts summary
    """
    # Resolve credentials
    token = None
    if request.git_credentials_id:
        result = await db.execute(
            select(GitCredential).where(GitCredential.id == request.git_credentials_id)
        )
        credential = result.scalar_one_or_none()

        if not credential:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Git credential not found",
            )
        if credential.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to use this credential",
            )
        if credential.token_encrypted:
            token = decrypt_token(credential.token_encrypted)

    # Create project
    project = Project(
        name=request.name,
        description=request.description,
        owner_id=current_user.id,
        git_url=request.git_url,
        git_branch=request.git_branch,
        git_credentials_id=request.git_credentials_id,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)

    # Clone and import
    git_service = GitService(data_dir=settings.DATA_DIR)

    try:
        artifacts, warnings = await git_service.import_project(
            url=request.git_url,
            branch=request.git_branch,
            project_id=project.id,
            token=token,
            db=db,
        )
    except GitCommandError as e:
        # Rollback the project creation on clone failure
        await db.delete(project)
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Git clone failed: {e.stderr.strip() if e.stderr else str(e)}",
        )
    except Exception as e:
        await db.delete(project)
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}",
        )

    await db.commit()
    await db.refresh(project)

    # Build response
    project_response = ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        git_url=project.git_url,
        git_branch=project.git_branch,
        git_credentials_id=project.git_credentials_id,
        settings=project.settings,
        created_at=project.created_at,
        updated_at=project.updated_at,
        owner_username=current_user.username,
        user_role="owner",
        is_shared=False,
    )

    artifact_summaries = [
        GitImportArtifactSummary(path=a.path, artifact_type=a.artifact_type)
        for a in artifacts
    ]

    return GitImportResponse(
        project=project_response,
        artifacts=artifact_summaries,
        warnings=warnings,
    )
