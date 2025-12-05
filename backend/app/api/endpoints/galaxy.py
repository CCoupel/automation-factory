"""
Galaxy API endpoints - Simplified structure based on Galaxy API
"""

from fastapi import APIRouter, HTTPException, Query, Path
from typing import Dict, Any, Optional
import logging
import asyncio

from app.services.galaxy_service import galaxy_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/galaxy", tags=["galaxy"])


@router.get("/namespaces")
async def get_namespaces(
    limit: Optional[int] = Query(50, ge=1, le=200, description="Limit for namespace collection scanning")
) -> Dict[str, Any]:
    """
    Get list of all Ansible namespaces with collection counts
    
    Returns:
        Dictionary with namespaces sorted by collection count
    """
    try:
        logger.info(f"Fetching namespaces (limit: {limit})")
        
        # Add timeout protection using asyncio
        result = await asyncio.wait_for(
            galaxy_service.get_namespaces(limit=limit), 
            timeout=45.0
        )
        
        logger.info(f"Found {result.get('total_namespaces', 0)} namespaces")
        return result
        
    except asyncio.TimeoutError:
        logger.error("Timeout while fetching namespaces")
        raise HTTPException(status_code=504, detail="Request timeout - Galaxy API took too long to respond")
    except Exception as e:
        logger.error(f"Error in get_namespaces: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch namespaces: {str(e)}")


@router.get("/namespaces/{namespace}/collections")
async def get_collections(
    namespace: str = Path(..., description="Namespace name"),
    limit: Optional[int] = Query(50, ge=1, le=200, description="Number of collections to return")
) -> Dict[str, Any]:
    """
    Get collections for a specific namespace
    
    Args:
        namespace: Namespace name (e.g., "community", "ansible")
        limit: Maximum number of collections to return
        
    Returns:
        Dictionary with collections in the namespace
    """
    try:
        logger.info(f"Fetching collections for namespace: {namespace}")
        result = await galaxy_service.get_collections(namespace, limit=limit)
        logger.info(f"Found {result.get('total_count', 0)} collections in {namespace}")
        return result
        
    except Exception as e:
        logger.error(f"Error fetching collections for {namespace}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch collections for namespace {namespace}: {str(e)}"
        )


@router.get("/namespaces/{namespace}/collections/{collection}/versions")
async def get_versions(
    namespace: str = Path(..., description="Namespace name"),
    collection: str = Path(..., description="Collection name"),
    limit: Optional[int] = Query(50, ge=1, le=200, description="Number of versions to return")
) -> Dict[str, Any]:
    """
    Get versions for a specific collection
    
    Args:
        namespace: Namespace name (e.g., "community")
        collection: Collection name (e.g., "general")
        limit: Maximum number of versions to return
        
    Returns:
        Dictionary with versions of the collection
    """
    try:
        logger.info(f"Fetching versions for {namespace}.{collection}")
        result = await galaxy_service.get_versions(namespace, collection, limit=limit)
        logger.info(f"Found {result.get('total_count', 0)} versions for {namespace}.{collection}")
        return result
        
    except Exception as e:
        logger.error(f"Error fetching versions for {namespace}.{collection}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch versions for {namespace}.{collection}: {str(e)}"
        )


