"""
Cache service for Galaxy API responses
"""

import json
import hashlib
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class SimpleCache:
    """
    Simple in-memory cache for development
    In production, replace with Redis
    """
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        
    def _make_key(self, prefix: str, **kwargs) -> str:
        """Create a cache key from parameters"""
        key_parts = [prefix]
        for k, v in sorted(kwargs.items()):
            key_parts.append(f"{k}:{v}")
        return ":".join(key_parts)
        
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        entry = self._cache.get(key)
        if not entry:
            return None
            
        # Simple TTL check
        import time
        if time.time() > entry["expires"]:
            del self._cache[key]
            return None
            
        logger.info(f"Cache HIT for key: {key}")
        return entry["data"]
        
    def set(self, key: str, value: Any, ttl_seconds: int = 300) -> None:
        """Set value in cache with TTL"""
        import time
        self._cache[key] = {
            "data": value,
            "expires": time.time() + ttl_seconds
        }
        logger.info(f"Cache SET for key: {key}, TTL: {ttl_seconds}s")
        
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
        
    def clear(self) -> None:
        """Clear all cache"""
        self._cache.clear()
        logger.info("Cache cleared")

# Global cache instance
cache = SimpleCache()

def cached_galaxy_request(cache_key_prefix: str, ttl_seconds: int = 900):
    """
    Decorator for caching Galaxy API requests
    """
    def decorator(func):
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