"""
Hybrid Galaxy service with instant popular namespaces + progressive streaming
"""

import asyncio
import httpx
from typing import List, Dict, Any, Optional, AsyncIterator
import logging
import json
from fastapi.responses import StreamingResponse
from .galaxy_service_simple import simple_galaxy_service
from .cache_service import cache, cached_galaxy_request

logger = logging.getLogger(__name__)

class HybridGalaxyService:
    """Hybrid service: instant popular namespaces + progressive discovery"""
    
    def __init__(self):
        self.galaxy_base_url = "https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index"
        self.initial_concurrent_requests = 5   # Start more conservatively
        self.min_concurrent_requests = 2       # Lower minimum for rate limiting
        self.max_concurrent_requests = 10      # Lower maximum to avoid 429
        self.current_concurrent_requests = self.initial_concurrent_requests
        self.semaphore = asyncio.Semaphore(self.current_concurrent_requests)
        self.batch_size = 10  # Send results by batches of 10
        
        # Adaptive monitoring
        self.stats_success_count = 0
        self.stats_error_count = 0
        self.stats_rate_limit_count = 0  # Track 429 errors separately
        self.adjustment_interval = 30    # Check more frequently
        self.error_threshold = 0.05      # More sensitive to errors (5%)
        self.last_429_time = None        # Track when we last hit rate limit
        
    async def _adjust_concurrency(self):
        """Dynamically adjust concurrency based on error rate"""
        import time
        current_time = time.time()
        
        # If we hit 429 recently, back off significantly
        if self.last_429_time and (current_time - self.last_429_time) < 60:
            if self.current_concurrent_requests > self.min_concurrent_requests:
                self.current_concurrent_requests = self.min_concurrent_requests
                logger.warning(f"⚠️ Rate limit detected, dropping to minimum concurrency: {self.current_concurrent_requests}")
                self.semaphore = asyncio.Semaphore(self.current_concurrent_requests)
                return
        
        total_requests = self.stats_success_count + self.stats_error_count
        
        if total_requests > 0 and total_requests % self.adjustment_interval == 0:
            error_rate = (self.stats_error_count + self.stats_rate_limit_count) / total_requests
            
            if self.stats_rate_limit_count > 0:
                # Any 429 errors mean we need to slow down
                self.current_concurrent_requests = max(self.min_concurrent_requests, self.current_concurrent_requests - 3)
                logger.warning(f"🚨 Rate limits hit ({self.stats_rate_limit_count} times), reducing to {self.current_concurrent_requests}")
            elif error_rate > self.error_threshold and self.current_concurrent_requests > self.min_concurrent_requests:
                # Too many errors, reduce concurrency
                self.current_concurrent_requests = max(self.min_concurrent_requests, self.current_concurrent_requests - 1)
                logger.warning(f"🔻 High error rate ({error_rate:.1%}), reducing concurrency to {self.current_concurrent_requests}")
            elif error_rate < 0.02 and self.current_concurrent_requests < self.max_concurrent_requests and self.stats_rate_limit_count == 0:
                # Very low error rate and no rate limits, cautiously increase
                self.current_concurrent_requests = min(self.max_concurrent_requests, self.current_concurrent_requests + 1)
                logger.info(f"🔺 Low error rate ({error_rate:.1%}), increasing concurrency to {self.current_concurrent_requests}")
            
            # Update semaphore with new limit
            self.semaphore = asyncio.Semaphore(self.current_concurrent_requests)
            
    async def get_instant_namespaces(self, limit: int = None) -> Dict[str, Any]:
        """Get popular namespaces instantly (no API calls)"""
        return await simple_galaxy_service.get_popular_namespaces(limit)
    
    @cached_galaxy_request("progressive_namespaces", ttl_seconds=3600)  # 1 hour cache
    async def get_all_namespaces_progressive(self) -> Dict[str, Any]:
        """Get all namespaces with progressive discovery and caching"""
        try:
            logger.info("Starting progressive namespace discovery")
            discovered_namespaces = {}
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                # Phase 1: Fast discovery with limited scope
                batch_size = 50
                max_pages = 100  # Limit discovery to 5000 collections for speed
                offset = 0
                
                for page in range(max_pages):
                    try:
                        url = f"{self.galaxy_base_url}/?limit={batch_size}&offset={offset}"
                        response = await client.get(url)
                        response.raise_for_status()
                        
                        data = response.json()
                        batch = data.get("data", [])
                        
                        if not batch:
                            break
                            
                        # Extract namespaces from this batch
                        for item in batch:
                            namespace = item.get("namespace", "")
                            if namespace and namespace not in discovered_namespaces:
                                discovered_namespaces[namespace] = {
                                    "name": namespace,
                                    "collection_count": 0,
                                    "total_downloads": 0
                                }
                        
                        if len(batch) < batch_size:
                            break
                            
                        offset += batch_size
                        
                    except Exception as e:
                        logger.warning(f"Error in discovery page {page}: {e}")
                        break
                
                logger.info(f"Discovered {len(discovered_namespaces)} namespaces, starting stats collection")
                
                # Phase 2: Collect stats in parallel batches
                namespace_names = list(discovered_namespaces.keys())
                stats_tasks = []
                
                for namespace_name in namespace_names:
                    task = self._get_namespace_stats_safe(client, namespace_name)
                    stats_tasks.append(task)
                
                # Process in batches to avoid overwhelming the API
                batch_size = 20
                valid_namespaces = []
                
                for i in range(0, len(stats_tasks), batch_size):
                    batch = stats_tasks[i:i + batch_size]
                    batch_results = await asyncio.gather(*batch, return_exceptions=True)
                    
                    # Process results
                    for stats in batch_results:
                        if isinstance(stats, dict) and stats.get("collection_count", 0) > 0:
                            valid_namespaces.append(stats)
                
                # Sort by collection count
                valid_namespaces.sort(key=lambda x: x["collection_count"], reverse=True)
                
                logger.info(f"Successfully collected stats for {len(valid_namespaces)} valid namespaces")
                
                return {
                    "namespaces": valid_namespaces,
                    "total_namespaces": len(valid_namespaces)
                }
                
        except Exception as e:
            logger.error(f"Error in progressive discovery: {e}")
            return {"namespaces": [], "total_namespaces": 0, "error": str(e)}
    
    async def _get_namespace_stats_safe(self, client: httpx.AsyncClient, namespace: str) -> Optional[Dict]:
        """Get namespace stats with error handling and adaptive concurrency"""
        async with self.semaphore:
            try:
                # Get collection count
                url = f"{self.galaxy_base_url}/?namespace={namespace}&limit=1"
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                count = data.get("meta", {}).get("count", 0)
                
                if count == 0:
                    self.stats_success_count += 1  # Count as success even if empty
                    await self._adjust_concurrency()
                    return None  # Skip empty namespaces
                
                stats = {
                    "name": namespace,
                    "collection_count": count,
                    "total_downloads": 0
                }
                
                # Get download stats sample
                if count > 0:
                    sample_limit = min(5, count)  # Quick sample
                    sample_url = f"{self.galaxy_base_url}/?namespace={namespace}&limit={sample_limit}"
                    sample_response = await client.get(sample_url)
                    sample_response.raise_for_status()
                    
                    sample_data = sample_response.json()
                    collections = sample_data.get("data", [])
                    total_downloads = sum(item.get("download_count", 0) for item in collections)
                    
                    # Estimate total downloads
                    if len(collections) > 0:
                        estimated_total = int(total_downloads * (count / len(collections)))
                        stats["total_downloads"] = estimated_total
                
                # Success!
                self.stats_success_count += 1
                await self._adjust_concurrency()
                return stats
                
            except httpx.HTTPStatusError as e:
                # Check for rate limiting
                if e.response.status_code == 429:
                    import time
                    self.stats_rate_limit_count += 1
                    self.last_429_time = time.time()
                    
                    # Get retry-after header if available
                    retry_after = e.response.headers.get('retry-after', '60')
                    logger.warning(f"🚨 Rate limit (429) hit for namespace {namespace}. Retry after: {retry_after}s")
                    
                    # Immediately reduce concurrency
                    self.current_concurrent_requests = self.min_concurrent_requests
                    self.semaphore = asyncio.Semaphore(self.current_concurrent_requests)
                    
                    # Wait before continuing
                    await asyncio.sleep(min(int(retry_after), 60))
                else:
                    self.stats_error_count += 1
                    logger.debug(f"HTTP error {e.response.status_code} for namespace {namespace}: {e}")
                
                await self._adjust_concurrency()
                return None
                
            except Exception as e:
                # Other errors
                self.stats_error_count += 1
                await self._adjust_concurrency()
                logger.debug(f"Failed to get stats for namespace {namespace}: {e}")
                return None
    
    async def stream_namespaces_progressive(self) -> AsyncIterator[str]:
        """Stream namespaces with parallel stats collection as they are discovered"""
        # Reset stats for this session
        self.stats_success_count = 0
        self.stats_error_count = 0
        self.current_concurrent_requests = self.initial_concurrent_requests
        self.semaphore = asyncio.Semaphore(self.current_concurrent_requests)
        
        try:
            # First, send popular namespaces instantly
            popular = await self.get_instant_namespaces()
            popular_names = {ns['name'] for ns in popular['namespaces']}
            
            yield f"data: {json.dumps({'type': 'popular', 'data': popular})}\n\n"
            logger.info(f"📡 Sent {len(popular['namespaces'])} popular namespaces")
            
            # Start real-time discovery
            yield f"data: {json.dumps({'type': 'status', 'message': f'Starting discovery with {self.current_concurrent_requests} concurrent stats collectors (adaptive mode)'})}\n\n"
            logger.info(f"🚀 Starting with {self.current_concurrent_requests} concurrent requests (adaptive: {self.min_concurrent_requests}-{self.max_concurrent_requests})")
            
            discovered_namespaces = {}
            stats_completed = 0
            pending_stats_tasks = {}  # namespace -> task
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                # Combined phase: Discovery + immediate parallel stats collection
                batch_size = 50
                max_pages = 50  # Reduced to avoid rate limiting (2500 collections max)
                offset = 0
                
                for page in range(max_pages):
                    try:
                        url = f"{self.galaxy_base_url}/?limit={batch_size}&offset={offset}"
                        response = await client.get(url)
                        response.raise_for_status()
                        
                        data = response.json()
                        batch = data.get("data", [])
                        
                        if not batch:
                            break
                            
                        # Extract new namespaces and immediately start stats collection
                        new_namespaces = []
                        new_stats_tasks = []
                        
                        for item in batch:
                            namespace = item.get("namespace", "")
                            if namespace and namespace not in discovered_namespaces and namespace not in popular_names:
                                discovered_namespaces[namespace] = {
                                    "name": namespace,
                                    "collection_count": 0,
                                    "total_downloads": 0
                                }
                                new_namespaces.append(namespace)
                                
                                # Start stats collection immediately in parallel
                                stats_task = asyncio.create_task(
                                    self._get_namespace_stats_safe(client, namespace)
                                )
                                pending_stats_tasks[namespace] = stats_task
                                new_stats_tasks.append(stats_task)
                        
                        # Send new namespaces immediately (without stats)
                        if new_namespaces:
                            basic_namespaces = []
                            for namespace_name in new_namespaces:
                                basic_namespaces.append({
                                    "name": namespace_name,
                                    "collection_count": 0,  # Will be updated when stats arrive
                                    "total_downloads": 0     # Will be updated when stats arrive
                                })
                            
                            total_discovered = len(discovered_namespaces)
                            yield f"data: {json.dumps({'type': 'namespace_batch', 'data': basic_namespaces, 'page': page+1, 'total_discovered': total_discovered})}\n\n"
                            logger.info(f"📡 Page {page+1}: Sent {len(new_namespaces)} new namespaces + started {len(new_stats_tasks)} stats tasks (total discovered: {total_discovered})")
                        
                        # Check for completed stats tasks and send updates immediately
                        completed_stats = []
                        completed_namespaces = []
                        
                        for namespace, task in list(pending_stats_tasks.items()):
                            if task.done():
                                try:
                                    stats = await task
                                    if isinstance(stats, dict) and stats.get("collection_count", 0) > 0:
                                        completed_stats.append(stats)
                                        stats_completed += 1
                                    completed_namespaces.append(namespace)
                                except Exception as e:
                                    logger.debug(f"Stats task failed for {namespace}: {e}")
                                    completed_namespaces.append(namespace)
                        
                        # Remove completed tasks
                        for namespace in completed_namespaces:
                            pending_stats_tasks.pop(namespace, None)
                        
                        # Send stats updates immediately
                        if completed_stats:
                            yield f"data: {json.dumps({'type': 'stats_update', 'data': completed_stats, 'stats_completed': stats_completed})}\n\n"
                            logger.info(f"📊 Real-time stats update: {len(completed_stats)} namespaces updated (total with stats: {stats_completed})")
                        
                        if len(batch) < batch_size:
                            break
                            
                        offset += batch_size
                        
                        # Delay between discovery batches to avoid overwhelming the API
                        await asyncio.sleep(0.5)
                        
                    except Exception as e:
                        logger.warning(f"Error in discovery page {page}: {e}")
                        break
                
                # Discovery complete - wait for remaining stats tasks
                yield f"data: {json.dumps({'type': 'status', 'message': f'Discovery complete. Waiting for remaining {len(pending_stats_tasks)} stats tasks...'})}\n\n"
                
                # Process remaining pending stats tasks in batches for performance
                remaining_tasks = list(pending_stats_tasks.values())
                remaining_namespaces = list(pending_stats_tasks.keys())
                
                if remaining_tasks:
                    # Process remaining tasks in batches
                    batch_size_final = 20
                    for i in range(0, len(remaining_tasks), batch_size_final):
                        batch_tasks = remaining_tasks[i:i + batch_size_final]
                        batch_namespaces = remaining_namespaces[i:i + batch_size_final]
                        
                        # Wait for this batch to complete
                        batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                        
                        # Send stats updates for completed ones
                        batch_completed_stats = []
                        for j, stats in enumerate(batch_results):
                            if isinstance(stats, dict) and stats.get("collection_count", 0) > 0:
                                batch_completed_stats.append(stats)
                                stats_completed += 1
                        
                        if batch_completed_stats:
                            yield f"data: {json.dumps({'type': 'stats_update', 'data': batch_completed_stats, 'stats_completed': stats_completed})}\n\n"
                            logger.info(f"📊 Final stats batch: {len(batch_completed_stats)} namespaces updated (total with stats: {stats_completed})")
            
            # Send completion signal
            total_namespaces = len(popular['namespaces']) + len(discovered_namespaces)
            yield f"data: {json.dumps({'type': 'complete', 'total': total_namespaces, 'discovered': len(discovered_namespaces), 'popular': len(popular['namespaces']), 'stats_completed': stats_completed})}\n\n"
            logger.info(f"📡 Streaming complete! Total: {total_namespaces} namespaces ({stats_completed} with stats)")
            
        except Exception as e:
            logger.error(f"Error in stream_namespaces_progressive: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    async def preload_popular_collections(self, namespace_count: int = 10) -> Dict[str, Any]:
        """Preload collections for most popular namespaces"""
        try:
            popular = await self.get_instant_namespaces(limit=namespace_count)
            
            # Import the collections service
            from .galaxy_service_optimized import optimized_galaxy_service
            
            preload_tasks = []
            for ns in popular['namespaces'][:namespace_count]:
                task = optimized_galaxy_service.get_all_collections(ns['name'])
                preload_tasks.append((ns['name'], task))
            
            # Execute preload tasks
            results = await asyncio.gather(*[task for _, task in preload_tasks], return_exceptions=True)
            
            successful = 0
            total_collections = 0
            
            for i, result in enumerate(results):
                if isinstance(result, dict) and 'collections' in result:
                    successful += 1
                    total_collections += len(result['collections'])
                    namespace_name = preload_tasks[i][0]
                    logger.info(f"Preloaded {len(result['collections'])} collections for {namespace_name}")
            
            return {
                "status": "success",
                "namespaces_preloaded": successful,
                "total_collections_preloaded": total_collections
            }
            
        except Exception as e:
            logger.error(f"Error preloading collections: {e}")
            return {"status": "error", "error": str(e)}

# Singleton instance
hybrid_galaxy_service = HybridGalaxyService()