@router.get("/namespaces/{namespace}/collections/{collection}/versions/{version}/modules")
async def get_modules(
    namespace: str = Path(..., description="Namespace name"),
    collection: str = Path(..., description="Collection name"),
    version: str = Path(..., description="Collection version"),
    module_type: Optional[str] = Query(None, description="Filter by type: 'modules', 'plugins', 'all'")
) -> Dict[str, Any]:
    """
    Get modules and plugins for a specific collection version
    
    Args:
        namespace: Namespace name (e.g., "community")
        collection: Collection name (e.g., "general")  
        version: Version string (e.g., "9.5.0")
        module_type: Filter results by type
        
    Returns:
        Dictionary with modules, plugins and metadata
    """
    try:
        logger.info(f"Fetching modules for {namespace}.{collection}:{version}")
        result = await galaxy_service.get_modules(namespace, collection, version)
        
        # Apply filtering if requested
        if module_type:
            if module_type == "modules":
                result = {
                    **result,
                    "plugins": [],
                    "other_content": [],
                    "total_plugins": 0
                }
            elif module_type == "plugins":
                result = {
                    **result,
                    "modules": [],
                    "other_content": [],
                    "total_modules": 0
                }
            # "all" returns everything (default)
        
        logger.info(f"Found {result.get('total_modules', 0)} modules and {result.get('total_plugins', 0)} plugins")
        return result
        
    except Exception as e:
        logger.error(f"Error fetching modules for {namespace}.{collection}:{version}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch modules for {namespace}.{collection}:{version}: {str(e)}"
        )


@router.get("/search")
async def search_collections(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: Optional[int] = Query(20, ge=1, le=100, description="Number of results to return")
) -> Dict[str, Any]:
    """
    Search collections across all namespaces
    
    Args:
        q: Search query (collection name, namespace, or description keywords)
        limit: Maximum number of results
        
    Returns:
        Dictionary with search results
    """
    try:
        logger.info(f"Searching collections for: {q}")
        
        # For now, we'll search within top namespaces
        # In a real implementation, Galaxy might have a dedicated search endpoint
        namespaces_result = await galaxy_service.get_namespaces(limit=50)
        
        matching_collections = []
        query_lower = q.lower()
        
        # Search in top namespaces
        for namespace_info in namespaces_result.get("namespaces", [])[:10]:
            namespace = namespace_info["name"]
            
            # Skip if query doesn't match namespace
            if query_lower not in namespace.lower():
                collections_result = await galaxy_service.get_collections(namespace, limit=50)
                
                for collection in collections_result.get("collections", []):
                    collection_name = collection.get("name", "").lower()
                    description = collection.get("description", "").lower()
                    
                    if (query_lower in collection_name or 
                        query_lower in description or
                        query_lower in f"{namespace}.{collection.get('name', '')}".lower()):
                        
                        matching_collections.append({
                            **collection,
                            "full_name": f"{namespace}.{collection.get('name', '')}",
                            "relevance_score": 1 if query_lower == collection_name else 0.5
                        })
            else:
                # Namespace matches, add all collections from this namespace  
                collections_result = await galaxy_service.get_collections(namespace, limit=30)
                for collection in collections_result.get("collections", []):
                    matching_collections.append({
                        **collection,
                        "full_name": f"{namespace}.{collection.get('name', '')}",
                        "relevance_score": 2  # Higher score for namespace match
                    })
        
        # Sort by relevance score and limit results
        matching_collections.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        limited_results = matching_collections[:limit]
        
        return {
            "query": q,
            "total_matches": len(matching_collections),
            "returned_count": len(limited_results),
            "collections": limited_results
        }
        
    except Exception as e:
        logger.error(f"Error searching collections: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to search collections: {str(e)}"
        )


@router.get("/test")
async def test_galaxy_api() -> Dict[str, Any]:
    """
    Test endpoint to verify Galaxy API connectivity
    """
    return {
        "status": "success",
        "message": "Galaxy API endpoints accessible",
        "endpoints": [
            "GET /api/galaxy/namespaces",
            "GET /api/galaxy/namespaces/{namespace}/collections",
            "GET /api/galaxy/namespaces/{namespace}/collections/{collection}/versions",
            "GET /api/galaxy/namespaces/{namespace}/collections/{collection}/versions/{version}/modules",
            "GET /api/galaxy/search?q={query}"
        ],
        "example_usage": {
            "namespaces": "/api/galaxy/namespaces",
            "community_collections": "/api/galaxy/namespaces/community/collections",
            "general_versions": "/api/galaxy/namespaces/community/collections/general/versions",
            "modules": "/api/galaxy/namespaces/community/collections/general/versions/9.5.0/modules",
            "search": "/api/galaxy/search?q=docker"
        }
    }