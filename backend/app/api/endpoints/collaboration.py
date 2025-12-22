"""
Collaboration endpoints for playbook sharing and audit logging

Provides endpoints for:
- Sharing playbooks with other users
- Managing share permissions
- Viewing playbooks shared with the current user
- Audit log access
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.playbook import Playbook
from app.models.playbook_collaboration import PlaybookShare, PlaybookAuditLog, PlaybookRole, AuditAction
from app.schemas.collaboration import (
    ShareCreate, ShareUpdate, ShareResponse, ShareListResponse,
    ShareUserInfo, AuditLogResponse, AuditLogListResponse, AuditLogUserInfo,
    SharedPlaybookResponse, SharedPlaybooksListResponse
)

router = APIRouter(prefix="/playbooks", tags=["collaboration"])


# === Helper Functions ===

async def get_playbook_with_access_check(
    playbook_id: str,
    user_id: str,
    db: AsyncSession,
    required_role: str = None
) -> tuple[Playbook, str]:
    """
    Get playbook and verify user has access.

    Args:
        playbook_id: Playbook ID
        user_id: Current user ID
        db: Database session
        required_role: If specified, require at least this role (owner > editor > viewer)

    Returns:
        Tuple of (playbook, role)

    Raises:
        HTTPException 404: Playbook not found
        HTTPException 403: Not authorized
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

    # Check if owner
    if playbook.owner_id == user_id:
        return playbook, PlaybookRole.OWNER.value

    # Check if shared with user
    share_result = await db.execute(
        select(PlaybookShare).where(
            and_(
                PlaybookShare.playbook_id == playbook_id,
                PlaybookShare.user_id == user_id
            )
        )
    )
    share = share_result.scalar_one_or_none()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this playbook"
        )

    # Check required role
    if required_role:
        role_hierarchy = {
            PlaybookRole.OWNER.value: 3,
            PlaybookRole.EDITOR.value: 2,
            PlaybookRole.VIEWER.value: 1
        }
        if role_hierarchy.get(share.role, 0) < role_hierarchy.get(required_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires at least '{required_role}' role"
            )

    return playbook, share.role


async def log_audit_action(
    db: AsyncSession,
    playbook_id: str,
    user_id: str,
    action: AuditAction,
    details: dict = None
):
    """Log an action to the audit log"""
    audit_entry = PlaybookAuditLog(
        playbook_id=playbook_id,
        user_id=user_id,
        action=action.value,
        details=details
    )
    db.add(audit_entry)


# === Share Endpoints ===

