import { getHttpClient } from '../utils/httpClient'

// Types
export interface Namespace {
  name: string
  collection_count: number
  total_downloads: number
}

// Cache configuration
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>()
  
  set<T>(key: string, data: T, ttlMinutes = 10): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiry: now + (ttlMinutes * 60 * 1000)
    })
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key)
  }
}

const cache = new ApiCache()

export interface Collection {
  name: string
  namespace: string
  description: string
  latest_version: string
  download_count: number
  created_at: string
  updated_at: string
  deprecated: boolean
}

export interface Version {
  version: string
  requires_ansible: string
  created_at: string
  updated_at: string
  href: string
}

export interface Module {
  name: string
  description: string
  content_type: string
}

export interface CollectionInfo {
  description: string
  license: string[]
  tags: string[]
  authors: string[]
}

// Galaxy Service
export const galaxyService = {
  // Get namespaces with collection counts
  async getNamespaces(limit = 50) {
    const cacheKey = `namespaces-${limit}`
    
    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached) {
      console.log('Using cached namespaces data')
      return cached
    }
    
    try {
      console.log('Fetching fresh namespaces data...')
      const response = await getHttpClient().get(`/galaxy/namespaces?limit=${limit}`)
      
      // Cache for 15 minutes (namespaces don't change often)
      cache.set(cacheKey, response.data, 15)
      
      return response.data
    } catch (error) {
      console.error('Error fetching namespaces:', error)
      throw error
    }
  },

  // Get collections for a namespace
  async getCollections(namespace: string, limit = 50) {
    const cacheKey = `collections-${namespace}-${limit}`
    
    const cached = cache.get(cacheKey)
    if (cached) {
      console.log(`Using cached collections data for ${namespace}`)
      return cached
    }
    
    try {
      const response = await getHttpClient().get(
        `/galaxy/namespaces/${namespace}/collections?limit=${limit}`
      )
      
      // Cache for 10 minutes
      cache.set(cacheKey, response.data, 10)
      
      return response.data
    } catch (error) {
      console.error(`Error fetching collections for ${namespace}:`, error)
      throw error
    }
  },

  // Get versions for a collection
  async getVersions(namespace: string, collection: string, limit = 50) {
    try {
      const response = await getHttpClient().get(
        `/galaxy/namespaces/${namespace}/collections/${collection}/versions?limit=${limit}`
      )
      return response.data
    } catch (error) {
      console.error(`Error fetching versions for ${namespace}.${collection}:`, error)
      throw error
    }
  },

  // Get modules for a specific version
  async getModules(namespace: string, collection: string, version: string) {
    try {
      const response = await getHttpClient().get(
        `/galaxy/namespaces/${namespace}/collections/${collection}/versions/${version}/modules`
      )
      return response.data
    } catch (error) {
      console.error(`Error fetching modules for ${namespace}.${collection}:${version}:`, error)
      throw error
    }
  },

  // Search collections
  async searchCollections(query: string, limit = 20) {
    try {
      const response = await getHttpClient().get(
        `/galaxy/search?q=${encodeURIComponent(query)}&limit=${limit}`
      )
      return response.data
    } catch (error) {
      console.error(`Error searching collections for "${query}":`, error)
      throw error
    }
  },
}