"""
Cache Storage Service - In-memory cache with optional Redis persistence
"""

import json
import time
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class CacheStorageService:
    """
    Cache storage with multiple backends:
    - In-memory (default, always available)
    - Redis (optional, for persistence and sharing between instances)
    """
    
    def __init__(self, use_redis: bool = False):
        self.use_redis = use_redis
        self.redis_client = None
        
        # In-memory cache storage
        self.memory_cache: Dict[str, Any] = {}
        self.cache_metadata: Dict[str, Dict] = {}  # TTL, timestamps, etc.
        
        # Initialize Redis if requested
        if use_redis:
            self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection (optional)"""
        try:
            import redis
            self.redis_client = redis.Redis(
                host='localhost', 
                port=6379, 
                db=0, 
                decode_responses=True
            )
            # Test connection
            self.redis_client.ping()
            logger.info("✅ Redis cache initialized successfully")
        except ImportError:
            logger.warning("⚠️ Redis not available, using memory cache only")
            self.use_redis = False
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}, using memory cache only")
            self.use_redis = False
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """
        Store value in cache with optional TTL
        Returns True if stored successfully
        """
        try:
            now = time.time()
            
            # Store in memory
            self.memory_cache[key] = value
            self.cache_metadata[key] = {
                'created_at': now,
                'ttl_seconds': ttl_seconds,
                'expires_at': now + ttl_seconds if ttl_seconds else None
            }
            
            # Store in Redis if available
            if self.use_redis and self.redis_client:
                try:
                    serialized = json.dumps(value, default=str)  # Handle datetime objects
                    if ttl_seconds:
                        self.redis_client.setex(key, ttl_seconds, serialized)
                    else:
                        self.redis_client.set(key, serialized)
                except Exception as e:
                    logger.warning(f"Failed to store in Redis: {e}")
            
            logger.debug(f"Cached '{key}' (TTL: {ttl_seconds}s)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache '{key}': {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve value from cache
        Returns None if not found or expired
        """
        try:
            # Check if expired in memory
            if key in self.cache_metadata:
                metadata = self.cache_metadata[key]
                if metadata['expires_at'] and time.time() > metadata['expires_at']:
                    # Expired, remove from memory
                    self._remove_from_memory(key)
                    return None
            
            # Try memory cache first
            if key in self.memory_cache:
                return self.memory_cache[key]
            
            # Try Redis as fallback
            if self.use_redis and self.redis_client:
                try:
                    redis_value = self.redis_client.get(key)
                    if redis_value:
                        # Parse and store back in memory
                        value = json.loads(redis_value)
                        self.memory_cache[key] = value
                        return value
                except Exception as e:
                    logger.debug(f"Redis fallback failed for '{key}': {e}")
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve '{key}': {e}")
            return None
    
    def exists(self, key: str) -> bool:
        """Check if key exists and is not expired"""
        return self.get(key) is not None
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            # Remove from memory
            removed = self._remove_from_memory(key)
            
            # Remove from Redis
            if self.use_redis and self.redis_client:
                try:
                    self.redis_client.delete(key)
                except Exception as e:
                    logger.debug(f"Redis delete failed for '{key}': {e}")
            
            return removed
            
        except Exception as e:
            logger.error(f"Failed to delete '{key}': {e}")
            return False
    
    def clear(self, pattern: Optional[str] = None) -> bool:
        """
        Clear cache entries
        If pattern provided, only clear keys matching pattern (e.g., 'galaxy:*')
        """
        try:
            if pattern:
                # Clear matching keys
                keys_to_remove = [k for k in self.memory_cache.keys() if self._matches_pattern(k, pattern)]
                for key in keys_to_remove:
                    self._remove_from_memory(key)
                    
                # Clear from Redis too
                if self.use_redis and self.redis_client:
                    try:
                        redis_keys = self.redis_client.keys(pattern)
                        if redis_keys:
                            self.redis_client.delete(*redis_keys)
                    except Exception as e:
                        logger.debug(f"Redis pattern clear failed: {e}")
                        
                logger.info(f"Cleared {len(keys_to_remove)} cache entries matching '{pattern}'")
            else:
                # Clear all
                self.memory_cache.clear()
                self.cache_metadata.clear()
                
                if self.use_redis and self.redis_client:
                    try:
                        self.redis_client.flushdb()
                    except Exception as e:
                        logger.debug(f"Redis flush failed: {e}")
                        
                logger.info("Cleared all cache entries")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        now = time.time()
        total_entries = len(self.memory_cache)
        expired_entries = 0
        
        for metadata in self.cache_metadata.values():
            if metadata['expires_at'] and now > metadata['expires_at']:
                expired_entries += 1
        
        stats = {
            'total_entries': total_entries,
            'expired_entries': expired_entries,
            'valid_entries': total_entries - expired_entries,
            'redis_enabled': self.use_redis and self.redis_client is not None,
            'memory_cache_size': len(self.memory_cache),
            'metadata_size': len(self.cache_metadata)
        }
        
        # Add Redis stats if available
        if self.use_redis and self.redis_client:
            try:
                info = self.redis_client.info()
                stats['redis_stats'] = {
                    'connected_clients': info.get('connected_clients', 0),
                    'used_memory': info.get('used_memory_human', 'unknown'),
                    'total_commands_processed': info.get('total_commands_processed', 0)
                }
            except Exception as e:
                stats['redis_stats'] = {'error': str(e)}
        
        return stats
    
    def cleanup_expired(self) -> int:
        """Remove expired entries from memory cache"""
        now = time.time()
        expired_keys = []
        
        for key, metadata in self.cache_metadata.items():
            if metadata['expires_at'] and now > metadata['expires_at']:
                expired_keys.append(key)
        
        for key in expired_keys:
            self._remove_from_memory(key)
        
        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
        
        return len(expired_keys)
    
    def _remove_from_memory(self, key: str) -> bool:
        """Remove key from memory cache and metadata"""
        removed = key in self.memory_cache
        self.memory_cache.pop(key, None)
        self.cache_metadata.pop(key, None)
        return removed
    
    def _matches_pattern(self, key: str, pattern: str) -> bool:
        """Simple pattern matching (supports * wildcard)"""
        if '*' not in pattern:
            return key == pattern
        
        # Convert glob pattern to regex-like matching
        parts = pattern.split('*')
        if len(parts) == 2:
            prefix, suffix = parts
            return key.startswith(prefix) and key.endswith(suffix)
        elif pattern.endswith('*'):
            return key.startswith(pattern[:-1])
        elif pattern.startswith('*'):
            return key.endswith(pattern[1:])
        
        return key == pattern


