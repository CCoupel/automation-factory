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
    popular_only: bool = Query(False, description="Return only popular namespaces"),
    use_cache: bool = Query(True, description="Use cached data if available")
) -> Dict[str, Any]:
    """
    Get list of Ansible namespaces with collection counts
    RÉACTIVÉ avec service SMART optimisé
    """
    try:
        from app.services.galaxy_service_smart import smart_galaxy_service
        
        logger.info(f"Fetching namespaces (popular_only={popular_only}, limit={limit})")
        
        # Récupérer depuis cache smart
        cached_namespaces = smart_galaxy_service.get_cached_namespaces(popular_only=popular_only)
        
        # Si pas de cache, retourner tableau vide (évite les données fallback qui causent les doublons)
        if not cached_namespaces:
            logger.warning("No cached namespaces found, returning empty list")
            cached_namespaces = []
        
        # Apply limit if requested
        if limit and limit > 0:
            limited_namespaces = cached_namespaces[:limit]
        else:
            limited_namespaces = cached_namespaces
        
        # Get sync status
        sync_status = smart_galaxy_service.get_sync_status()
        
        result = {
            "namespaces": limited_namespaces,
            "total_namespaces": len(cached_namespaces),
            "returned_count": len(limited_namespaces),
            "status": "smart-cached",
            "sync_info": {
                "last_sync": sync_status.get("last_sync"),
                "method": sync_status.get("method"),
                "api_calls": sync_status.get("stats", {}).get("api_calls", 0)
            }
        }
        
        logger.info(f"Returned {len(limited_namespaces)} namespaces from SMART cache")
        return result
        
    except Exception as e:
        logger.error(f"Error in get_namespaces: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch namespaces: {str(e)}")


@router.get("/smart/status")
async def get_smart_sync_status() -> Dict[str, Any]:
    """
    Get SMART Galaxy sync status and statistics
    """
    try:
        from app.services.galaxy_service_smart import smart_galaxy_service
        
        sync_status = smart_galaxy_service.get_sync_status()
        cached_popular = smart_galaxy_service.get_cached_namespaces(popular_only=True)
        cached_all = smart_galaxy_service.get_cached_namespaces(popular_only=False)
        
        return {
            "sync_status": sync_status,
            "cache_info": {
                "popular_namespaces": len(cached_popular),
                "all_namespaces": len(cached_all),
                "has_data": len(cached_all) > 0
            },
            "service": "galaxy_service_smart",
            "api_approach": "direct_namespaces_api"
        }
        
    except Exception as e:
        logger.error(f"Error getting smart status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")


