"""
Playbook CRUD endpoints

Provides endpoints for managing playbooks:
- List user's playbooks
- Create new playbook
- Get playbook details
- Update playbook
- Delete playbook
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.playbook import Playbook
from app.schemas.playbook import (
    PlaybookCreate, PlaybookUpdate, PlaybookResponse, PlaybookDetailResponse,
    PlaybookYamlResponse, PlaybookValidationResponse, PlaybookPreviewRequest
)
from app.services.playbook_yaml_service import playbook_yaml_service

router = APIRouter(prefix="/playbooks", tags=["playbooks"])


@router.get("", response_model=List[PlaybookResponse])
async def list_playbooks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all playbooks for the authenticated user

    Returns:
        List of playbooks (without full content)
    """
    result = await db.execute(
        select(Playbook)
        .where(Playbook.owner_id == current_user.id)
        .order_by(Playbook.updated_at.desc())
    )
    playbooks = result.scalars().all()

    return playbooks


@router.post("", response_model=PlaybookDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_playbook(
    playbook_data: PlaybookCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new playbook

    Args:
        playbook_data: Playbook creation data (name, description, content)

    Returns:
        Created playbook with full details
    """
    # Create playbook
    playbook = Playbook(
        name=playbook_data.name,
        description=playbook_data.description,
        content=playbook_data.content,
        owner_id=current_user.id
    )

    db.add(playbook)
    await db.commit()
    await db.refresh(playbook)

    return playbook


@router.get("/{playbook_id}", response_model=PlaybookDetailResponse)
async def get_playbook(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific playbook with full content

    Args:
        playbook_id: Playbook ID

    Returns:
        Playbook with full content

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    # Verify ownership
    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this playbook"
        )

    return playbook


@router.put("/{playbook_id}", response_model=PlaybookDetailResponse)
async def update_playbook(
    playbook_id: str,
    playbook_data: PlaybookUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a playbook

    Args:
        playbook_id: Playbook ID
        playbook_data: Fields to update (name, description, content)

    Returns:
        Updated playbook

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    # Verify ownership
    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this playbook"
        )

    # Update fields
    if playbook_data.name is not None:
        playbook.name = playbook_data.name
    if playbook_data.description is not None:
        playbook.description = playbook_data.description
    if playbook_data.content is not None:
        playbook.content = playbook_data.content

    await db.commit()
    await db.refresh(playbook)

    return playbook


@router.delete("/{playbook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playbook(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a playbook

    Args:
        playbook_id: Playbook ID

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    # Verify ownership
    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this playbook"
        )

    await db.delete(playbook)
    await db.commit()

    return None


@router.get("/{playbook_id}/yaml", response_model=PlaybookYamlResponse)
async def get_playbook_yaml(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get generated YAML for a playbook

    Args:
        playbook_id: Playbook ID

    Returns:
        Generated YAML string

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this playbook"
        )

    yaml_output = playbook_yaml_service.json_to_yaml(playbook.content)

    return PlaybookYamlResponse(
        yaml=yaml_output,
        playbook_id=playbook_id
    )


@router.post("/{playbook_id}/validate", response_model=PlaybookValidationResponse)
async def validate_playbook(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Validate a saved playbook

    Args:
        playbook_id: Playbook ID

    Returns:
        Validation result with errors and warnings

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not the owner of this playbook
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Playbook not found"
        )

    if playbook.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this playbook"
        )

    validation = playbook_yaml_service.validate(playbook.content)

    return PlaybookValidationResponse(
        is_valid=validation.is_valid,
        errors=validation.errors,
        warnings=validation.warnings,
        playbook_id=playbook_id
    )


@router.post("/preview", response_model=PlaybookYamlResponse)
async def preview_playbook(
    preview_data: PlaybookPreviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate YAML preview without saving

    This endpoint is used for real-time preview in the frontend.
    It does not require a saved playbook.

    Args:
        preview_data: Playbook content to preview

    Returns:
        Generated YAML string
    """
    yaml_output = playbook_yaml_service.json_to_yaml(preview_data.content)

    return PlaybookYamlResponse(
        yaml=yaml_output,
        playbook_id=None
    )


@router.post("/validate-preview", response_model=PlaybookValidationResponse)
async def validate_preview(
    preview_data: PlaybookPreviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Validate playbook content without saving

    This endpoint is used for real-time validation in the frontend.
    It does not require a saved playbook.

    Args:
        preview_data: Playbook content to validate

    Returns:
        Validation result with errors and warnings
    """
    validation = playbook_yaml_service.validate(preview_data.content)

    return PlaybookValidationResponse(
        is_valid=validation.is_valid,
        errors=validation.errors,
        warnings=validation.warnings,
        playbook_id=None
    )
