"""
Project artifact CRUD endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project_artifact import ProjectArtifact, ArtifactType
from app.schemas.project_artifact import (
    ProjectArtifactCreate, ProjectArtifactUpdate,
    ProjectArtifactResponse, ProjectArtifactListResponse
)
from app.services.project_access_service import check_project_access

router = APIRouter(prefix="/projects", tags=["Project Artifacts"])

# Valid artifact type values
VALID_ARTIFACT_TYPES = {t.value for t in ArtifactType}


def _artifact_response(artifact: ProjectArtifact) -> ProjectArtifactResponse:
    """Build response from artifact model"""
    return ProjectArtifactResponse(
        id=artifact.id,
        project_id=artifact.project_id,
        artifact_type=artifact.artifact_type,
        path=artifact.path,
        content=artifact.content,
        raw_content=artifact.raw_content,
        version=artifact.version,
        metadata=artifact.metadata_,
        created_at=artifact.created_at,
        updated_at=artifact.updated_at,
    )


@router.get("/{project_id}/artifacts", response_model=ProjectArtifactListResponse)
async def list_artifacts(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all artifacts in a project. Requires at least viewer access.
    """
    await check_project_access(project_id, current_user.id, db, required_role="viewer")

    result = await db.execute(
        select(ProjectArtifact)
        .where(ProjectArtifact.project_id == project_id)
        .order_by(ProjectArtifact.path)
    )
    artifacts = result.scalars().all()

    return ProjectArtifactListResponse(
        project_id=project_id,
        artifacts=[_artifact_response(a) for a in artifacts],
        total=len(artifacts)
    )


@router.post("/{project_id}/artifacts", response_model=ProjectArtifactResponse, status_code=status.HTTP_201_CREATED)
async def create_artifact(
    project_id: str,
    artifact_data: ProjectArtifactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create an artifact in a project. Requires at least editor access.
    """
    await check_project_access(project_id, current_user.id, db, required_role="editor")

    # Validate artifact type
    if artifact_data.artifact_type not in VALID_ARTIFACT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid artifact_type '{artifact_data.artifact_type}'. Must be one of: {', '.join(sorted(VALID_ARTIFACT_TYPES))}"
        )

    # Check for duplicate path
    existing = await db.execute(
        select(ProjectArtifact).where(
            and_(
                ProjectArtifact.project_id == project_id,
                ProjectArtifact.path == artifact_data.path
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An artifact with path '{artifact_data.path}' already exists in this project"
        )

    artifact = ProjectArtifact(
        project_id=project_id,
        artifact_type=artifact_data.artifact_type,
        path=artifact_data.path,
        content=artifact_data.content,
        raw_content=artifact_data.raw_content,
        metadata_=artifact_data.metadata,
    )
    db.add(artifact)
    await db.commit()
    await db.refresh(artifact)

    return _artifact_response(artifact)


@router.get("/{project_id}/artifacts/{artifact_id}", response_model=ProjectArtifactResponse)
async def get_artifact(
    project_id: str,
    artifact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific artifact. Requires at least viewer access.
    """
    await check_project_access(project_id, current_user.id, db, required_role="viewer")

    result = await db.execute(
        select(ProjectArtifact).where(
            and_(
                ProjectArtifact.id == artifact_id,
                ProjectArtifact.project_id == project_id
            )
        )
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact not found"
        )

    return _artifact_response(artifact)


@router.put("/{project_id}/artifacts/{artifact_id}", response_model=ProjectArtifactResponse)
async def update_artifact(
    project_id: str,
    artifact_id: str,
    artifact_data: ProjectArtifactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an artifact. Requires at least editor access. Increments version.
    """
    await check_project_access(project_id, current_user.id, db, required_role="editor")

    result = await db.execute(
        select(ProjectArtifact).where(
            and_(
                ProjectArtifact.id == artifact_id,
                ProjectArtifact.project_id == project_id
            )
        )
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact not found"
        )

    # Apply updates
    update_data = artifact_data.model_dump(exclude_unset=True)

    # Validate artifact_type if being updated
    if "artifact_type" in update_data and update_data["artifact_type"] not in VALID_ARTIFACT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid artifact_type '{update_data['artifact_type']}'. Must be one of: {', '.join(sorted(VALID_ARTIFACT_TYPES))}"
        )

    # Check path uniqueness if path is being changed
    if "path" in update_data and update_data["path"] != artifact.path:
        existing = await db.execute(
            select(ProjectArtifact).where(
                and_(
                    ProjectArtifact.project_id == project_id,
                    ProjectArtifact.path == update_data["path"],
                    ProjectArtifact.id != artifact_id
                )
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An artifact with path '{update_data['path']}' already exists in this project"
            )

    # Map schema "metadata" field to model "metadata_" attribute
    if "metadata" in update_data:
        update_data["metadata_"] = update_data.pop("metadata")

    for field, value in update_data.items():
        setattr(artifact, field, value)

    # Increment version
    artifact.version += 1

    await db.commit()
    await db.refresh(artifact)

    return _artifact_response(artifact)


@router.delete("/{project_id}/artifacts/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_artifact(
    project_id: str,
    artifact_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an artifact. Requires at least editor access.
    """
    await check_project_access(project_id, current_user.id, db, required_role="editor")

    result = await db.execute(
        select(ProjectArtifact).where(
            and_(
                ProjectArtifact.id == artifact_id,
                ProjectArtifact.project_id == project_id
            )
        )
    )
    artifact = result.scalar_one_or_none()

    if not artifact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact not found"
        )

    await db.delete(artifact)
    await db.commit()

    return None
