"""
Galaxy Cache API Endpoints
Provides access to cached Galaxy data for frontends
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
import logging
from app.services.galaxy_cache_service import galaxy_cache_service
from app.services.cache_storage_service import galaxy_cache
from app.services.notification_service import notification_service
from starlette.responses import StreamingResponse

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/cache/status")
async def get_cache_status():
    """
    Get cache synchronization status and statistics
    """
    try:
        cache_summary = galaxy_cache_service.get_cache_summary()
        cache_stats = galaxy_cache.get_stats()
        
        return {
            "sync": cache_summary,
            "cache": cache_stats,
            "timestamp": cache_summary.get("last_sync_time")
        }
    except Exception as e:
        logger.error(f"Failed to get cache status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve cache status")

@router.get("/cache/namespaces")
async def get_all_cached_namespaces(
    popular_only: Optional[bool] = False
) -> Dict[str, Any]:
    """
    Get all cached namespaces
    
    Args:
        popular_only: If true, return only popular namespaces
    """
    try:
        if popular_only:
            namespaces = galaxy_cache_service.get_popular_namespaces()
            return {
                "namespaces": namespaces,
                "total_namespaces": len(namespaces),
                "type": "popular",
                "cached": True
            }
        else:
            namespaces = galaxy_cache_service.get_all_namespaces()
            return {
                "namespaces": namespaces,
                "total_namespaces": len(namespaces), 
                "type": "all",
                "cached": True
            }
    except Exception as e:
        logger.error(f"Failed to get cached namespaces: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve cached namespaces")

@router.get("/cache/namespaces/{namespace}/collections")
async def get_cached_namespace_collections(namespace: str) -> Dict[str, Any]:
    """
    Get cached collections for a specific namespace
    """
    try:
        collections = galaxy_cache_service.get_cached_namespace_collections(namespace)
        
        return {
            "namespace": namespace,
            "collections": collections,
            "total_collections": len(collections),
            "cached": True
        }
    except Exception as e:
        logger.error(f"Failed to get cached collections for namespace '{namespace}': {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve cached collections for namespace '{namespace}'"
        )

@router.get("/cache/collections/{namespace}.{collection}/versions/{version}/modules")
async def get_cached_collection_modules(
    namespace: str, 
    collection: str, 
    version: str
) -> Dict[str, Any]:
    """
    Get cached modules for a specific collection version
    """
    try:
        modules = galaxy_cache_service.get_cached_collection_modules(namespace, collection, version)
        
        # Separate modules and plugins
        modules_list = []
        plugins_list = []
        
        for module in modules:
            content_type = module.get("content_type", "module")
            if content_type == "module":
                modules_list.append(module)
            else:
                plugins_list.append(module)
        
        return {
            "namespace": namespace,
            "collection": collection,
            "version": version,
            "modules": modules_list,
            "plugins": plugins_list,
            "total_modules": len(modules_list),
            "total_plugins": len(plugins_list),
            "cached": True
        }
    except Exception as e:
        logger.error(f"Failed to get cached modules for {namespace}.{collection}:{version}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve cached modules for {namespace}.{collection}:{version}"
        )

@router.get("/cache/all")
async def get_all_cached_data() -> Dict[str, Any]:
    """
    Get all cached Galaxy data in one request
    Optimized for frontend startup
    TEMPORAIREMENT DÉSACTIVÉ pour éviter les appels Galaxy API
    """
    try:
        logger.warning("Cache/all endpoint called but returning empty data to avoid Galaxy API calls")
        
        # Retourner des données vides pour éviter les appels Galaxy API
        return {
            "popular_namespaces": [],
            "all_namespaces": [],
            "collections_sample": {},
            "cache_info": {
                "sync_status": "disabled",
                "last_sync": None,
                "stats": {}
            },
            "cached": False,
            "timestamp": None,
            "message": "Galaxy sync disabled to avoid rate limits"
        }
    except Exception as e:
        logger.error(f"Failed to get all cached data: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve cached data")

@router.post("/cache/refresh")
async def refresh_cache():
    """
    Force refresh of Galaxy cache
    This will trigger a new synchronization
    """
    try:
        logger.info("🔄 Manual cache refresh requested")
        
        # Clear existing cache
        galaxy_cache_service.clear_cache()
        
        # Start new sync (in background)
        import asyncio
        asyncio.create_task(galaxy_cache_service.startup_full_sync())
        
        return {
            "message": "Cache refresh initiated",
            "status": "started",
            "note": "Synchronization is running in background"
        }
    except Exception as e:
        logger.error(f"Failed to refresh cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh cache")

@router.delete("/cache")
async def clear_cache():
    """
    Clear all cached Galaxy data
    """
    try:
        galaxy_cache_service.clear_cache()
        return {
            "message": "Cache cleared successfully",
            "status": "cleared"
        }
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear cache")

@router.get("/cache/debug")
async def get_cache_debug_info():
    """
    Get detailed cache information for debugging
    """
    try:
        cache_stats = galaxy_cache.get_stats()
        cache_summary = galaxy_cache_service.get_cache_summary()
        notification_status = notification_service.get_status()
        
        # Sample of cached keys (first 20)
        sample_data = {}
        try:
            popular = galaxy_cache_service.get_popular_namespaces()
            sample_data["popular_namespaces_sample"] = popular[:3] if popular else []
            
            all_ns = galaxy_cache_service.get_all_namespaces() 
            sample_data["all_namespaces_count"] = len(all_ns)
            sample_data["all_namespaces_sample"] = all_ns[:3] if all_ns else []
            
        except Exception as e:
            sample_data["error"] = str(e)
        
        return {
            "cache_storage": cache_stats,
            "sync_service": cache_summary,
            "notification_service": notification_status,
            "sample_data": sample_data,
            "debug_info": {
                "quick_mode": galaxy_cache_service.quick_mode,
                "sync_status": galaxy_cache_service.sync_status
            }
        }
    except Exception as e:
        logger.error(f"Failed to get debug info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get debug info")

@router.get("/cache/notifications")
async def get_cache_notifications():
    """
    Server-Sent Events stream for cache notifications
    Notifies frontends when cache data is updated
    """
    try:
        # Add new SSE connection
        connection_queue = await notification_service.add_connection()
        
        # Return SSE stream
        return StreamingResponse(
            notification_service.get_event_stream(connection_queue),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control"
            }
        )
    except Exception as e:
        logger.error(f"Failed to create SSE stream: {e}")
        raise HTTPException(status_code=500, detail="Failed to create notification stream")