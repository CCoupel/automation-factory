"""
Playbook Access Control Service

Centralized service for:
- Checking user access to playbooks (owner/editor/viewer)
- Role hierarchy validation
- Audit logging

This service eliminates duplication across playbooks.py, collaboration.py, and websocket.py
"""

from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException, status
import logging

from app.models.playbook import Playbook
from app.models.playbook_collaboration import PlaybookShare, PlaybookAuditLog, PlaybookRole, AuditAction
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Role hierarchy for permission checks
ROLE_HIERARCHY = {
    PlaybookRole.OWNER.value: 3,
    PlaybookRole.EDITOR.value: 2,
    PlaybookRole.VIEWER.value: 1
}


async def check_playbook_access(
    playbook_id: str,
    user_id: str,
    db: AsyncSession,
    required_role: Optional[str] = None,
    raise_on_not_found: bool = True,
    raise_on_forbidden: bool = True
) -> Tuple[Optional[Playbook], Optional[str]]:
    """
    Check if user has access to a playbook and return the playbook with their role.

    Args:
        playbook_id: The playbook ID
        user_id: The user ID
        db: Database session
        required_role: Minimum required role ('owner', 'editor', 'viewer')
        raise_on_not_found: If True, raise 404 when playbook not found
        raise_on_forbidden: If True, raise 403 when access denied

    Returns:
        Tuple of (Playbook, role string) or (None, None) if not found/forbidden

    Raises:
        HTTPException 404: Playbook not found (if raise_on_not_found=True)
        HTTPException 403: Not authorized or insufficient role (if raise_on_forbidden=True)
    """
    # Get playbook
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    playbook = result.scalar_one_or_none()

    if not playbook:
        if raise_on_not_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Playbook not found"
            )
        return None, None

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
        if raise_on_forbidden:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this playbook"
            )
        return None, None

    # Check required role if specified
    if required_role:
        user_role_level = ROLE_HIERARCHY.get(share.role, 0)
        required_role_level = ROLE_HIERARCHY.get(required_role, 0)

        if user_role_level < required_role_level:
            if raise_on_forbidden:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires at least '{required_role}' role"
                )
            return playbook, None

    return playbook, share.role


async def check_playbook_access_standalone(
    playbook_id: str,
    user_id: str
) -> Optional[str]:
    """
    Check if user has access to playbook (standalone version without db session).

    Used primarily by WebSocket endpoints that manage their own sessions.

    Args:
        playbook_id: The playbook ID
        user_id: The user ID

    Returns:
        Role string ('owner', 'editor', 'viewer') or None if no access
    """
    async with AsyncSessionLocal() as db:
        playbook, role = await check_playbook_access(
            playbook_id=playbook_id,
            user_id=user_id,
            db=db,
            raise_on_not_found=False,
            raise_on_forbidden=False
        )
        return role


def has_minimum_role(user_role: str, required_role: str) -> bool:
    """
    Check if user_role meets or exceeds required_role.

    Args:
        user_role: The user's current role
        required_role: The minimum required role

    Returns:
        True if user_role >= required_role in hierarchy
    """
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_level >= required_level


async def log_playbook_action(
    db: AsyncSession,
    playbook_id: str,
    user_id: str,
    action: AuditAction,
    details: dict = None
) -> None:
    """
    Log an action to the playbook audit log.

    Args:
        db: Database session
        playbook_id: The playbook ID
        user_id: The user performing the action
        action: The action being performed (from AuditAction enum)
        details: Optional additional details dict
    """
    audit_entry = PlaybookAuditLog(
        playbook_id=playbook_id,
        user_id=user_id,
        action=action.value,
        details=details
    )
    db.add(audit_entry)
    logger.debug(f"Audit log: user={user_id} action={action.value} playbook={playbook_id}")


async def get_playbook_by_id(
    playbook_id: str,
    db: AsyncSession
) -> Optional[Playbook]:
    """
    Get a playbook by ID without access checks.

    Args:
        playbook_id: The playbook ID
        db: Database session

    Returns:
        Playbook or None if not found
    """
    result = await db.execute(
        select(Playbook).where(Playbook.id == playbook_id)
    )
    return result.scalar_one_or_none()


async def is_playbook_owner(
    playbook_id: str,
    user_id: str,
    db: AsyncSession
) -> bool:
    """
    Check if user is the owner of a playbook.

    Args:
        playbook_id: The playbook ID
        user_id: The user ID
        db: Database session

    Returns:
        True if user is owner
    """
    result = await db.execute(
        select(Playbook).where(
            and_(
                Playbook.id == playbook_id,
                Playbook.owner_id == user_id
            )
        )
    )
    return result.scalar_one_or_none() is not None
