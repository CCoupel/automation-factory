"""
Project CRUD endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project_collaboration import ProjectShare
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse
)
from app.services.project_access_service import check_project_access

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List projects owned by or shared with the current user.
    """
    # Get owned projects
    owned_result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(Project.updated_at.desc())
    )
    owned_projects = owned_result.scalars().all()

    # Get shared projects
    shared_result = await db.execute(
        select(ProjectShare, Project, User)
        .join(Project, ProjectShare.project_id == Project.id)
        .join(User, Project.owner_id == User.id)
        .where(ProjectShare.user_id == current_user.id)
        .order_by(Project.updated_at.desc())
    )
    shared_rows = shared_result.all()

    projects = []

    # Add owned projects
    for project in owned_projects:
        projects.append(ProjectResponse(
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
        ))

    # Add shared projects
    for share, project, owner in shared_rows:
        projects.append(ProjectResponse(
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
            owner_username=owner.username,
            user_role=share.role,
            is_shared=True,
        ))

    # Sort by updated_at desc
    projects.sort(key=lambda p: p.updated_at, reverse=True)

    return ProjectListResponse(projects=projects, total=len(projects))


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new project.
    """
    project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.id,
        git_url=project_data.git_url,
        git_branch=project_data.git_branch,
        git_credentials_id=project_data.git_credentials_id,
        settings=project_data.settings,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    return ProjectResponse(
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


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a project by ID. Requires at least viewer access.
    """
    project, role = await check_project_access(
        project_id, current_user.id, db, required_role="viewer"
    )

    # Get owner username
    owner_result = await db.execute(select(User).where(User.id == project.owner_id))
    owner = owner_result.scalar_one_or_none()

    return ProjectResponse(
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
        owner_username=owner.username if owner else None,
        user_role=role,
        is_shared=(role != "owner"),
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a project. Requires at least editor access.
    """
    project, role = await check_project_access(
        project_id, current_user.id, db, required_role="editor"
    )

    # Apply updates
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)

    # Get owner username
    owner_result = await db.execute(select(User).where(User.id == project.owner_id))
    owner = owner_result.scalar_one_or_none()

    return ProjectResponse(
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
        owner_username=owner.username if owner else None,
        user_role=role,
        is_shared=(role != "owner"),
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a project. Only the owner can delete.
    Cascades: deletes artifacts and shares. Detaches playbooks (project_id → null).
    """
    project, role = await check_project_access(
        project_id, current_user.id, db, required_role="owner"
    )

    await db.delete(project)
    await db.commit()

    return None
