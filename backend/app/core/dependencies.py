"""
Dependencies for authentication and authorization

Provides reusable dependencies for FastAPI endpoints:
- Authentication (get_current_user, get_current_admin)
- Entity fetching with 404 handling (get_user_or_404, get_playbook_or_404)
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.playbook import Playbook

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token

    Args:
        credentials: Bearer token from Authorization header
        db: Database session

    Returns:
        Current authenticated user

    Raises:
        HTTPException 401: If token is invalid or user not found
        HTTPException 403: If user account is disabled
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Decode token
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Get user from database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    # Check if user account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current authenticated admin user

    Args:
        current_user: Current authenticated user

    Returns:
        Current authenticated admin user

    Raises:
        HTTPException 403: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have admin privileges"
        )

    return current_user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise

    Useful for endpoints that work differently for authenticated vs anonymous users

    Args:
        credentials: Optional bearer token
        db: Database session

    Returns:
        Current user if authenticated, None otherwise
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


# ============================================================================
# Entity Fetching Helpers (with 404 handling)
# ============================================================================

async def get_user_or_404(
    db: AsyncSession,
    user_id: str,
    detail: str = "User not found"
) -> User:
    """
    Get user by ID or raise 404

    Args:
        db: Database session
        user_id: User ID to fetch
        detail: Custom error message

    Returns:
        User object

    Raises:
        HTTPException 404: If user not found
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )

    return user


async def get_user_by_username_or_404(
    db: AsyncSession,
    username: str,
    detail: str = "User not found"
) -> User:
    """
    Get user by username or raise 404

    Args:
        db: Database session
        username: Username to fetch
        detail: Custom error message

    Returns:
        User object

    Raises:
        HTTPException 404: If user not found
    """
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )

    return user


async def get_playbook_or_404(
    db: AsyncSession,
    playbook_id: str,
    detail: str = "Playbook not found"
) -> Playbook:
    """
    Get playbook by ID or raise 404

    Args:
        db: Database session
        playbook_id: Playbook ID to fetch
        detail: Custom error message

    Returns:
        Playbook object

    Raises:
        HTTPException 404: If playbook not found
    """
    result = await db.execute(select(Playbook).where(Playbook.id == playbook_id))
    playbook = result.scalar_one_or_none()

    if not playbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail
        )

    return playbook


def check_owner_or_403(
    entity_owner_id: str,
    current_user: User,
    action: str = "perform this action"
) -> None:
    """
    Check if current user is the owner, raise 403 if not

    Args:
        entity_owner_id: Owner ID of the entity
        current_user: Current authenticated user
        action: Action description for error message

    Raises:
        HTTPException 403: If user is not the owner
    """
    if entity_owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only the owner can {action}"
        )


def check_not_self_or_400(
    target_user_id: str,
    current_user: User,
    action: str = "perform this action on yourself"
) -> None:
    """
    Check that user is not targeting themselves, raise 400 if so

    Args:
        target_user_id: Target user ID
        current_user: Current authenticated user
        action: Action description for error message

    Raises:
        HTTPException 400: If user is targeting themselves
    """
    if target_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot {action}"
        )
