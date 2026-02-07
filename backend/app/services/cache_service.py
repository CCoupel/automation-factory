"""
Enhanced cache service for Galaxy API responses with statistics

Features:
- In-memory cache with TTL
- Statistics tracking (hits, misses, expired)
- Pattern-based key deletion
- Generic @cached_async decorator for any async function
"""

import json
import hashlib
from functools import wraps
from typing import Any, Dict, Optional, List, Callable, TypeVar
import logging
import time
from datetime import datetime

T = TypeVar('T')

logger = logging.getLogger(__name__)

class EnhancedCache:
    """
    Enhanced in-memory cache with statistics and pattern-based operations
    In production, replace with Redis
    """
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0,
            "expired": 0
        }
        
    def _make_key(self, prefix: str, **kwargs) -> str:
        """Create a cache key from parameters"""
        key_parts = [prefix]
        for k, v in sorted(kwargs.items()):
            if v is not None:  # Skip None values
                key_parts.append(f"{k}:{v}")
        return ":".join(key_parts)
        
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        entry = self._cache.get(key)
        if not entry:
            self._stats["misses"] += 1
            return None
            
        # TTL check
        if time.time() > entry["expires"]:
            del self._cache[key]
            self._stats["expired"] += 1
            self._stats["misses"] += 1
            return None
            
        self._stats["hits"] += 1
        logger.debug(f"Cache HIT for key: {key}")
        return entry["data"]
        
    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Set value in cache with TTL"""
        self._cache[key] = {
            "data": value,
            "expires": time.time() + ttl_seconds,
            "created_at": time.time(),
            "ttl": ttl_seconds
        }
        self._stats["sets"] += 1
        logger.debug(f"Cache SET for key: {key}, TTL: {ttl_seconds}s")
        
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            self._stats["deletes"] += 1
            return True
        return False
        
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern (supports * wildcard)"""
        import fnmatch
        keys_to_delete = [k for k in self._cache.keys() if fnmatch.fnmatch(k, pattern)]
        for key in keys_to_delete:
            del self._cache[key]
        self._stats["deletes"] += len(keys_to_delete)
        logger.info(f"Deleted {len(keys_to_delete)} keys matching pattern: {pattern}")
        return len(keys_to_delete)
        
    def clear(self) -> None:
        """Clear all cache"""
        count = len(self._cache)
        self._cache.clear()
        self._stats["deletes"] += count
        logger.info("Cache cleared")
        
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self._stats["hits"] + self._stats["misses"]
        hit_rate = (self._stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        # Clean up expired entries
        current_time = time.time()
        expired_keys = [k for k, v in self._cache.items() if current_time > v["expires"]]
        for key in expired_keys:
            del self._cache[key]
            self._stats["expired"] += 1
        
        return {
            "total_keys": len(self._cache),
            "hits": self._stats["hits"],
            "misses": self._stats["misses"],
            "hit_rate": f"{hit_rate:.1f}%",
            "sets": self._stats["sets"],
            "deletes": self._stats["deletes"],
            "expired": self._stats["expired"],
            "memory_entries": len(self._cache)
        }
        
    def get_keys(self, pattern: str = "*") -> List[str]:
        """Get all keys matching pattern"""
        import fnmatch
        return [k for k in self._cache.keys() if fnmatch.fnmatch(k, pattern)]

# Global cache instance
cache = EnhancedCache()

def cached_async(ttl_seconds: int, key_fn: Callable[..., str]):
    """
    Generic decorator for caching async function results.

    Args:
        ttl_seconds: Time-to-live for cached results in seconds
        key_fn: Function that generates cache key from function arguments

    Example:
        @cached_async(
            ttl_seconds=3600,
            key_fn=lambda self, version: f"namespaces:{version}"
        )
        async def get_namespaces(self, version: str) -> List[Dict]:
            ...

    Note:
        The key_fn receives the same arguments as the decorated function.
        For instance methods, 'self' is the first argument.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = key_fn(*args, **kwargs)

            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl_seconds)

            return result
        return wrapper
    return decorator


def cached_galaxy_request(cache_key_prefix: str, ttl_seconds: int = 900):
    """
    Decorator for caching Galaxy API requests (legacy).
    Consider using cached_async for new code.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create cache key
            cache_key = cache._make_key(cache_key_prefix, **kwargs)

            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl_seconds)

            return result
        return wrapper
    return decorator