"""
Inventory parsing and generation endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.inventory import (
    InventoryData,
    InventoryParseRequest,
    InventoryParseResponse,
    InventoryGenerateResponse,
)
from app.services.inventory_service import inventory_service
from app.services.project_access_service import check_project_access

router = APIRouter(prefix="/projects", tags=["Inventory"])


@router.post(
    "/{project_id}/inventory/parse",
    response_model=InventoryParseResponse,
)
async def parse_inventory(
    project_id: str,
    request: InventoryParseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parse raw inventory content (YAML or INI) into structured host/group data.
    Requires at least viewer access to the project.
    """
    await check_project_access(project_id, current_user.id, db, required_role="viewer")

    try:
        data, warnings, fmt = inventory_service.parse(request.raw_content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse inventory: {str(e)}",
        )

    return InventoryParseResponse(data=data, warnings=warnings, format=fmt)


@router.post(
    "/{project_id}/inventory/generate",
    response_model=InventoryGenerateResponse,
)
async def generate_inventory(
    project_id: str,
    data: InventoryData,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate YAML inventory from structured host/group data.
    Requires at least editor access to the project.
    """
    await check_project_access(project_id, current_user.id, db, required_role="editor")

    # Validate first
    errors = inventory_service.validate(data)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Inventory validation failed: {'; '.join(errors)}",
        )

    try:
        yaml_content = inventory_service.generate_yaml(data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to generate inventory: {str(e)}",
        )

    return InventoryGenerateResponse(yaml_content=yaml_content)