@router.post("/{playbook_id}/shares", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
async def create_share(
    playbook_id: str,
    share_data: ShareCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Share a playbook with another user.

    Only the playbook owner can share it.

    Args:
        playbook_id: Playbook ID
        share_data: Username and role to share with

    Returns:
        Created share

    Raises:
        HTTPException 404: Playbook or user not found
        HTTPException 403: Not the owner
        HTTPException 400: Cannot share with yourself, already shared, or invalid role
    """
    # Verify ownership
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
            detail="Only the owner can share this playbook"
        )

    # Validate role
    if share_data.role not in [PlaybookRole.EDITOR.value, PlaybookRole.VIEWER.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'editor' or 'viewer'"
        )

    # Find target user by username
    user_result = await db.execute(
        select(User).where(User.username == share_data.username)
    )
    target_user = user_result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{share_data.username}' not found"
        )

    # Cannot share with yourself
    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot share playbook with yourself"
        )

    # Check if already shared
    existing_result = await db.execute(
        select(PlaybookShare).where(
            and_(
                PlaybookShare.playbook_id == playbook_id,
                PlaybookShare.user_id == target_user.id
            )
        )
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Playbook already shared with '{share_data.username}'"
        )

    # Create share
    share = PlaybookShare(
        playbook_id=playbook_id,
        user_id=target_user.id,
        role=share_data.role,
        created_by=current_user.id
    )
    db.add(share)

    # Log audit action
    await log_audit_action(
        db, playbook_id, current_user.id, AuditAction.SHARE,
        {"shared_with_username": target_user.username, "shared_with_id": target_user.id, "role": share_data.role}
    )

    await db.commit()
    await db.refresh(share)

    return ShareResponse(
        id=share.id,
        playbook_id=share.playbook_id,
        user_id=share.user_id,
        role=share.role,
        created_at=share.created_at,
        created_by=share.created_by,
        user=ShareUserInfo(
            id=target_user.id,
            username=target_user.username,
            email=target_user.email
        )
    )


@router.get("/{playbook_id}/shares", response_model=ShareListResponse)
async def list_shares(
    playbook_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all shares for a playbook.

    Only the owner can see the full share list.

    Args:
        playbook_id: Playbook ID

    Returns:
        List of shares with user info
    """
    # Verify ownership
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
            detail="Only the owner can view shares"
        )

    # Get shares with user info
    shares_result = await db.execute(
        select(PlaybookShare)
        .options(selectinload(PlaybookShare.user))
        .where(PlaybookShare.playbook_id == playbook_id)
        .order_by(PlaybookShare.created_at.desc())
    )
    shares = shares_result.scalars().all()

    share_responses = []
    for share in shares:
        share_responses.append(ShareResponse(
            id=share.id,
            playbook_id=share.playbook_id,
            user_id=share.user_id,
            role=share.role,
            created_at=share.created_at,
            created_by=share.created_by,
            user=ShareUserInfo(
                id=share.user.id,
                username=share.user.username,
                email=share.user.email
            ) if share.user else None
        ))

    return ShareListResponse(
        playbook_id=playbook_id,
        shares=share_responses,
        total=len(share_responses)
    )


@router.put("/{playbook_id}/shares/{share_id}", response_model=ShareResponse)
async def update_share(
    playbook_id: str,
    share_id: str,
    share_data: ShareUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a share's role.

    Only the owner can update shares.

    Args:
        playbook_id: Playbook ID
        share_id: Share ID
        share_data: New role

    Returns:
        Updated share
    """
    # Verify ownership
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
            detail="Only the owner can modify shares"
        )

    # Validate role
    if share_data.role not in [PlaybookRole.EDITOR.value, PlaybookRole.VIEWER.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'editor' or 'viewer'"
        )

    # Get share
    share_result = await db.execute(
        select(PlaybookShare)
        .options(selectinload(PlaybookShare.user))
        .where(
            and_(
                PlaybookShare.id == share_id,
                PlaybookShare.playbook_id == playbook_id
            )
        )
    )
    share = share_result.scalar_one_or_none()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )

    old_role = share.role
    share.role = share_data.role

    # Log audit action
    await log_audit_action(
        db, playbook_id, current_user.id, AuditAction.ROLE_CHANGE,
        {"user_id": share.user_id, "old_role": old_role, "new_role": share_data.role}
    )

    await db.commit()
    await db.refresh(share)

    return ShareResponse(
        id=share.id,
        playbook_id=share.playbook_id,
        user_id=share.user_id,
        role=share.role,
        created_at=share.created_at,
        created_by=share.created_by,
        user=ShareUserInfo(
            id=share.user.id,
            username=share.user.username,
            email=share.user.email
        ) if share.user else None
    )


@router.delete("/{playbook_id}/shares/{share_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_share(
    playbook_id: str,
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a share (unshare playbook from user).

    Only the owner can remove shares.

    Args:
        playbook_id: Playbook ID
        share_id: Share ID
    """
    # Verify ownership
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
            detail="Only the owner can remove shares"
        )

    # Get share
    share_result = await db.execute(
        select(PlaybookShare).where(
            and_(
                PlaybookShare.id == share_id,
                PlaybookShare.playbook_id == playbook_id
            )
        )
    )
    share = share_result.scalar_one_or_none()

    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share not found"
        )

    # Log audit action
    await log_audit_action(
        db, playbook_id, current_user.id, AuditAction.UNSHARE,
        {"user_id": share.user_id, "role": share.role}
    )

    await db.delete(share)
    await db.commit()

    return None


# === Shared With Me Endpoint ===

@router.get("/shared-with-me", response_model=SharedPlaybooksListResponse)
async def list_shared_with_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List playbooks that have been shared with the current user.

    Returns:
        List of shared playbooks with owner info and user's role
    """
    # Get shares for current user with playbook and owner info
    shares_result = await db.execute(
        select(PlaybookShare, Playbook, User)
        .join(Playbook, PlaybookShare.playbook_id == Playbook.id)
        .join(User, Playbook.owner_id == User.id)
        .where(PlaybookShare.user_id == current_user.id)
        .order_by(Playbook.updated_at.desc())
    )
    results = shares_result.all()

    playbooks = []
    for share, playbook, owner in results:
        playbooks.append(SharedPlaybookResponse(
            id=playbook.id,
            name=playbook.name,
            description=playbook.description,
            owner_id=playbook.owner_id,
            owner_username=owner.username,
            role=share.role,
            version=playbook.version,
            created_at=playbook.created_at,
            updated_at=playbook.updated_at
        ))

    return SharedPlaybooksListResponse(
        playbooks=playbooks,
        total=len(playbooks)
    )


# === Audit Log Endpoints ===

@router.get("/{playbook_id}/audit-log", response_model=AuditLogListResponse)
async def get_audit_log(
    playbook_id: str,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get audit log for a playbook.

    Only the owner can view the full audit log.

    Args:
        playbook_id: Playbook ID
        limit: Maximum entries to return (default 50)

    Returns:
        List of audit log entries
    """
    # Verify ownership
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
            detail="Only the owner can view the audit log"
        )

    # Get audit log entries
    log_result = await db.execute(
        select(PlaybookAuditLog)
        .options(selectinload(PlaybookAuditLog.user))
        .where(PlaybookAuditLog.playbook_id == playbook_id)
        .order_by(PlaybookAuditLog.created_at.desc())
        .limit(limit)
    )
    entries = log_result.scalars().all()

    entry_responses = []
    for entry in entries:
        entry_responses.append(AuditLogResponse(
            id=entry.id,
            playbook_id=entry.playbook_id,
            user_id=entry.user_id,
            action=entry.action,
            details=entry.details,
            created_at=entry.created_at,
            user=AuditLogUserInfo(
                id=entry.user.id,
                username=entry.user.username
            ) if entry.user else None
        ))

    return AuditLogListResponse(
        playbook_id=playbook_id,
        entries=entry_responses,
        total=len(entry_responses)
    )
