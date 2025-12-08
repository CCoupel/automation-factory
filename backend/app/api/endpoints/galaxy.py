"""
Galaxy API endpoints - Simplified structure based on Galaxy API
"""

from fastapi import APIRouter, HTTPException, Query, Path
from typing import Dict, Any, Optional
import logging
import asyncio

from app.services.galaxy_service_optimized import optimized_galaxy_service
from app.services.cache_service import cache
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/galaxy", tags=["galaxy"])


@router.get("/namespaces")
async def get_namespaces(
    limit: Optional[int] = Query(None, description="Limit number of namespaces returned"),
    use_cache: bool = Query(True, description="Use cached data if available"),
    discover_all: bool = Query(False, description="Trigger full discovery of all namespaces")
) -> Dict[str, Any]:
    """
    Get list of Ansible namespaces with collection counts
    TEMPORAIREMENT DÉSACTIVÉ pour éviter les appels Galaxy API
    """
    try:
        logger.warning("Namespaces endpoint called but returning mock data to avoid Galaxy API calls")
        
        # Retourner des données mockées pour éviter les appels Galaxy API
        mock_namespaces = [
            {"name": "community", "collection_count": 52, "total_downloads": 185625429},
            {"name": "ansible", "collection_count": 18, "total_downloads": 3766323},
            {"name": "cisco", "collection_count": 15, "total_downloads": 1250000},
            {"name": "redhat", "collection_count": 8, "total_downloads": 500000},
            {"name": "microsoft", "collection_count": 12, "total_downloads": 800000}
        ]
        
        # Apply limit if requested
        if limit and limit > 0:
            limited_namespaces = mock_namespaces[:limit]
        else:
            limited_namespaces = mock_namespaces
        
        result = {
            "namespaces": limited_namespaces,
            "total_namespaces": len(limited_namespaces),
            "returned_count": len(limited_namespaces),
            "status": "disabled-mock",
            "message": "Galaxy sync disabled to avoid rate limits"
        }
        
        logger.info(f"Returned {len(limited_namespaces)} mock namespaces")
        return result
        
    except Exception as e:
        logger.error(f"Error in get_namespaces: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch namespaces: {str(e)}")


@router.get("/namespaces/{namespace}/collections")
async def get_collections(
    namespace: str = Path(..., description="Namespace name")
) -> Dict[str, Any]:
    """
    Get ALL collections for a specific namespace
    Backend handles pagination to fetch complete dataset
    
    Args:
        namespace: Namespace name (e.g., "community", "ansible")
        
    Returns:
        Dictionary with ALL collections in the namespace
    """
    try:
        logger.info(f"Fetching ALL collections for namespace: {namespace}")
        result = await optimized_galaxy_service.get_all_collections(namespace)
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
    collection: str = Path(..., description="Collection name")
) -> Dict[str, Any]:
    """
    Get ALL versions for a specific collection
    Backend handles pagination to fetch complete dataset
    
    Args:
        namespace: Namespace name (e.g., "community")
        collection: Collection name (e.g., "general")
        
    Returns:
        Dictionary with ALL versions of the collection
    """
    try:
        logger.info(f"Fetching ALL versions for {namespace}.{collection}")
        result = await optimized_galaxy_service.get_versions(namespace, collection)
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
        result = await optimized_galaxy_service.get_modules(namespace, collection, version)
        
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
    q: str = Query(..., min_length=1, description="Search query")
) -> Dict[str, Any]:
    """
    Search collections across ALL namespaces
    Comprehensive search without pagination limits
    
    Args:
        q: Search query (collection name, namespace, or description keywords)
        
    Returns:
        Dictionary with all matching search results
    """
    try:
        logger.info(f"Searching ALL collections for: {q}")
        
        # Get comprehensive namespace list
        namespaces_result = await optimized_galaxy_service.get_all_namespaces()
        
        matching_collections = []
        query_lower = q.lower()
        
        # Search in ALL discovered namespaces (comprehensive search)
        for namespace_info in namespaces_result.get("namespaces", [])[:20]:  # Top 20 for performance
            namespace = namespace_info["name"]
            
            # Skip if query doesn't match namespace
            if query_lower not in namespace.lower():
                collections_result = await optimized_galaxy_service.get_all_collections(namespace)
                
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
                collections_result = await optimized_galaxy_service.get_all_collections(namespace)
                for collection in collections_result.get("collections", []):
                    matching_collections.append({
                        **collection,
                        "full_name": f"{namespace}.{collection.get('name', '')}",
                        "relevance_score": 2  # Higher score for namespace match
                    })
        
        # Sort by relevance score (no limit - return all results)
        matching_collections.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        
        return {
            "query": q,
            "total_matches": len(matching_collections),
            "returned_count": len(matching_collections),
            "collections": matching_collections
        }
        
    except Exception as e:
        logger.error(f"Error searching collections: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to search collections: {str(e)}"
        )


