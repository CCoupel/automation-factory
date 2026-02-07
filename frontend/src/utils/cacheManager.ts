/**
 * Generic Cache Manager
 *
 * Provides a unified caching solution for frontend services.
 * Features:
 * - Generic type support
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 */

interface CacheEntry<T> {
  data: T
  expiry: number
}

/**
 * Generic cache manager with TTL support
 *
 * @example
 * ```typescript
 * // Create a cache with 5 minute TTL
 * const cache = new CacheManager<UserData>(5 * 60 * 1000)
 *
 * // Store data
 * cache.set('user-123', userData)
 *
 * // Retrieve data (returns null if expired or not found)
 * const user = cache.get('user-123')
 *
 * // Check if key exists (and is not expired)
 * if (cache.has('user-123')) { ... }
 *
 * // Clear all cache entries
 * cache.clear()
 * ```
 */
export class CacheManager<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private readonly ttlMs: number

  /**
   * Create a new CacheManager
   * @param ttlMs Time-to-live in milliseconds (default: 5 minutes)
   */
  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.ttlMs = ttlMs
  }

  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns Cached value or null if not found/expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check expiration
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * Store a value in the cache
   * @param key Cache key
   * @param data Value to cache
   * @param customTtlMs Optional custom TTL for this entry
   */
  set(key: string, data: T, customTtlMs?: number): void {
    const ttl = customTtlMs ?? this.ttlMs
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    })
  }

  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   * @returns true if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Delete a specific key from cache
   * @param key Cache key
   * @returns true if key was deleted
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get the number of entries in cache (including potentially expired ones)
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Remove all expired entries from cache
   * @returns Number of entries removed
   */
  cleanup(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   * @param key Cache key
   * @param fetchFn Function to execute if cache miss
   * @param customTtlMs Optional custom TTL
   * @returns Cached or freshly fetched value
   */
  async getOrSet(key: string, fetchFn: () => Promise<T>, customTtlMs?: number): Promise<T> {
    const cached = this.get(key)
    if (cached !== null) {
      return cached
    }

    const data = await fetchFn()
    this.set(key, data, customTtlMs)
    return data
  }
}

/**
 * Pre-configured cache instances for common use cases
 */
export const caches = {
  /** Short-lived cache (1 minute) - for frequently changing data */
  short: new CacheManager<unknown>(60 * 1000),

  /** Medium cache (5 minutes) - default for most use cases */
  medium: new CacheManager<unknown>(5 * 60 * 1000),

  /** Long cache (30 minutes) - for stable data */
  long: new CacheManager<unknown>(30 * 60 * 1000),

  /** Extended cache (2 hours) - for very stable data */
  extended: new CacheManager<unknown>(2 * 60 * 60 * 1000)
}
