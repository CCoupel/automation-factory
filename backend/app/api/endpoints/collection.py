"""
Collection/Requirements management endpoints

Provides endpoints to parse, generate, and search for Ansible collections
and role requirements (requirements.yml).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.collection import (
    CollectionSearchResult,
    RequirementsData,
    RequirementsGenerateResponse,
    RequirementsParseRequest,
    RequirementsParseResponse,
)
from app.services.collection_service import collection_service
from app.services.galaxy_roles_service import galaxy_roles_service
from app.services.project_access_service import check_project_access

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["Collections"])


@router.post(
    "/{project_id}/collections/parse",
    response_model=RequirementsParseResponse,
)
async def parse_requirements(
    project_id: str,
    request: RequirementsParseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Parse a requirements.yml string into structured collections + roles data.
    Requires at least viewer access.
    """
    await check_project_access(project_id, current_user.id, db, required_role="viewer")

    try:
        data, warnings = collection_service.parse(request.raw_content)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return RequirementsParseResponse(data=data, warnings=warnings)


@router.post(
    "/{project_id}/collections/generate",
    response_model=RequirementsGenerateResponse,
)
async def generate_requirements(
    project_id: str,
    data: RequirementsData,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate requirements.yml YAML from structured data.
    Requires at least editor access.
    """
    await check_project_access(project_id, current_user.id, db, required_role="editor")

    # Validate before generating
    errors = collection_service.validate(data)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation errors: {'; '.join(errors)}",
        )

    yaml_content = collection_service.generate(data)
    return RequirementsGenerateResponse(yaml_content=yaml_content)


@router.get(
    "/{project_id}/collections/search",
    response_model=list[CollectionSearchResult],
)
async def search_collections(
    project_id: str,
    query: str = Query(..., min_length=1),
    source: str = Query("public", pattern="^(public|private)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Search Galaxy for collections. Requires at least viewer access.
    """
    await check_project_access(project_id, current_user.id, db, required_role="viewer")

    results = await galaxy_roles_service.search_collections(
        query=query, source=source
    )

    return [
        CollectionSearchResult(
            namespace=r["namespace"],
            name=r["name"],
            fqcn=r["fqcn"],
            version=r["version"],
            description=r["description"],
            download_count=r.get("download_count"),
        )
        for r in results
    ]
