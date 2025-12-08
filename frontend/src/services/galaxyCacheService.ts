/**
 * Galaxy Cache Service - Frontend
 * Fetches cached Galaxy data from backend at startup
 */

import { getHttpClient } from '../utils/httpClient'
import { Namespace } from './galaxyService'

// Types for cached data
export interface CacheStatus {
  sync: {
    sync_status: string
    last_sync_time: string | null
    sync_duration_seconds: number | null
    stats: {
      total_namespaces: number
      total_collections: number
      total_modules: number
    }
    cache_sizes: {
      namespaces: number
      collections: number
      modules: number
      popular_namespaces: number
    }
  }
  cache: {
    total_entries: number
    expired_entries: number
    valid_entries: number
    redis_enabled: boolean
  }
  timestamp: string | null
}

export interface CachedCollection {
  name: string
  description?: string
  latest_version: string
  download_count: number
  created_at: string
  updated_at: string
  requires_ansible?: string
  deprecated?: boolean
}

export interface AllCachedData {
  popular_namespaces: Namespace[]
  all_namespaces: Namespace[]
  collections_sample: Record<string, CachedCollection[]>
  cache_info: {
    sync_status: string
    last_sync: string | null
    stats: Record<string, number>
  }
  cached: boolean
  timestamp: string | null
}

export interface CachedModulesResponse {
  namespace: string
  collection: string
  version: string
  modules: any[]
  plugins: any[]
  total_modules: number
  total_plugins: number
  cached: boolean
}

class GalaxyCacheService {
  private baseUrl = '/galaxy/cache'
  private httpClient = getHttpClient()
  
  // Cache status
  private lastCacheCheck: Date | null = null
  private cacheCheckInterval = 5 * 60 * 1000 // 5 minutes
  
  /**
   * Get all cached Galaxy data in one request
   * This is the main method for frontend startup
   */
  async getAllCachedData(): Promise<AllCachedData | null> {
    try {
      console.log('🔍 Fetching all cached Galaxy data...')
      const response = await this.httpClient.get<AllCachedData>(`${this.baseUrl}/all`)
      
      const data = response.data
      console.log(`✅ Loaded cached data:`, {
        popular_namespaces: data.popular_namespaces?.length || 0,
        all_namespaces: data.all_namespaces?.length || 0,
        collections_sample: Object.keys(data.collections_sample || {}).length,
        sync_status: data.cache_info?.sync_status,
        last_sync: data.cache_info?.last_sync
      })
      
      this.lastCacheCheck = new Date()
      return data
      
    } catch (error) {
      console.error('❌ Failed to load cached Galaxy data:', error)
      return null
    }
  }
  
  /**
   * Get cache status and statistics
   */
  async getCacheStatus(): Promise<CacheStatus | null> {
    try {
      const response = await this.httpClient.get<CacheStatus>(`${this.baseUrl}/status`)
      return response.data
    } catch (error) {
      console.error('Failed to get cache status:', error)
      return null
    }
  }
  
  /**
   * Get cached namespaces
   */
  async getCachedNamespaces(popularOnly: boolean = false): Promise<{ namespaces: Namespace[]; total_namespaces: number } | null> {
    try {
      const params = popularOnly ? '?popular_only=true' : ''
      const response = await this.httpClient.get(`${this.baseUrl}/namespaces${params}`)
      return response.data
    } catch (error) {
      console.error('Failed to get cached namespaces:', error)
      return null
    }
  }
  
  /**
   * Get cached collections for a namespace
   */
  async getCachedCollections(namespace: string): Promise<{ collections: CachedCollection[]; total_collections: number } | null> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/namespaces/${namespace}/collections`)
      return response.data
    } catch (error) {
      console.error(`Failed to get cached collections for ${namespace}:`, error)
      return null
    }
  }
  
  /**
   * Get cached modules for a collection version
   */
  async getCachedModules(namespace: string, collection: string, version: string): Promise<CachedModulesResponse | null> {
    try {
      const response = await this.httpClient.get<CachedModulesResponse>(
        `${this.baseUrl}/collections/${namespace}.${collection}/versions/${version}/modules`
      )
      return response.data
    } catch (error) {
      console.error(`Failed to get cached modules for ${namespace}.${collection}:${version}:`, error)
      return null
    }
  }
  
  /**
   * Force refresh of backend cache
   */
  async refreshCache(): Promise<boolean> {
    try {
      console.log('🔄 Requesting cache refresh...')
      await this.httpClient.post(`${this.baseUrl}/refresh`)
      console.log('✅ Cache refresh initiated')
      return true
    } catch (error) {
      console.error('Failed to refresh cache:', error)
      return false
    }
  }
  
  /**
   * Check if cache data is recent enough
   */
  isCacheCheckNeeded(): boolean {
    if (!this.lastCacheCheck) return true
    
    const now = new Date().getTime()
    const lastCheck = this.lastCacheCheck.getTime()
    return (now - lastCheck) > this.cacheCheckInterval
  }
  
  /**
   * Get debug information about cache
   */
  async getDebugInfo(): Promise<any> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/debug`)
      return response.data
    } catch (error) {
      console.error('Failed to get debug info:', error)
      return null
    }
  }
}

// Singleton instance
export const galaxyCacheService = new GalaxyCacheService()