"""
Collections API endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
import logging

from app.services.collections_service import collections_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("/test")
async def test_collections() -> Dict[str, Any]:
    """
    Test endpoint to verify collections API is working
    """
    return {
        "status": "success",
        "message": "Collections API is accessible",
        "endpoints": [
            "/api/collections/{ansible_version}",
            "/api/collections/{ansible_version}/namespaces", 
            "/api/collections/{ansible_version}/search?q={query}",
            "/api/collections/test"
        ],
        "version": "1.3.10_2"
    }


@router.get("/mock/{ansible_version}")
async def get_mock_collections(ansible_version: str) -> Dict[str, Any]:
    """
    Mock endpoint with sample collections data (no external API calls)
    """
    mock_collections = [
        {
            "namespace": "community",
            "name": "general",
            "full_name": "community.general",
            "version": "9.3.0", 
            "download_count": 125000,
            "source": "mock"
        },
        {
            "namespace": "ansible", 
            "name": "builtin",
            "full_name": "ansible.builtin",
            "version": ansible_version,
            "download_count": 50000,
            "source": "mock"
        },
        {
            "namespace": "cisco",
            "name": "ios",
            "full_name": "cisco.ios",
            "version": "8.0.0",
            "download_count": 25000,
            "source": "mock"
        }
    ]
    
    return {
        "ansible_version": ansible_version,
        "total_available": len(mock_collections),
        "returned_count": len(mock_collections),
        "collections": mock_collections,
        "metadata": {
            "source": "mock_data",
            "note": "This is mock data for testing"
        }
    }


@router.get("/{ansible_version}")
async def get_collections(
    ansible_version: str,
    limit: Optional[int] = Query(100, ge=1, le=1000, description="Number of collections to return"),
    popular_only: Optional[bool] = Query(False, description="Return only popular collections (top downloads)")
) -> Dict[str, Any]:
    """
    Get Ansible collections for a specific version
    
    Args:
        ansible_version: Ansible version (e.g., "2.10", "2.11", "latest")
        limit: Maximum number of collections to return
        popular_only: If True, return only collections with significant downloads
        
    Returns:
        Dictionary with collections data and metadata
    """
    try:
        logger.info(f"Fetching collections for Ansible version: {ansible_version}")
        
        # Fetch collections from service
        collections = await collections_service.get_collections_for_version(ansible_version)
        
        if popular_only:
            # Filter collections with at least 10 downloads
            collections = [c for c in collections if c.get("download_count", 0) >= 10]
        
        # Apply limit
        limited_collections = collections[:limit]
        
        # Prepare response
        response = {
            "ansible_version": ansible_version,
            "total_available": len(collections),
            "returned_count": len(limited_collections),
            "collections": limited_collections,
            "metadata": {
                "limit": limit,
                "popular_only": popular_only,
                "sources_tried": ["galaxy_api", f"docs_{ansible_version}"],
                "top_namespaces": _get_top_namespaces(limited_collections)
            }
        }
        
        logger.info(f"Returning {len(limited_collections)} collections for version {ansible_version}")
        return response
        
    except Exception as e:
        logger.error(f"Error fetching collections for version {ansible_version}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch collections for Ansible {ansible_version}: {str(e)}"
        )


@router.get("/{ansible_version}/namespaces")
async def get_namespaces(ansible_version: str) -> Dict[str, Any]:
    """
    Get available namespaces for a specific Ansible version
    
    Args:
        ansible_version: Ansible version (e.g., "2.10", "2.11", "latest")
        
    Returns:
        Dictionary with namespaces and their collection counts
    """
    try:
        logger.info(f"Fetching namespaces for Ansible version: {ansible_version}")
        
        # Fetch all collections
        collections = await collections_service.get_collections_for_version(ansible_version)
        
        # Group by namespace
        namespaces = {}
        for collection in collections:
            namespace = collection.get("namespace", "")
            if namespace not in namespaces:
                namespaces[namespace] = {
                    "name": namespace,
                    "collection_count": 0,
                    "total_downloads": 0,
                    "collections": []
                }
            
            namespaces[namespace]["collection_count"] += 1
            namespaces[namespace]["total_downloads"] += collection.get("download_count", 0)
            namespaces[namespace]["collections"].append(collection["name"])
        
        # Sort by total downloads
        sorted_namespaces = sorted(
            namespaces.values(), 
            key=lambda x: x["total_downloads"], 
            reverse=True
        )
        
        return {
            "ansible_version": ansible_version,
            "total_namespaces": len(sorted_namespaces),
            "namespaces": sorted_namespaces[:50]  # Top 50 namespaces
        }
        
    except Exception as e:
        logger.error(f"Error fetching namespaces for version {ansible_version}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch namespaces for Ansible {ansible_version}: {str(e)}"
        )


@router.get("/{ansible_version}/search")
async def search_collections(
    ansible_version: str,
    q: str = Query(..., min_length=1, description="Search query"),
    limit: Optional[int] = Query(50, ge=1, le=200, description="Number of results to return")
) -> Dict[str, Any]:
    """
    Search collections by name or namespace
    
    Args:
        ansible_version: Ansible version
        q: Search query
        limit: Maximum number of results
        
    Returns:
        Dictionary with search results
    """
    try:
        logger.info(f"Searching collections for '{q}' in Ansible {ansible_version}")
        
        # Fetch all collections
        collections = await collections_service.get_collections_for_version(ansible_version)
        
        # Filter collections matching the query
        query_lower = q.lower()
        matching_collections = []
        
        for collection in collections:
            full_name = collection.get("full_name", "").lower()
            namespace = collection.get("namespace", "").lower()
            name = collection.get("name", "").lower()
            
            if (query_lower in full_name or 
                query_lower in namespace or 
                query_lower in name):
                matching_collections.append(collection)
        
        # Sort by relevance (exact matches first, then by download count)
        def relevance_score(col):
            full_name = col.get("full_name", "").lower()
            if full_name == query_lower:
                return (3, col.get("download_count", 0))
            elif full_name.startswith(query_lower):
                return (2, col.get("download_count", 0))
            else:
                return (1, col.get("download_count", 0))
        
        matching_collections.sort(key=relevance_score, reverse=True)
        
        # Apply limit
        limited_results = matching_collections[:limit]
        
        return {
            "ansible_version": ansible_version,
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


def _get_top_namespaces(collections: List[Dict[str, Any]], top_n: int = 10) -> List[Dict[str, Any]]:
    """Get top namespaces by collection count"""
    namespaces = {}
    
    for collection in collections:
        namespace = collection.get("namespace", "")
        if namespace not in namespaces:
            namespaces[namespace] = {"name": namespace, "count": 0}
        namespaces[namespace]["count"] += 1
    
    sorted_namespaces = sorted(
        namespaces.values(), 
        key=lambda x: x["count"], 
        reverse=True
    )
    
    return sorted_namespaces[:top_n]