@router.get("/namespaces/stream")
async def stream_namespaces():
    """
    Stream namespaces progressively: popular first, then discovered by batches
    """
    from app.services.galaxy_service_hybrid import hybrid_galaxy_service
    
    async def generate():
        async for chunk in hybrid_galaxy_service.stream_namespaces_progressive():
            yield chunk
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )


@router.post("/preload")
async def preload_popular_data(
    namespaces_count: int = Query(10, description="Number of top namespaces to preload"),
    collections: bool = Query(True, description="Preload collections for top namespaces")
) -> Dict[str, Any]:
    """
    Preload popular namespaces and their collections for faster access
    TEMPORAIREMENT DÉSACTIVÉ pour éviter les appels Galaxy API
    """
    try:
        logger.warning("Preload endpoint called but returning empty data to avoid Galaxy API calls")
        
        # Retourner des données vides pour éviter les appels Galaxy API
        return {
            "status": "disabled",
            "message": "Preload disabled to avoid rate limits",
            "results": {
                "namespaces": {
                    "status": "disabled",
                    "count": 0
                },
                "collections": {
                    "status": "disabled",
                    "namespaces_processed": 0,
                    "total_collections": 0
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error in preload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to preload: {str(e)}")


@router.post("/preload-cache")
async def preload_cache(
    namespaces_limit: int = Query(20, description="Number of namespaces to preload")
) -> Dict[str, Any]:
    """
    Preload Galaxy data into cache for faster subsequent access
    
    Args:
        namespaces_limit: Number of top namespaces to preload collections for
    
    Returns:
        Status of preload operation
    """
    try:
        logger.info(f"Starting cache preload for top {namespaces_limit} namespaces")
        
        # Step 1: Load all namespaces
        namespaces_result = await optimized_galaxy_service.get_all_namespaces()
        namespaces = namespaces_result.get('namespaces', [])
        total_namespaces = len(namespaces)
        
        # Step 2: Load collections for top namespaces in parallel
        top_namespaces = namespaces[:namespaces_limit]
        collection_tasks = []
        
        for ns in top_namespaces:
            task = optimized_galaxy_service.get_all_collections(ns['name'])
            collection_tasks.append(task)
        
        # Execute collection fetches in parallel
        collection_results = await asyncio.gather(*collection_tasks, return_exceptions=True)
        
        # Count successful loads
        successful_collections = 0
        total_collections = 0
        
        for result in collection_results:
            if isinstance(result, dict) and 'collections' in result:
                collections = result.get('collections', [])
                successful_collections += 1
                total_collections += len(collections)
        
        return {
            "status": "success",
            "message": f"Cache preloaded successfully",
            "stats": {
                "namespaces_loaded": total_namespaces,
                "collections_namespaces_loaded": successful_collections,
                "total_collections_cached": total_collections,
                "cache_ttl_minutes": 60
            }
        }
        
    except Exception as e:
        logger.error(f"Error preloading cache: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to preload cache: {str(e)}")


@router.get("/cache/stats")
async def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics
    """
    return {
        "status": "success",
        "cache_stats": cache.get_stats()
    }


@router.delete("/cache")
async def clear_cache(
    pattern: Optional[str] = Query(None, description="Pattern to match keys (e.g., 'collections:*')")
) -> Dict[str, Any]:
    """
    Clear cache entries
    
    Args:
        pattern: Optional pattern to match specific keys. If not provided, clears all cache.
    """
    if pattern:
        deleted_count = cache.delete_pattern(pattern)
        return {
            "status": "success",
            "message": f"Deleted {deleted_count} cache entries matching pattern '{pattern}'"
        }
    else:
        cache.clear()
        return {
            "status": "success",
            "message": "All cache entries cleared"
        }


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
            "GET /api/galaxy/search?q={query}",
            "POST /api/galaxy/preload-cache"
        ],
        "example_usage": {
            "namespaces": "/api/galaxy/namespaces",
            "community_collections": "/api/galaxy/namespaces/community/collections",
            "general_versions": "/api/galaxy/namespaces/community/collections/general/versions",
            "modules": "/api/galaxy/namespaces/community/collections/general/versions/9.5.0/modules",
            "search": "/api/galaxy/search?q=docker",
            "preload": "POST /api/galaxy/preload-cache?namespaces_limit=20"
        }
    }