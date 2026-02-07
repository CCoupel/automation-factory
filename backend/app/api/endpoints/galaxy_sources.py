"""
Galaxy Sources API endpoints for admin configuration.

All endpoints require admin privileges.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_admin
from app.models.user import User
from app.schemas.galaxy_source import (
    GalaxySourceCreate,
    GalaxySourceUpdate,
    GalaxySourceResponse,
    GalaxySourceListResponse,
    GalaxySourceReorderRequest,
    GalaxySourceTestResponse,
    GalaxySourceTestRequest,
)
from app.services.galaxy_source_service import GalaxySourceService
from app.utils.encryption import decrypt_token, mask_token

router = APIRouter(prefix="/galaxy-sources", tags=["Galaxy Sources"])


def _build_response(source) -> GalaxySourceResponse:
    """Build a GalaxySourceResponse from a GalaxySource model."""
    token_decrypted = None
    if source.token_encrypted:
        try:
            token_decrypted = decrypt_token(source.token_encrypted)
        except Exception:
            pass

    return GalaxySourceResponse(
        id=source.id,
        name=source.name,
        source_type=source.source_type,
        url=source.url,
        description=source.description,
        is_active=source.is_active,
        priority=source.priority,
        has_token=bool(source.token_encrypted),
        token_masked=mask_token(token_decrypted) if token_decrypted else None,
        last_test_at=source.last_test_at,
        last_test_status=source.last_test_status,
        created_at=source.created_at,
        updated_at=source.updated_at,
        created_by=source.created_by,
    )


@router.get("/admin", response_model=GalaxySourceListResponse)
async def admin_get_all_sources(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Get all Galaxy sources (admin only).

    Returns all sources regardless of active status, ordered by priority.
    """
    sources, total = await GalaxySourceService.get_all(db)
    return GalaxySourceListResponse(sources=sources, total=total)


@router.post("/admin", response_model=GalaxySourceResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_source(
    data: GalaxySourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Create a new Galaxy source (admin only).

    For private sources, a token is required.
    """
    try:
        source = await GalaxySourceService.create(db, data, current_user.id)
        return _build_response(source)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/admin/{source_id}", response_model=GalaxySourceResponse)
async def admin_update_source(
    source_id: str,
    data: GalaxySourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Update a Galaxy source (admin only).

    Only provided fields are updated. To update the token, provide a new value.
    Omit the token field to keep the existing token.
    """
    try:
        source = await GalaxySourceService.update(db, source_id, data, current_user.id)
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Galaxy source not found"
            )
        return _build_response(source)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/admin/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_source(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Delete a Galaxy source (admin only).

    Cannot delete the last active public source.
    """
    try:
        deleted = await GalaxySourceService.delete(db, source_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Galaxy source not found"
            )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/admin/{source_id}/toggle", response_model=GalaxySourceResponse)
async def admin_toggle_source(
    source_id: str,
    is_active: bool = Query(..., description="New active status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Toggle active status of a Galaxy source (admin only).

    Cannot deactivate the last active source.
    """
    try:
        source = await GalaxySourceService.toggle_active(
            db, source_id, is_active, current_user.id
        )
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Galaxy source not found"
            )
        return _build_response(source)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/admin/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def admin_reorder_sources(
    data: GalaxySourceReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Reorder Galaxy sources by priority (admin only).

    Pass a list of source IDs in the desired order.
    Sources will be assigned priorities 10, 20, 30, etc.
    """
    await GalaxySourceService.reorder(db, data.source_ids, current_user.id)


@router.post("/admin/{source_id}/test", response_model=GalaxySourceTestResponse)
async def admin_test_source(
    source_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    """
    Test connection to an existing Galaxy source (admin only).

    Updates the source's last_test_at and last_test_status fields.
    """
    result = await GalaxySourceService.test_source_by_id(db, source_id)
    if "not found" in result.message.lower():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result.message
        )
    return result


@router.post("/admin/test-connection", response_model=GalaxySourceTestResponse)
async def admin_test_connection(
    data: GalaxySourceTestRequest,
    current_user: User = Depends(get_current_admin),
):
    """
    Test connection to a Galaxy source before saving (admin only).

    Useful for validating connection settings before creating a source.
    """
    return await GalaxySourceService.test_connection(
        data.url, data.token, data.source_type
    )
