"""
Galaxy service for retrieving Ansible collections data from Galaxy API
"""

import asyncio
import httpx
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class GalaxyService:
    """Service for retrieving data from Ansible Galaxy API"""
    
    def __init__(self):
        self.galaxy_base_url = "https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index"
        
    async def get_namespaces(self, limit: int = 100) -> Dict[str, Any]:
        """
        Get list of all namespaces with collection counts
        """
        try:
            namespaces = {}
            offset = 0
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                # First, try to get just the first page to see if API is accessible
                url = f"{self.galaxy_base_url}/?limit=50&offset=0"
                logger.info(f"Testing Galaxy API connection to: {url}")
                
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                batch = data.get("data", [])
                
                if not batch:
                    logger.warning("No data returned from Galaxy API")
                    return {"namespaces": [], "total_namespaces": 0, "error": "No data from Galaxy API"}
                
                logger.info(f"Successfully retrieved first batch: {len(batch)} collections")
                
                # Process first batch
                for item in batch:
                    namespace = item.get("namespace", "")
                    if namespace:
                        if namespace not in namespaces:
                            namespaces[namespace] = {
                                "name": namespace,
                                "collection_count": 0,
                                "total_downloads": 0
                            }
                        namespaces[namespace]["collection_count"] += 1
                        namespaces[namespace]["total_downloads"] += item.get("download_count", 0)
                
                # For efficiency, only scan first few pages to get main namespaces
                offset = 50
                max_collections = 500  # Reduced from 1000
                
                while offset < max_collections:
                    try:
                        url = f"{self.galaxy_base_url}/?limit=50&offset={offset}"
                        response = await client.get(url)
                        response.raise_for_status()
                        
                        data = response.json()
                        batch = data.get("data", [])
                        
                        if not batch or len(batch) < 50:
                            logger.info(f"Reached end of data or small batch at offset {offset}")
                            break
                        
                        for item in batch:
                            namespace = item.get("namespace", "")
                            if namespace:
                                if namespace not in namespaces:
                                    namespaces[namespace] = {
                                        "name": namespace,
                                        "collection_count": 0,
                                        "total_downloads": 0
                                    }
                                namespaces[namespace]["collection_count"] += 1
                                namespaces[namespace]["total_downloads"] += item.get("download_count", 0)
                        
                        offset += 50
                        
                        # Add a small delay between requests to be respectful
                        await asyncio.sleep(0.1)
                        
                    except Exception as e:
                        logger.warning(f"Error fetching batch at offset {offset}: {e}")
                        break
            
            # Sort by collection count
            sorted_namespaces = sorted(
                namespaces.values(),
                key=lambda x: x["collection_count"],
                reverse=True
            )
            
            return {
                "namespaces": sorted_namespaces,
                "total_namespaces": len(sorted_namespaces)
            }
            
        except Exception as e:
            logger.error(f"Error fetching namespaces: {e}")
            return {"namespaces": [], "total_namespaces": 0, "error": str(e)}
    
    async def get_collections(self, namespace: str, limit: int = 50) -> Dict[str, Any]:
        """
        Get collections for a specific namespace
        """
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                url = f"{self.galaxy_base_url}/?namespace={namespace}&limit={limit}"
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                collections = []
                
                for item in data.get("data", []):
                    version_data = item.get("highest_version", {})
                    collections.append({
                        "name": item.get("name", ""),
                        "namespace": item.get("namespace", ""),
                        "description": item.get("description", ""),
                        "latest_version": version_data.get("version", "") if version_data else "",
                        "download_count": item.get("download_count", 0),
                        "created_at": item.get("created_at", ""),
                        "updated_at": item.get("updated_at", ""),
                        "deprecated": item.get("deprecated", False)
                    })
                
                return {
                    "namespace": namespace,
                    "collections": collections,
                    "total_count": data.get("meta", {}).get("count", len(collections))
                }
                
        except Exception as e:
            logger.error(f"Error fetching collections for namespace {namespace}: {e}")
            return {"namespace": namespace, "collections": [], "total_count": 0, "error": str(e)}
    
    async def get_versions(self, namespace: str, collection: str, limit: int = 50) -> Dict[str, Any]:
        """
        Get versions for a specific collection
        """
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                url = f"{self.galaxy_base_url}/{namespace}/{collection}/versions/?limit={limit}"
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                versions = []
                
                for item in data.get("data", []):
                    versions.append({
                        "version": item.get("version", ""),
                        "requires_ansible": item.get("requires_ansible", ""),
                        "created_at": item.get("created_at", ""),
                        "updated_at": item.get("updated_at", ""),
                        "href": item.get("href", "")
                    })
                
                return {
                    "namespace": namespace,
                    "collection": collection,
                    "versions": versions,
                    "total_count": data.get("meta", {}).get("count", len(versions))
                }
                
        except Exception as e:
            logger.error(f"Error fetching versions for {namespace}.{collection}: {e}")
            return {
                "namespace": namespace,
                "collection": collection,
                "versions": [],
                "total_count": 0,
                "error": str(e)
            }
    
    async def get_modules(self, namespace: str, collection: str, version: str) -> Dict[str, Any]:
        """
        Get modules/plugins for a specific collection version
        """
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                url = f"{self.galaxy_base_url}/{namespace}/{collection}/versions/{version}/"
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                metadata = data.get("metadata", {})
                contents = metadata.get("contents", [])
                
                # Group by content type
                modules = []
                plugins = []
                other_content = []
                
                for item in contents:
                    content_type = item.get("content_type", "")
                    content_data = {
                        "name": item.get("name", ""),
                        "description": item.get("description", ""),
                        "content_type": content_type
                    }
                    
                    if content_type == "module":
                        modules.append(content_data)
                    elif content_type.endswith("_plugin") or content_type in ["filter", "test", "lookup"]:
                        plugins.append(content_data)
                    else:
                        other_content.append(content_data)
                
                return {
                    "namespace": namespace,
                    "collection": collection,
                    "version": version,
                    "modules": modules,
                    "plugins": plugins,
                    "other_content": other_content,
                    "total_modules": len(modules),
                    "total_plugins": len(plugins),
                    "collection_info": {
                        "description": metadata.get("description", ""),
                        "license": metadata.get("license", []),
                        "tags": metadata.get("tags", []),
                        "authors": metadata.get("authors", [])
                    }
                }
                
        except Exception as e:
            logger.error(f"Error fetching modules for {namespace}.{collection}:{version}: {e}")
            return {
                "namespace": namespace,
                "collection": collection,
                "version": version,
                "modules": [],
                "plugins": [],
                "other_content": [],
                "total_modules": 0,
                "total_plugins": 0,
                "error": str(e)
            }


# Singleton instance
galaxy_service = GalaxyService()