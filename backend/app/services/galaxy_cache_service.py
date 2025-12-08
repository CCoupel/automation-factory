"""
Galaxy Cache Service - Full sync at backend startup
Fetches all namespaces, collections, and modules at backend startup
"""

import asyncio
import httpx
import time
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from .galaxy_service_simple import simple_galaxy_service
from .galaxy_service_optimized import optimized_galaxy_service
from .cache_storage_service import galaxy_cache, GalaxyCacheKeys

logger = logging.getLogger(__name__)

class GalaxyCacheService:
    """Service to sync and cache all Galaxy data at backend startup"""
    
    def __init__(self):
        self.galaxy_base_url = "https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index"
        
        # Cache storage
        self.namespaces_cache: Dict[str, Any] = {}
        self.collections_cache: Dict[str, List[Dict]] = {}  # namespace -> [collections]
        self.modules_cache: Dict[str, List[Dict]] = {}      # collection_key -> [modules]
        self.popular_namespaces: List[Dict] = []
        
        # Sync metadata
        self.last_sync_time: Optional[datetime] = None
        self.sync_duration: Optional[float] = None
        self.sync_status: str = "not_started"  # not_started, syncing, completed, failed
        self.sync_stats: Dict[str, int] = {
            "total_namespaces": 0,
            "total_collections": 0,
            "total_modules": 0,
            "errors": 0
        }
        
        # Concurrency settings (more conservative for full sync)
        self.max_concurrent_requests = 2  # Very conservative to avoid rate limits
        self.semaphore = asyncio.Semaphore(self.max_concurrent_requests)
        self.request_delay = 1.0  # Longer delay between batches
        
        # Quick mode for testing
        self.quick_mode = False
        
    async def startup_full_sync(self) -> bool:
        """
        Full synchronization of Galaxy data at backend startup
        First tries to load from cache, then syncs if needed
        Returns True if successful, False otherwise
        """
        start_time = time.time()
        
        # Try to load from cache first
        logger.info("🔍 Checking for cached Galaxy data...")
        if await self.load_from_cache():
            logger.info("✅ Galaxy data loaded from cache, no sync needed")
            return True
        
        # Cache miss or expired, perform full sync
        self.sync_status = "syncing"
        self.last_sync_time = datetime.utcnow()
        
        # Notify frontends that sync started
        try:
            from .notification_service import notification_service
            await notification_service.notify_cache_sync_started()
        except ImportError:
            pass  # Notification service not available
        
        logger.info("🚀 Starting Galaxy full sync at backend startup...")
        
        try:
            # Phase 1: Get popular namespaces instantly
            await self._sync_popular_namespaces()
            
            # Phase 2: Discover all namespaces
            await self._sync_all_namespaces()
            
            # Phase 3: Sync collections (limited in quick mode)
            if self.quick_mode:
                # Quick mode: only popular namespaces
                await self._sync_collections_quick()
            else:
                # Full mode: sample of all namespaces
                await self._sync_collections_sample()
            
            # Phase 4: Sync modules (only in full mode or very limited in quick mode)
            if not self.quick_mode:
                await self._sync_modules_sample()
            
            # Persist to cache
            await self._persist_to_cache()
            
            # Mark as completed
            self.sync_duration = time.time() - start_time
            self.sync_status = "completed"
            
            logger.info(f"✅ Galaxy full sync completed in {self.sync_duration:.1f}s")
            logger.info(f"📊 Stats: {self.sync_stats['total_namespaces']} namespaces, "
                       f"{self.sync_stats['total_collections']} collections, "
                       f"{self.sync_stats['total_modules']} modules")
            logger.info("💾 Data persisted to cache")
            
            # Notify frontends that sync completed
            try:
                from .notification_service import notification_service
                await notification_service.notify_cache_sync_completed(self.sync_stats.copy())
            except ImportError:
                pass  # Notification service not available
            
            return True
            
        except Exception as e:
            self.sync_status = "failed"
            self.sync_duration = time.time() - start_time
            logger.error(f"❌ Galaxy full sync failed after {self.sync_duration:.1f}s: {e}")
            
            # Notify frontends about sync error
            try:
                from .notification_service import notification_service
                await notification_service.notify_cache_error(str(e))
            except ImportError:
                pass  # Notification service not available
            
            return False
    
    async def _sync_popular_namespaces(self):
        """Sync popular namespaces using existing service"""
        logger.info("📥 Syncing popular namespaces...")
        
        try:
            popular_data = await simple_galaxy_service.get_popular_namespaces()
            self.popular_namespaces = popular_data.get("namespaces", [])
            
            # Add to namespaces cache
            for ns in self.popular_namespaces:
                self.namespaces_cache[ns["name"]] = ns
            
            logger.info(f"✅ Synced {len(self.popular_namespaces)} popular namespaces")
            
        except Exception as e:
            logger.error(f"❌ Failed to sync popular namespaces: {e}")
            self.sync_stats["errors"] += 1
    
    async def _sync_all_namespaces(self):
        """Discover all namespaces from Galaxy"""
        logger.info("🔍 Discovering all namespaces...")
        
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                discovered = 0
                offset = 0
                batch_size = 100
                
                while discovered < 5000:  # Reasonable limit
                    try:
                        url = f"{self.galaxy_base_url}/?limit={batch_size}&offset={offset}"
                        response = await client.get(url)
                        response.raise_for_status()
                        
                        data = response.json()
                        batch = data.get("data", [])
                        
                        if not batch:
                            break
                        
                        # Extract unique namespaces
                        batch_namespaces = set()
                        for item in batch:
                            namespace = item.get("namespace", "")
                            if namespace and namespace not in self.namespaces_cache:
                                batch_namespaces.add(namespace)
                                
                                # Add basic namespace info
                                self.namespaces_cache[namespace] = {
                                    "name": namespace,
                                    "collection_count": 0,  # Will be computed later
                                    "total_downloads": 0    # Will be computed later
                                }
                        
                        discovered += len(batch_namespaces)
                        offset += batch_size
                        
                        if len(batch) < batch_size:
                            break
                            
                        # Rate limiting
                        await asyncio.sleep(self.request_delay)
                        
                    except Exception as e:
                        logger.warning(f"Error discovering namespaces at offset {offset}: {e}")
                        break
                
                self.sync_stats["total_namespaces"] = len(self.namespaces_cache)
                logger.info(f"✅ Discovered {self.sync_stats['total_namespaces']} total namespaces")
                
        except Exception as e:
            logger.error(f"❌ Failed to discover namespaces: {e}")
            self.sync_stats["errors"] += 1
    
    async def _sync_collections_sample(self):
        """Sync collections for a sample of namespaces (not all to avoid overload)"""
        logger.info("📚 Syncing collections for sample namespaces...")
        
        try:
            # Priority: Popular namespaces + random sample from others
            priority_namespaces = [ns["name"] for ns in self.popular_namespaces[:10]]
            other_namespaces = [name for name in self.namespaces_cache.keys() 
                               if name not in priority_namespaces]
            
            # Sample from others (max 20 additional)
            import random
            sample_others = random.sample(other_namespaces, min(20, len(other_namespaces)))
            
            target_namespaces = priority_namespaces + sample_others
            logger.info(f"Syncing collections for {len(target_namespaces)} namespaces")
            
            # Sync collections with concurrency control
            tasks = []
            for namespace in target_namespaces:
                task = self._sync_namespace_collections(namespace)
                tasks.append(task)
            
            # Process in batches
            batch_size = 5
            for i in range(0, len(tasks), batch_size):
                batch = tasks[i:i + batch_size]
                await asyncio.gather(*batch, return_exceptions=True)
                await asyncio.sleep(1)  # Rate limiting between batches
            
            logger.info(f"✅ Collections sync completed: {self.sync_stats['total_collections']} collections")
            
        except Exception as e:
            logger.error(f"❌ Failed to sync collections: {e}")
            self.sync_stats["errors"] += 1
    
    async def _sync_collections_quick(self):
        """Quick sync: collections for popular namespaces only"""
        logger.info("📚 Quick sync: collections for popular namespaces only...")
        
        try:
            # Only top 5 popular namespaces
            target_namespaces = [ns["name"] for ns in self.popular_namespaces[:5]]
            logger.info(f"Quick syncing collections for {len(target_namespaces)} popular namespaces")
            
            # Sync with minimal concurrency
            for namespace in target_namespaces:
                try:
                    await self._sync_namespace_collections(namespace)
                    await asyncio.sleep(2)  # Heavy rate limiting
                except Exception as e:
                    logger.debug(f"Failed to sync collections for {namespace}: {e}")
                    self.sync_stats["errors"] += 1
            
            logger.info(f"✅ Quick collections sync completed: {self.sync_stats['total_collections']} collections")
            
        except Exception as e:
            logger.error(f"❌ Failed to quick sync collections: {e}")
            self.sync_stats["errors"] += 1
    
    async def _sync_namespace_collections(self, namespace: str):
        """Sync collections for a specific namespace"""
        async with self.semaphore:
            try:
                collections_data = await optimized_galaxy_service.get_all_collections(namespace)
                collections = collections_data.get("collections", [])
                
                self.collections_cache[namespace] = collections
                self.sync_stats["total_collections"] += len(collections)
                
                # Update namespace stats
                if namespace in self.namespaces_cache:
                    self.namespaces_cache[namespace]["collection_count"] = len(collections)
                    total_downloads = sum(col.get("download_count", 0) for col in collections)
                    self.namespaces_cache[namespace]["total_downloads"] = total_downloads
                
                logger.debug(f"✅ Synced {len(collections)} collections for namespace '{namespace}'")
                
            except Exception as e:
                logger.debug(f"❌ Failed to sync collections for namespace '{namespace}': {e}")
                self.sync_stats["errors"] += 1
    
    async def _sync_modules_sample(self):
        """Sync modules for a sample of popular collections only"""
        logger.info("🧩 Syncing modules for sample collections...")
        
        try:
            # Only sync modules for popular namespaces to avoid overload
            target_collections = []
            
            for namespace in self.popular_namespaces[:5]:  # Top 5 popular only
                namespace_name = namespace["name"]
                collections = self.collections_cache.get(namespace_name, [])
                
                # Top 3 collections per namespace by download count
                sorted_collections = sorted(collections, 
                                          key=lambda x: x.get("download_count", 0), 
                                          reverse=True)[:3]
                
                for collection in sorted_collections:
                    target_collections.append({
                        "namespace": namespace_name,
                        "name": collection["name"],
                        "latest_version": collection.get("latest_version", "1.0.0")
                    })
            
            logger.info(f"Syncing modules for {len(target_collections)} top collections")
            
            # Sync modules with heavy rate limiting
            for collection in target_collections:
                try:
                    await self._sync_collection_modules(
                        collection["namespace"], 
                        collection["name"], 
                        collection["latest_version"]
                    )
                    await asyncio.sleep(2)  # Heavy rate limiting for modules
                    
                except Exception as e:
                    logger.debug(f"Failed to sync modules for {collection['namespace']}.{collection['name']}: {e}")
                    self.sync_stats["errors"] += 1
            
            logger.info(f"✅ Modules sync completed: {self.sync_stats['total_modules']} modules")
            
        except Exception as e:
            logger.error(f"❌ Failed to sync modules: {e}")
            self.sync_stats["errors"] += 1
    
    async def _sync_collection_modules(self, namespace: str, collection: str, version: str):
        """Sync modules for a specific collection version"""
        try:
            from .galaxy_service_optimized import optimized_galaxy_service
            modules_data = await optimized_galaxy_service.get_modules(namespace, collection, version)
            
            modules = modules_data.get("modules", []) + modules_data.get("plugins", [])
            collection_key = f"{namespace}.{collection}:{version}"
            
            self.modules_cache[collection_key] = modules
            self.sync_stats["total_modules"] += len(modules)
            
            logger.debug(f"✅ Synced {len(modules)} modules for {collection_key}")
            
        except Exception as e:
            logger.debug(f"❌ Failed to sync modules for {namespace}.{collection}:{version}: {e}")
            self.sync_stats["errors"] += 1
    
    def get_cache_summary(self) -> Dict[str, Any]:
        """Get summary of cached data"""
        return {
            "sync_status": self.sync_status,
            "last_sync_time": self.last_sync_time.isoformat() if self.last_sync_time else None,
            "sync_duration_seconds": self.sync_duration,
            "stats": self.sync_stats.copy(),
            "cache_sizes": {
                "namespaces": len(self.namespaces_cache),
                "collections": len(self.collections_cache),
                "modules": len(self.modules_cache),
                "popular_namespaces": len(self.popular_namespaces)
            }
        }
    
    def get_all_namespaces(self) -> List[Dict]:
        """Get all cached namespaces"""
        return list(self.namespaces_cache.values())
    
    def get_popular_namespaces(self) -> List[Dict]:
        """Get popular namespaces"""
        return self.popular_namespaces.copy()
    
    def get_namespace_collections(self, namespace: str) -> List[Dict]:
        """Get collections for a namespace"""
        return self.collections_cache.get(namespace, [])
    
    def get_collection_modules(self, namespace: str, collection: str, version: str) -> List[Dict]:
        """Get modules for a collection"""
        collection_key = f"{namespace}.{collection}:{version}"
        return self.modules_cache.get(collection_key, [])
    
    def set_quick_mode(self, enabled: bool = True):
        """Enable/disable quick mode for testing"""
        self.quick_mode = enabled
        logger.info(f"Quick mode {'enabled' if enabled else 'disabled'}")
    
    async def _persist_to_cache(self):
        """Persist all synchronized data to cache"""
        try:
            # Cache duration: 6 hours for production, 1 hour for quick mode
            ttl = 3600 if self.quick_mode else 6 * 3600
            
            # Store popular namespaces
            galaxy_cache.set(GalaxyCacheKeys.POPULAR_NAMESPACES, self.popular_namespaces, ttl)
            
            # Store all namespaces
            galaxy_cache.set(GalaxyCacheKeys.ALL_NAMESPACES, list(self.namespaces_cache.values()), ttl)
            
            # Store collections by namespace
            for namespace, collections in self.collections_cache.items():
                key = GalaxyCacheKeys.namespace_collections(namespace)
                galaxy_cache.set(key, collections, ttl)
            
            # Store modules by collection
            for collection_key, modules in self.modules_cache.items():
                if ':' in collection_key:
                    namespace_collection, version = collection_key.split(':', 1)
                    if '.' in namespace_collection:
                        namespace, collection = namespace_collection.split('.', 1)
                        key = GalaxyCacheKeys.collection_modules(namespace, collection, version)
                        galaxy_cache.set(key, modules, ttl)
            
            # Store sync status and metadata
            sync_metadata = {
                'sync_status': self.sync_status,
                'last_sync_time': self.last_sync_time.isoformat() if self.last_sync_time else None,
                'sync_duration': self.sync_duration,
                'stats': self.sync_stats.copy()
            }
            galaxy_cache.set(GalaxyCacheKeys.SYNC_STATUS, sync_metadata, ttl)
            
            logger.info(f"✅ Persisted {len(self.namespaces_cache)} namespaces, "
                       f"{len(self.collections_cache)} namespace collections, "
                       f"{len(self.modules_cache)} collection modules to cache")
                       
        except Exception as e:
            logger.error(f"❌ Failed to persist to cache: {e}")
    
    async def load_from_cache(self) -> bool:
        """
        Load data from cache if available
        Returns True if cache is valid and loaded
        """
        try:
            # Check if sync metadata exists and is recent
            sync_metadata = galaxy_cache.get(GalaxyCacheKeys.SYNC_STATUS)
            if not sync_metadata:
                logger.info("No cache metadata found")
                return False
            
            # Load popular namespaces
            popular = galaxy_cache.get(GalaxyCacheKeys.POPULAR_NAMESPACES)
            if not popular:
                logger.info("Popular namespaces cache not found")
                return False
            
            # Load all namespaces
            all_namespaces = galaxy_cache.get(GalaxyCacheKeys.ALL_NAMESPACES)
            if not all_namespaces:
                logger.info("All namespaces cache not found")
                return False
            
            # Restore data
            self.popular_namespaces = popular
            self.namespaces_cache = {ns['name']: ns for ns in all_namespaces}
            
            # Restore sync metadata
            self.sync_status = sync_metadata.get('sync_status', 'unknown')
            self.sync_duration = sync_metadata.get('sync_duration')
            self.sync_stats = sync_metadata.get('stats', {})
            
            if sync_metadata.get('last_sync_time'):
                self.last_sync_time = datetime.fromisoformat(sync_metadata['last_sync_time'])
            
            logger.info(f"✅ Loaded from cache: {len(self.namespaces_cache)} namespaces, "
                       f"last sync: {self.last_sync_time}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to load from cache: {e}")
            return False
    
    def get_cached_namespace_collections(self, namespace: str) -> List[Dict]:
        """Get collections for namespace from cache (faster than memory lookup)"""
        key = GalaxyCacheKeys.namespace_collections(namespace)
        cached = galaxy_cache.get(key)
        if cached:
            return cached
        
        # Fallback to memory cache
        return self.collections_cache.get(namespace, [])
    
    def get_cached_collection_modules(self, namespace: str, collection: str, version: str) -> List[Dict]:
        """Get modules for collection from cache"""
        key = GalaxyCacheKeys.collection_modules(namespace, collection, version)
        cached = galaxy_cache.get(key)
        if cached:
            return cached
        
        # Fallback to memory cache
        collection_key = f"{namespace}.{collection}:{version}"
        return self.modules_cache.get(collection_key, [])
    
    def clear_cache(self):
        """Clear all Galaxy cache"""
        galaxy_cache.clear("galaxy:*")
        logger.info("🧹 Galaxy cache cleared")

# Singleton instance
galaxy_cache_service = GalaxyCacheService()