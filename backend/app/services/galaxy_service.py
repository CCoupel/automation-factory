"""
Galaxy service for retrieving Ansible collections data from Galaxy API
"""

import asyncio
import httpx
from typing import List, Dict, Any, Optional
import logging
from .cache_service import cache, cached_galaxy_request

logger = logging.getLogger(__name__)


class GalaxyService:
    """Service for retrieving data from Ansible Galaxy API"""
    
    def __init__(self):
        self.galaxy_base_url = "https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index"
        
    @cached_galaxy_request("namespaces", ttl_seconds=1800)  # 30 minutes cache
    async def get_namespaces(self, limit: int = 100) -> Dict[str, Any]:
        """
        Get list of all namespaces with accurate collection counts
        """
        try:
            logger.info("Fetching namespaces from Galaxy API (cache miss)")
            namespaces = {}
            
            # First, get a sample to identify main namespaces quickly
            sample_size = 500  # Increased sample for better namespace discovery
            batch_size = 50
            
            async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
                # Phase 1: Sample collections to discover namespaces
                logger.info("Phase 1: Discovering namespaces from sample...")
                for offset in range(0, sample_size, batch_size):
                    try:
                        url = f"{self.galaxy_base_url}/?limit={batch_size}&offset={offset}"
                        response = await client.get(url)
                        response.raise_for_status()
                        
                        data = response.json()
                        batch = data.get("data", [])
                        
                        if not batch:
                            break
                        
                        # Collect unique namespaces
                        for item in batch:
                            namespace = item.get("namespace", "")
                            if namespace and namespace not in namespaces:
                                namespaces[namespace] = {
                                    "name": namespace,
                                    "collection_count": 0,
                                    "total_downloads": 0
                                }
                        
                        if len(batch) < batch_size:
                            break
                            
                    except Exception as e:
                        logger.warning(f"Error in phase 1 at offset {offset}: {e}")
                        continue
                
                logger.info(f"Phase 1 complete: discovered {len(namespaces)} namespaces")
                
                # Phase 2: Get accurate counts for discovered namespaces
                logger.info("Phase 2: Getting accurate counts for namespaces...")
                for namespace_name in list(namespaces.keys())[:limit]:  # Limit to requested namespaces
                    try:
                        # Use the correct collections endpoint with namespace parameter
                        collections_url = f"{self.galaxy_base_url}/?namespace={namespace_name}&limit=1"
                        response = await client.get(collections_url)
                        response.raise_for_status()
                        
                        collections_data = response.json()
                        meta = collections_data.get("meta", {})
                        actual_count = meta.get("count", 0)
                        
                        # Update with accurate count
                        namespaces[namespace_name]["collection_count"] = actual_count
                        
                        # Get total downloads by sampling a few collections
                        if actual_count > 0:
                            sample_limit = min(10, actual_count)  # Sample up to 10 collections
                            sample_url = f"{self.galaxy_base_url}/?namespace={namespace_name}&limit={sample_limit}"
                            sample_response = await client.get(sample_url)
                            sample_response.raise_for_status()
                            
                            sample_data = sample_response.json()
                            sample_collections = sample_data.get("data", [])
                            total_downloads = sum(item.get("download_count", 0) for item in sample_collections)
                            
                            # Estimate total downloads proportionally
                            if len(sample_collections) > 0:
                                estimated_total = int(total_downloads * (actual_count / len(sample_collections)))
                                namespaces[namespace_name]["total_downloads"] = estimated_total
                        
                        # Small delay to be respectful to the API
                        await asyncio.sleep(0.05)
                        
                    except Exception as e:
                        logger.warning(f"Error getting accurate count for {namespace_name}: {e}")
                        # Fallback: keep the namespace with count from phase 1
                        continue
            
            # Sort by collection count and limit
            sorted_namespaces = sorted(
                namespaces.values(),
                key=lambda x: x["collection_count"],
                reverse=True
            )[:limit]
            
            logger.info(f"Returning {len(sorted_namespaces)} namespaces with accurate counts")
            
            return {
                "namespaces": sorted_namespaces,
                "total_namespaces": len(sorted_namespaces)
            }
            
        except Exception as e:
            logger.error(f"Error fetching namespaces: {e}")
            return {"namespaces": [], "total_namespaces": 0, "error": str(e)}
    
    async def get_collections(self, namespace: str, limit: int = None) -> Dict[str, Any]:
        """
        Get ALL collections for a specific namespace using pagination
        """
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                logger.info(f"Fetching ALL collections for namespace: {namespace}")
                all_collections = []
                
                # First request to get total count
                url = f"{self.galaxy_base_url}/?namespace={namespace}&limit=1"
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                total_count = data.get("meta", {}).get("count", 0)
                
                logger.info(f"Namespace {namespace} has {total_count} collections total")
                
                # If no collections, return early
                if total_count == 0:
                    return {
                        "namespace": namespace,
                        "collections": [],
                        "total_count": 0
                    }
                
                # Use optimal batch size for pagination
                batch_size = 100  # Larger batches for efficiency
                
                # Fetch all collections with pagination
                for offset in range(0, total_count, batch_size):
                    try:
                        batch_url = f"{self.galaxy_base_url}/?namespace={namespace}&limit={batch_size}&offset={offset}"
                        logger.info(f"Fetching collections batch {offset}-{offset + batch_size} for {namespace}")
                        
                        batch_response = await client.get(batch_url)
                        batch_response.raise_for_status()
                        batch_data = batch_response.json()
                        
                        batch_items = batch_data.get("data", [])
                        if not batch_items:
                            break
                        
                        # Process each collection in the batch
                        for item in batch_items:
                            version_data = item.get("highest_version", {})
                            
                            # Get requires_ansible from latest version if available
                            requires_ansible = None
                            if version_data and version_data.get("href"):
                                try:
                                    # Get detailed version info
                                    version_url = f"https://galaxy.ansible.com{version_data['href']}"
                                    version_response = await client.get(version_url)
                                    version_response.raise_for_status()
                                    version_detail = version_response.json()
                                    requires_ansible = version_detail.get("requires_ansible")
                                    
                                    # Small delay to be respectful
                                    await asyncio.sleep(0.01)  # Reduced delay for efficiency
                                except Exception as e:
                                    logger.debug(f"Could not fetch requires_ansible for {item.get('name')}: {e}")
                            
                            all_collections.append({
                                "name": item.get("name", ""),
                                "namespace": item.get("namespace", ""),
                                "description": item.get("description", ""),
                                "latest_version": version_data.get("version", "") if version_data else "",
                                "requires_ansible": requires_ansible,
                                "download_count": item.get("download_count", 0),
                                "created_at": item.get("created_at", ""),
                                "updated_at": item.get("updated_at", ""),
                                "deprecated": item.get("deprecated", False)
                            })
                        
                        # Break if we got less than batch_size (last batch)
                        if len(batch_items) < batch_size:
                            break
                            
                    except Exception as e:
                        logger.warning(f"Error fetching batch at offset {offset} for {namespace}: {e}")
                        continue
                
                logger.info(f"Successfully fetched {len(all_collections)} collections for namespace {namespace}")
                
                return {
                    "namespace": namespace,
                    "collections": all_collections,
                    "total_count": len(all_collections)
                }
                
        except Exception as e:
            logger.error(f"Error fetching collections for namespace {namespace}: {e}")
            return {"namespace": namespace, "collections": [], "total_count": 0, "error": str(e)}
    
    async def get_versions(self, namespace: str, collection: str, limit: int = None) -> Dict[str, Any]:
        """
        Get ALL versions for a specific collection using pagination
        """
        try:
            async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
                logger.info(f"Fetching ALL versions for {namespace}.{collection}")
                all_versions = []
                
                # First request to get total count
                url = f"{self.galaxy_base_url}/{namespace}/{collection}/versions/?limit=1"
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()
                total_count = data.get("meta", {}).get("count", 0)
                
                logger.info(f"Collection {namespace}.{collection} has {total_count} versions total")
                
                # If no versions, return early
                if total_count == 0:
                    return {
                        "namespace": namespace,
                        "collection": collection,
                        "versions": [],
                        "total_count": 0
                    }
                
                # Use optimal batch size for pagination
                batch_size = 100
                
                # Fetch all versions with pagination
                for offset in range(0, total_count, batch_size):
                    try:
                        batch_url = f"{self.galaxy_base_url}/{namespace}/{collection}/versions/?limit={batch_size}&offset={offset}"
                        logger.info(f"Fetching versions batch {offset}-{offset + batch_size} for {namespace}.{collection}")
                        
                        batch_response = await client.get(batch_url)
                        batch_response.raise_for_status()
                        batch_data = batch_response.json()
                        
                        batch_items = batch_data.get("data", [])
                        if not batch_items:
                            break
                        
                        # Process each version in the batch
                        for item in batch_items:
                            all_versions.append({
                                "version": item.get("version", ""),
                                "requires_ansible": item.get("requires_ansible", ""),
                                "created_at": item.get("created_at", ""),
                                "updated_at": item.get("updated_at", ""),
                                "href": item.get("href", "")
                            })
                        
                        # Break if we got less than batch_size (last batch)
                        if len(batch_items) < batch_size:
                            break
                            
                    except Exception as e:
                        logger.warning(f"Error fetching versions batch at offset {offset} for {namespace}.{collection}: {e}")
                        continue
                
                logger.info(f"Successfully fetched {len(all_versions)} versions for {namespace}.{collection}")
                
                return {
                    "namespace": namespace,
                    "collection": collection,
                    "versions": all_versions,
                    "total_count": len(all_versions)
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