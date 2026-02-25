"""
Project share endpoints for collaboration
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    get_user_by_username_or_404,
    check_owner_or_403,
    check_not_self_or_400,
    get_project_or_404,
)
from app.models.user import User
from app.models.project_collaboration import ProjectShare, ProjectRole
from app.schemas.project_collaboration import (
    ProjectShareCreate, ProjectShareUpdate,
    ProjectShareResponse, ProjectShareListResponse, ProjectShareUserInfo
)

router = APIRouter(prefix="/projects", tags=["Project Shares"])


@router.post("/{project_id}/shares", response_model=ProjectShareResponse, status_code=status.HTTP_201_CREATED)
async def create_project_share(
    project_id: str,
    share_data: ProjectShareCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Share a project with another user. Only the owner can share.
    """
    # Verify project exists and user is owner
    project = await get_project_or_404(db, project_id)
    check_owner_or_403(project.owner_id, current_user, "share this project")

    # Validate role
    if share_data.role not in [ProjectRole.EDITOR.value, ProjectRole.VIEWER.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'editor' or 'viewer'"
        )

    # Find target user and verify not sharing with self
    target_user = await get_user_by_username_or_404(
        db, share_data.username, f"User '{share_data.username}' not found"
    )
    check_not_self_or_400(target_user.id, current_user, "share project with yourself")

    # Check if already shared
    existing_result = await db.execute(
        select(ProjectShare).where(
            and_(
                ProjectShare.project_id == project_id,
                ProjectShare.user_id == target_user.id
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project already shared with '{share_data.username}'"
        )

    # Create share
    share = ProjectShare(
        project_id=project_id,
        user_id=target_user.id,
        role=share_data.role,
        created_by=current_user.id
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)

    return ProjectShareResponse(
        id=share.id,
        project_id=share.project_id,
        user_id=share.user_id,
        role=share.role,
        created_at=share.created_at,
        created_by=share.created_by,
        user=ProjectShareUserInfo(
            id=target_user.id,
            username=target_user.username,
            email=target_user.email
        )
    )


@router.get("/{project_id}/shares", response_model=ProjectShareListResponse)
async def list_project_shares(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all shares for a project. Only the owner can view.
    """
    project = await get_project_or_404(db, project_id)
    check_owner_or_403(project.owner_id, current_user, "view shares")

    shares_result = await db.execute(
        select(ProjectShare)
        .options(selectinload(ProjectShare.user))
        .where(ProjectShare.project_id == project_id)
        .order_by(ProjectShare.created_at.desc())
    )
    shares = shares_result.scalars().all()

    share_responses = []
    for share in shares:
        share_responses.append(ProjectShareResponse(
            id=share.id,
            project_id=share.project_id,
            user_id=share.user_id,
            role=share.role,
            created_at=share.created_at,
            created_by=share.created_by,
            user=ProjectShareUserInfo(
                id=share.user.id,
                username=share.user.username,
                email=share.user.email
            ) if share.user else None
        ))

    return ProjectShareListResponse(
        project_id=project_id,
        shares=share_responses,
        total=len(share_responses)
    )


@router.put("/{project_id}/shares/{share_id}", response_model=ProjectShareResponse)
async def update_project_share(
    project_id: str,
    share_id: str,
    share_data: ProjectShareUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a share's role. Only the owner can update.
    """
    project = await get_project_or_404(db, project_id)
    check_owner_or_403(project.owner_id, current_user, "modify shares")

    # Validate role
    if share_data.role not in [ProjectRole.EDITOR.value, ProjectRole.VIEWER.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'editor' or 'viewer'"
        )

    share_result = await db.execute(
        select(ProjectShare)
        .options(selectinload(ProjectShare.user))
        .where(
            and_(
                ProjectShare.id == share_id,
                ProjectShare.project_id == project_id
            )
        )
    )
    share = share_result.scalar_one_or_none()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )

    share.role = share_data.role
    await db.commit()
    await db.refresh(share)

    return ProjectShareResponse(
        id=share.id,
        project_id=share.project_id,
        user_id=share.user_id,
        role=share.role,
        created_at=share.created_at,
        created_by=share.created_by,
        user=ProjectShareUserInfo(
            id=share.user.id,
            username=share.user.username,
            email=share.user.email
        ) if share.user else None
    )


@router.delete("/{project_id}/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project_share(
    project_id: str,
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a share. Only the owner can remove.
    """
    project = await get_project_or_404(db, project_id)
    check_owner_or_403(project.owner_id, current_user, "remove shares")

    share_result = await db.execute(
        select(ProjectShare).where(
            and_(
                ProjectShare.id == share_id,
                ProjectShare.project_id == project_id
            )
        )
    )
    share = share_result.scalar_one_or_none()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )

    await db.delete(share)
    await db.commit()

    return None