class GalaxyCacheKeys:
    """Cache key constants for Galaxy data"""
    
    POPULAR_NAMESPACES = "galaxy:popular_namespaces"
    ALL_NAMESPACES = "galaxy:all_namespaces"
    NAMESPACE_COLLECTIONS = "galaxy:namespace:{namespace}:collections"
    COLLECTION_VERSIONS = "galaxy:collection:{namespace}.{collection}:versions"
    COLLECTION_MODULES = "galaxy:modules:{namespace}.{collection}:{version}"
    SYNC_STATUS = "galaxy:sync_status"
    
    @classmethod
    def namespace_collections(cls, namespace: str) -> str:
        return cls.NAMESPACE_COLLECTIONS.format(namespace=namespace)
    
    @classmethod
    def collection_versions(cls, namespace: str, collection: str) -> str:
        return cls.COLLECTION_VERSIONS.format(namespace=namespace, collection=collection)
    
    @classmethod
    def collection_modules(cls, namespace: str, collection: str, version: str) -> str:
        return cls.COLLECTION_MODULES.format(namespace=namespace, collection=collection, version=version)


# Create a singleton instance for Galaxy cache
# Use Redis in production, memory-only for development
galaxy_cache = CacheStorageService(use_redis=False)  # Set to True for Redis usage