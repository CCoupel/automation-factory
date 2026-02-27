"""
Project Access Control Service

Centralized service for:
- Checking user access to projects (owner/editor/viewer)
- Role hierarchy validation

Mirrors playbook_access_service.py pattern.
"""

from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from fastapi import HTTPException, status
import logging

from app.core.database import AsyncSessionLocal
from app.models.project import Project
from app.models.project_collaboration import ProjectShare, ProjectRole

logger = logging.getLogger(__name__)

# Role hierarchy for permission checks
ROLE_HIERARCHY = {
    ProjectRole.OWNER.value: 3,
    ProjectRole.EDITOR.value: 2,
    ProjectRole.VIEWER.value: 1
}


async def check_project_access(
    project_id: str,
    user_id: str,
    db: AsyncSession,
    required_role: Optional[str] = None,
    raise_on_not_found: bool = True,
    raise_on_forbidden: bool = True
) -> Tuple[Optional[Project], Optional[str]]:
    """
    Check if user has access to a project and return the project with their role.

    Args:
        project_id: The project ID
        user_id: The user ID
        db: Database session
        required_role: Minimum required role ('owner', 'editor', 'viewer')
        raise_on_not_found: If True, raise 404 when project not found
        raise_on_forbidden: If True, raise 403 when access denied

    Returns:
        Tuple of (Project, role string) or (None, None) if not found/forbidden

    Raises:
        HTTPException 404: Project not found (if raise_on_not_found=True)
        HTTPException 403: Not authorized or insufficient role (if raise_on_forbidden=True)
    """
    # Get project
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()

    if not project:
        if raise_on_not_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        return None, None

    # Check if owner
    if project.owner_id == user_id:
        return project, ProjectRole.OWNER.value

    # Check if shared with user
    share_result = await db.execute(
        select(ProjectShare).where(
            and_(
                ProjectShare.project_id == project_id,
                ProjectShare.user_id == user_id
            )
        )
    )
    share = share_result.scalar_one_or_none()

    if not share:
        if raise_on_forbidden:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this project"
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
            return project, None

    return project, share.role


async def check_project_access_standalone(
    project_id: str,
    user_id: str
) -> Optional[str]:
    """
    Check project access without an existing DB session (for WebSocket).

    Args:
        project_id: The project ID
        user_id: The user ID

    Returns:
        Role string ('owner', 'editor', 'viewer') or None if no access
    """
    async with AsyncSessionLocal() as db:
        project, role = await check_project_access(
            project_id=project_id,
            user_id=user_id,
            db=db,
            raise_on_not_found=False,
            raise_on_forbidden=False,
        )
        return role