@router.post("/smart/resync")
async def trigger_smart_resync() -> Dict[str, Any]:
    """
    Trigger a fresh SMART sync manually
    """
    try:
        from app.services.galaxy_service_smart import smart_galaxy_service
        
        logger.info("Manual SMART resync triggered")
        result = await smart_galaxy_service.startup_sync_smart()
        
        # Démarrer l'enrichissement en arrière-plan après le sync
        asyncio.create_task(smart_galaxy_service.background_enrich_all_namespaces())
        
        return {
            "message": "SMART resync completed, background enrichment started",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Error during smart resync: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to resync: {str(e)}")


@router.post("/namespaces/{namespace}/enrich")
async def enrich_namespace_on_demand(
    namespace: str = Path(..., description="Namespace name to enrich")
) -> Dict[str, Any]:
    """
    Enrichir un namespace spécifique à la demande
    Utilisé quand l'utilisateur sélectionne un namespace sans stats
    """
    try:
        from app.services.galaxy_service_smart import smart_galaxy_service
        
        logger.info(f"On-demand enrichment requested for: {namespace}")
        enriched_namespace = await smart_galaxy_service.enrich_namespace_on_demand(namespace)
        
        return {
            "message": f"Namespace {namespace} enriched successfully",
            "namespace": enriched_namespace
        }
        
    except Exception as e:
        logger.error(f"Error enriching namespace {namespace}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to enrich namespace {namespace}: {str(e)}")


@router.post("/background-enrich")
async def trigger_background_enrichment() -> Dict[str, Any]:
    """
    Déclencher l'enrichissement en arrière-plan de tous les namespaces
    """
    try:
        from app.services.galaxy_service_smart import smart_galaxy_service
        
        logger.info("Background enrichment triggered manually")
        
        # Démarrer la tâche en arrière-plan
        asyncio.create_task(smart_galaxy_service.background_enrich_all_namespaces())
        
        return {
            "message": "Background enrichment started",
            "status": "running"
        }
        
    except Exception as e:
        logger.error(f"Error starting background enrichment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start background enrichment: {str(e)}")


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


@router.get("/namespaces/{namespace}/collections/{collection}/versions/{version}/docs-blob")
async def get_collection_docs_blob(
    namespace: str = Path(..., description="Namespace name"),
    collection: str = Path(..., description="Collection name"),
    version: str = Path(..., description="Collection version")
) -> Dict[str, Any]:
    """
    Get documentation blob for a specific collection version
    Contains detailed module schemas and parameters
    """
    try:
        import httpx
        
        logger.info(f"Fetching docs-blob for {namespace}.{collection}:{version}")
        
        # Check cache first
        cache_key = f"docs_blob:{namespace}:{collection}:{version}"
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.info(f"Returning cached docs-blob for {namespace}.{collection}:{version}")
            return cached_result
        
        # Fetch from Galaxy API
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            url = f"https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/{namespace}/{collection}/versions/{version}/docs-blob/"
            
            logger.debug(f"Requesting Galaxy docs-blob URL: {url}")
            response = await client.get(url)
            response.raise_for_status()
            
            docs_data = response.json()
            
            # Extract modules count for logging
            modules_count = 0
            if "docs_blob" in docs_data and "contents" in docs_data["docs_blob"]:
                modules_count = len([
                    content for content in docs_data["docs_blob"]["contents"]
                    if content.get("content_type") == "module"
                ])
            
            result = {
                "namespace": namespace,
                "collection": collection, 
                "version": version,
                "docs_blob": docs_data.get("docs_blob", {}),
                "modules_count": modules_count,
                "total_content": len(docs_data.get("docs_blob", {}).get("contents", [])),
                "cache_key": cache_key
            }
            
            # Cache for 60 minutes (schemas are stable)
            cache.set(cache_key, result, ttl_seconds=3600)
            
            logger.info(f"Retrieved docs-blob for {namespace}.{collection}:{version} - {modules_count} modules")
            return result
            
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            logger.warning(f"Docs-blob not found for {namespace}.{collection}:{version}")
            raise HTTPException(status_code=404, detail=f"Documentation not found for {namespace}.{collection}:{version}")
        else:
            logger.error(f"HTTP error fetching docs-blob: {e.response.status_code}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Galaxy API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching docs-blob for {namespace}.{collection}:{version}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch documentation: {str(e)}"
        )


@router.get("/namespaces/{namespace}/collections/{collection}/versions/{version}/modules/{module}/schema")
async def get_module_schema(
    namespace: str = Path(..., description="Namespace name"),
    collection: str = Path(..., description="Collection name"),
    version: str = Path(..., description="Collection version"),
    module: str = Path(..., description="Module name")
) -> Dict[str, Any]:
    """
    Get detailed schema for a specific module
    """
    try:
        logger.info(f"Fetching schema for {namespace}.{collection}.{module}:{version}")
        
        # Check module-specific cache first
        cache_key = f"module_schema:{namespace}:{collection}:{version}:{module}"
        cached_result = cache.get(cache_key)
        if cached_result:
            logger.info(f"Returning cached schema for {namespace}.{collection}.{module}")
            return cached_result
        
        # Get the docs-blob first (will use cache if available)
        docs_response = await get_collection_docs_blob(namespace, collection, version)
        
        if "docs_blob" not in docs_response:
            raise HTTPException(status_code=404, detail="Documentation blob not found")
        
        contents = docs_response["docs_blob"].get("contents", [])
        
        # Find the specific module
        module_content = next(
            (content for content in contents 
             if content.get("content_name") == module and content.get("content_type") == "module"),
            None
        )
        
        if not module_content:
            logger.warning(f"Module {module} not found in {namespace}.{collection}:{version}")
            raise HTTPException(status_code=404, detail=f"Module {module} not found in {namespace}.{collection}:{version}")
        
        # Extract and format the schema
        doc_strings = module_content.get("doc_strings", {})
        doc = doc_strings.get("doc", {})
        
        # Transform parameters to our format
        parameters = {}
        options = doc.get("options", {})
        
        # Handle case where options is a list instead of dict
        if isinstance(options, list):
            # Convert list of options to dict format
            options_dict = {}
            for option in options:
                if isinstance(option, dict) and "name" in option:
                    options_dict[option["name"]] = option
            options = options_dict
        elif not isinstance(options, dict):
            options = {}
        
        for param_name, param_data in options.items():
            parameters[param_name] = {
                "name": param_name,
                "type": param_data.get("type", "str"),
                "required": param_data.get("required", False),
                "default": param_data.get("default"),
                "description": " ".join(param_data.get("description", [])) if isinstance(param_data.get("description"), list) else param_data.get("description", ""),
                "choices": param_data.get("choices"),
                "aliases": param_data.get("aliases"),
                "elements": param_data.get("elements"),
                "version_added": param_data.get("version_added"),
                "suboptions": param_data.get("suboptions")
            }
        
        schema = {
            "module_name": module,
            "namespace": namespace,
            "collection": collection,
            "version": version,
            "description": " ".join(doc.get("description", [])) if isinstance(doc.get("description"), list) else doc.get("description", ""),
            "short_description": doc.get("short_description", ""),
            "author": doc.get("author", []),
            "parameters": parameters,
            "examples": doc.get("examples"),
            "notes": doc.get("notes", []),
            "requirements": doc.get("requirements", []),
            "version_added": doc.get("version_added", ""),
            "filename": doc.get("filename", ""),
            "parameter_count": len(parameters),
            "required_parameters": len([p for p in parameters.values() if p["required"]]),
            "optional_parameters": len([p for p in parameters.values() if not p["required"]])
        }
        
        # Cache module schema for 60 minutes
        cache.set(cache_key, schema, ttl_seconds=3600)
        
        logger.info(f"Retrieved schema for {namespace}.{collection}.{module} - {len(parameters)} parameters")
        return schema
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error fetching schema for {namespace}.{collection}.{module}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch module schema: {str(e)}"
        )


