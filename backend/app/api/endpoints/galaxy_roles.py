"""
Galaxy Roles API Endpoints

Provides endpoints for fetching Ansible roles from Galaxy:
- API v1: Standalone/legacy roles
- API v3: Collection roles
- Configuration: Galaxy source settings
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, List, Any, Optional
from app.services.galaxy_roles_service import galaxy_roles_service

router = APIRouter(prefix="/galaxy-roles", tags=["Galaxy Roles"])


# ========================================
# Standalone Roles (API v1)
# ========================================

@router.get("/standalone")
async def list_standalone_roles(
    search: str = Query("", description="Search query"),
    namespace: str = Query("", description="Filter by author/namespace"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Results per page"),
    source: str = Query("public", description="Galaxy source: public or private"),
    order_by: str = Query("-download_count", description="Sort field")
) -> Dict[str, Any]:
    """
    List standalone roles from Galaxy v1 API

    Returns paginated list of standalone roles (author.role_name format)
    """
    return await galaxy_roles_service.get_standalone_roles(
        search=search,
        namespace=namespace,
        page=page,
        page_size=page_size,
        source=source,
        order_by=order_by
    )


@router.get("/standalone/namespaces")
async def list_popular_namespaces(
    source: str = Query("public", description="Galaxy source: public or private"),
    limit: int = Query(20, ge=1, le=100, description="Number of namespaces to return")
) -> List[Dict[str, Any]]:
    """
    Get list of popular role authors/namespaces

    Returns namespaces sorted by total downloads
    """
    return await galaxy_roles_service.get_popular_namespaces(
        source=source,
        limit=limit
    )


@router.get("/standalone/{namespace}/{name}")
async def get_standalone_role(
    namespace: str,
    name: str,
    source: str = Query("public", description="Galaxy source: public or private")
) -> Dict[str, Any]:
    """
    Get details for a specific standalone role

    Args:
        namespace: Author/namespace name (e.g., "geerlingguy")
        name: Role name (e.g., "docker")
    """
    role = await galaxy_roles_service.get_standalone_role_details(
        namespace=namespace,
        name=name,
        source=source
    )
    if not role:
        raise HTTPException(
            status_code=404,
            detail=f"Role {namespace}.{name} not found"
        )
    return role


# ========================================
# Collection Roles (API v3)
# ========================================

@router.get("/collections/{namespace}/{collection}/roles")
async def list_collection_roles(
    namespace: str,
    collection: str,
    version: str = Query("latest", description="Collection version or 'latest'"),
    source: str = Query("public", description="Galaxy source: public or private")
) -> List[Dict[str, Any]]:
    """
    List roles in a collection via Galaxy v3 API

    Args:
        namespace: Collection namespace (e.g., "community")
        collection: Collection name (e.g., "general")
    """
    return await galaxy_roles_service.get_collection_roles(
        namespace=namespace,
        collection=collection,
        version=version,
        source=source
    )


@router.get("/collections/search")
async def search_collection_roles(
    query: str = Query(..., min_length=2, description="Search query"),
    source: str = Query("public", description="Galaxy source: public or private"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results")
) -> List[Dict[str, Any]]:
    """
    Search for roles across collections

    Note: Searches collections and returns roles found within them
    """
    return await galaxy_roles_service.search_collection_roles(
        query=query,
        source=source,
        limit=limit
    )


# ========================================
# Configuration
# ========================================

@router.get("/config")
async def get_galaxy_config() -> Dict[str, Any]:
    """
    Get Galaxy configuration

    Returns configured Galaxy URLs and preferred source.
    Token is never exposed.
    """
    return galaxy_roles_service.get_config()
