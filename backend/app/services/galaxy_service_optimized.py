"""
Optimized Galaxy service with parallel loading and improved caching
"""

import asyncio
import httpx
from typing import List, Dict, Any, Optional, Set
import logging
from datetime import datetime, timedelta
from .cache_service import cache, cached_galaxy_request

logger = logging.getLogger(__name__)


class OptimizedGalaxyService:
    """Optimized service for retrieving data from Ansible Galaxy API"""
    
    def __init__(self):
        self.galaxy_base_url = "https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index"
        self.max_concurrent_requests = 10  # Limit concurrent requests to be respectful
        self.semaphore = asyncio.Semaphore(self.max_concurrent_requests)
        
    async def _fetch_with_semaphore(self, client: httpx.AsyncClient, url: str) -> Optional[Dict]:
        """Fetch URL with semaphore to limit concurrent requests"""
        async with self.semaphore:
            try:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.warning(f"Error fetching {url}: {e}")
                return None
    
    @cached_galaxy_request("all_namespaces", ttl_seconds=3600)  # 1 hour cache
    async def get_all_namespaces(self) -> Dict[str, Any]:
        """
        Get ALL namespaces with accurate collection counts using parallel requests
        """
        try:
            logger.info("Fetching ALL namespaces from Galaxy API with parallel loading")
            namespaces = {}
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                # Phase 1: Discover ALL namespaces by fetching collections sequentially until exhausted
                logger.info("Phase 1: Discovering all namespaces...")
                batch_size = 100
                offset = 0
                total_collections_seen = 0
                
                while True:
                    try:
                        url = f"{self.galaxy_base_url}/?limit={batch_size}&offset={offset}"
                        data = await self._fetch_with_semaphore(client, url)
                        
                        if not data:
                            break
                            
                        batch = data.get("data", [])
                        if not batch:
                            break
                            
                        total_collections_seen += len(batch)
                        
                        # Collect unique namespaces from this batch
                        for item in batch:
                            namespace = item.get("namespace", "")
                            if namespace and namespace not in namespaces:
                                namespaces[namespace] = {
                                    "name": namespace,
                                    "collection_count": 0,
                                    "total_downloads": 0
                                }
                        
                        # If we got less than batch_size, we've reached the end
                        if len(batch) < batch_size:
                            break
                            
                        offset += batch_size
                        
                        # Safety limit to avoid infinite loops (adjust as needed)
                        if offset > 100000:  # Max 100k collections to scan
                            logger.warning(f"Reached safety limit at offset {offset}, stopping discovery")
                            break
                            
                    except Exception as e:
                        logger.warning(f"Error in discovery at offset {offset}: {e}")
                        break
                
                logger.info(f"Phase 1 complete: discovered {len(namespaces)} unique namespaces from {total_collections_seen} collections")
                logger.info(f"Phase 1 namespaces: {sorted(list(namespaces.keys()))[:20]}...")  # Show first 20
                
                # Phase 2: Get accurate counts for all namespaces in parallel
                logger.info("Phase 2: Getting accurate counts for all namespaces in parallel...")
                count_tasks = []
                
                for namespace_name in namespaces.keys():
                    # Create task for getting accurate count
                    task = self._get_namespace_stats(client, namespace_name)
                    count_tasks.append(task)
                
                # Process in batches to avoid overwhelming the API
                batch_size = 50
                for i in range(0, len(count_tasks), batch_size):
                    batch = count_tasks[i:i + batch_size]
                    batch_results = await asyncio.gather(*batch)
                    
                    # Update namespace data
                    for j, stats in enumerate(batch_results):
                        if stats:
                            namespace_name = stats["name"]
                            namespaces[namespace_name].update(stats)
                        else:
                            # Keep namespace even if stats failed, with defaults
                            batch_namespace = list(namespaces.keys())[i + j]
                            logger.debug(f"Failed to get stats for {batch_namespace}, keeping with defaults")
            
            # Convert to sorted list
            sorted_namespaces = sorted(
                namespaces.values(),
                key=lambda x: x["collection_count"],
                reverse=True
            )
            
            logger.info(f"Successfully loaded {len(sorted_namespaces)} namespaces with accurate counts")
            logger.info(f"Final namespaces: {[ns['name'] for ns in sorted_namespaces[:20]]}")  # Show first 20
            
            return {
                "namespaces": sorted_namespaces,
                "total_namespaces": len(sorted_namespaces)
            }
            
        except Exception as e:
            logger.error(f"Error fetching namespaces: {e}")
            return {"namespaces": [], "total_namespaces": 0, "error": str(e)}
    
    async def _get_namespace_stats(self, client: httpx.AsyncClient, namespace: str) -> Optional[Dict]:
        """Get statistics for a single namespace"""
        try:
            # Get accurate collection count
            url = f"{self.galaxy_base_url}/?namespace={namespace}&limit=1"
            data = await self._fetch_with_semaphore(client, url)
            
            if not data:
                return None
                
            count = data.get("meta", {}).get("count", 0)
            
            # Get download stats from a few collections
            stats = {
                "name": namespace,
                "collection_count": count,
                "total_downloads": 0
            }
            
            if count > 0:
                # Sample up to 10 collections for download stats
                sample_limit = min(10, count)
                sample_url = f"{self.galaxy_base_url}/?namespace={namespace}&limit={sample_limit}"
                sample_data = await self._fetch_with_semaphore(client, sample_url)
                
                if sample_data:
                    collections = sample_data.get("data", [])
                    total_downloads = sum(item.get("download_count", 0) for item in collections)
                    
                    # Estimate total downloads
                    if len(collections) > 0:
                        estimated_total = int(total_downloads * (count / len(collections)))
                        stats["total_downloads"] = estimated_total
            
            return stats
            
        except Exception as e:
            logger.warning(f"Error getting stats for namespace {namespace}: {e}")
            return None
    
    @cached_galaxy_request("collections", ttl_seconds=1800)  # 30 minutes cache
    async def get_all_collections(self, namespace: str) -> Dict[str, Any]:
        """
        Get ALL collections for a namespace using parallel requests
        """
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                logger.info(f"Fetching ALL collections for namespace: {namespace}")
                
                # First, get the total count
                count_url = f"{self.galaxy_base_url}/?namespace={namespace}&limit=1"
                count_data = await self._fetch_with_semaphore(client, count_url)
                
                if not count_data:
                    return {
                        "namespace": namespace,
                        "collections": [],
                        "total_count": 0
                    }
                
                total_count = count_data.get("meta", {}).get("count", 0)
                logger.info(f"Namespace {namespace} has {total_count} collections")
                
                if total_count == 0:
                    return {
                        "namespace": namespace,
                        "collections": [],
                        "total_count": 0
                    }
                
                # Fetch all collections in parallel
                batch_size = 100
                fetch_tasks = []
                
                for offset in range(0, total_count, batch_size):
                    url = f"{self.galaxy_base_url}/?namespace={namespace}&limit={batch_size}&offset={offset}"
                    task = self._fetch_with_semaphore(client, url)
                    fetch_tasks.append(task)
                
                # Execute all fetches in parallel
                results = await asyncio.gather(*fetch_tasks)
                
                # Process all results
                all_collections = []
                for result in results:
                    if not result:
                        continue
                    
                    batch_items = result.get("data", [])
                    for item in batch_items:
                        version_data = item.get("highest_version", {})
                        
                        all_collections.append({
                            "name": item.get("name", ""),
                            "namespace": item.get("namespace", ""),
                            "description": item.get("description", ""),
                            "latest_version": version_data.get("version", "") if version_data else "",
                            "download_count": item.get("download_count", 0),
                            "created_at": item.get("created_at", ""),
                            "updated_at": item.get("updated_at", ""),
                            "deprecated": item.get("deprecated", False)
                        })
                
                # Sort by name for consistency
                all_collections.sort(key=lambda x: x["name"])
                
                logger.info(f"Successfully fetched {len(all_collections)} collections for {namespace}")
                
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
        Get ALL versions for a collection (keep existing implementation as it's already efficient)
        """
        try:
            async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
                logger.info(f"Fetching versions for {namespace}.{collection}")
                all_versions = []
                
                # Get all versions with pagination
                url = f"{self.galaxy_base_url}/{namespace}/{collection}/versions/"
                batch_size = 100
                offset = 0
                
                while True:
                    batch_url = f"{url}?limit={batch_size}&offset={offset}"
                    data = await self._fetch_with_semaphore(client, batch_url)
                    
                    if not data:
                        break
                    
                    batch_items = data.get("data", [])
                    if not batch_items:
                        break
                    
                    for item in batch_items:
                        all_versions.append({
                            "version": item.get("version", ""),
                            "requires_ansible": item.get("requires_ansible", ""),
                            "created_at": item.get("created_at", ""),
                            "updated_at": item.get("updated_at", ""),
                            "href": item.get("href", "")
                        })
                    
                    if len(batch_items) < batch_size:
                        break
                    
                    offset += batch_size
                
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
        Get modules/plugins for a specific collection version (keep existing implementation)
        """
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                url = f"{self.galaxy_base_url}/{namespace}/{collection}/versions/{version}/"
                data = await self._fetch_with_semaphore(client, url)
                
                if not data:
                    return {
                        "namespace": namespace,
                        "collection": collection,
                        "version": version,
                        "modules": [],
                        "plugins": [],
                        "other_content": [],
                        "total_modules": 0,
                        "total_plugins": 0,
                        "error": "Failed to fetch data"
                    }
                
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
optimized_galaxy_service = OptimizedGalaxyService()