@router.get("/modules/{namespace}.{collection}.{module}/schema")
async def get_module_schema_simple(
    namespace: str = Path(..., description="Namespace name"),
    collection: str = Path(..., description="Collection name"),
    module: str = Path(..., description="Module name"),
    version: str = Query("latest", description="Collection version")
) -> Dict[str, Any]:
    """
    Simplified endpoint to get module schema with automatic version resolution
    Format: /api/galaxy/modules/community.general.copy/schema?version=9.5.0
    """
    try:
        # If version is "latest", we need to resolve it first
        if version == "latest":
            logger.info(f"Resolving latest version for {namespace}.{collection}")
            versions_response = await get_versions(namespace, collection)
            versions = versions_response.get("versions", [])
            if not versions:
                raise HTTPException(status_code=404, detail=f"No versions found for {namespace}.{collection}")
            
            # Get the latest version (first in list, as they're sorted by Galaxy)
            latest_version = versions[0].get("version", "")
            if not latest_version:
                raise HTTPException(status_code=404, detail=f"Could not determine latest version for {namespace}.{collection}")
            
            version = latest_version
            logger.info(f"Resolved latest version: {version}")
        
        # Delegate to the full schema endpoint
        return await get_module_schema(namespace, collection, version, module)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in simplified schema endpoint for {namespace}.{collection}.{module}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch module schema: {str(e)}"
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
            "GET /api/galaxy/namespaces/{namespace}/collections/{collection}/versions/{version}/docs-blob",
            "GET /api/galaxy/namespaces/{namespace}/collections/{collection}/versions/{version}/modules/{module}/schema",
            "GET /api/galaxy/modules/{namespace}.{collection}.{module}/schema",
            "GET /api/galaxy/search?q={query}",
            "POST /api/galaxy/preload-cache"
        ],
        "example_usage": {
            "namespaces": "/api/galaxy/namespaces",
            "community_collections": "/api/galaxy/namespaces/community/collections",
            "general_versions": "/api/galaxy/namespaces/community/collections/general/versions",
            "modules": "/api/galaxy/namespaces/community/collections/general/versions/9.5.0/modules",
            "docs_blob": "/api/galaxy/namespaces/community/collections/general/versions/9.5.0/docs-blob",
            "module_schema": "/api/galaxy/namespaces/community/collections/general/versions/9.5.0/modules/copy/schema",
            "simple_schema": "/api/galaxy/modules/community.general.copy/schema?version=latest",
            "search": "/api/galaxy/search?q=docker",
            "preload": "POST /api/galaxy/preload-cache?namespaces_limit=20"
        }
    }