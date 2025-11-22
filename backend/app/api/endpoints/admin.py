"""
Admin endpoints for user management

Provides admin-only endpoints for:
- List all users
- Change user password
- Activate/deactivate users
- Purge user's playbooks
- Delete users
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.core.security import get_password_hash
from app.models.user import User
from app.models.playbook import Playbook
from app.schemas.user import UserResponse, UserPasswordChange, UserAdminUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users (admin only)

    Returns:
        List of all users with their details
    """
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    return users


@router.put("/users/{user_id}/password")
async def change_user_password(
    user_id: str,
    password_data: UserPasswordChange,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Change a user's password (admin only)

    Args:
        user_id: User ID
        password_data: New password

    Returns:
        Success message

    Raises:
        HTTPException 404: User not found
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update password
    user.hashed_password = get_password_hash(password_data.new_password)

    await db.commit()

    return {"message": f"Password updated for user {user.username}"}


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    user_update: UserAdminUpdate,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user status (activate/deactivate, admin privileges) (admin only)

    Args:
        user_id: User ID
        user_update: Fields to update (is_active, is_admin)

    Returns:
        Updated user

    Raises:
        HTTPException 404: User not found
        HTTPException 400: Cannot deactivate yourself or remove own admin privileges
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admin from deactivating themselves
    if user.id == current_admin.id and user_update.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )

    # Prevent admin from removing their own admin privileges
    if user.id == current_admin.id and user_update.is_admin is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own admin privileges"
        )

    # Update fields
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.is_admin is not None:
        user.is_admin = user_update.is_admin

    await db.commit()
    await db.refresh(user)

    return user


@router.delete("/users/{user_id}/playbooks")
async def purge_user_playbooks(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Purge all playbooks for a user (admin only)

    Args:
        user_id: User ID

    Returns:
        Count of deleted playbooks

    Raises:
        HTTPException 404: User not found
    """
    # Verify user exists
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Delete all user's playbooks
    result = await db.execute(
        delete(Playbook).where(Playbook.owner_id == user_id)
    )
    deleted_count = result.rowcount

    await db.commit()

    return {
        "message": f"Purged {deleted_count} playbook(s) for user {user.username}",
        "deleted_count": deleted_count
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a user and all their playbooks (admin only)

    Args:
        user_id: User ID

    Raises:
        HTTPException 404: User not found
        HTTPException 400: Cannot delete yourself
    """
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent admin from deleting themselves
    if user.id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    # Delete user (cascade will delete playbooks)
    await db.delete(user)
    await db.commit()

    return None
