import { getHttpClient } from '../utils/httpClient'

/**
 * Galaxy Source configuration
 */
export interface GalaxySource {
  id: string
  name: string
  source_type: 'public' | 'private'
  url: string
  description?: string
  is_active: boolean
  priority: number
  has_token: boolean
  token_masked?: string
  last_test_at?: string
  last_test_status?: 'success' | 'failed' | 'timeout'
  created_at: string
  updated_at: string
  created_by: string
}

/**
 * Response for listing Galaxy sources
 */
interface GalaxySourceListResponse {
  sources: GalaxySource[]
  total: number
}

/**
 * Request for creating a Galaxy source
 */
export interface GalaxySourceCreate {
  name: string
  source_type: 'public' | 'private'
  url: string
  description?: string
  is_active?: boolean
  priority?: number
  token?: string
}

/**
 * Request for updating a Galaxy source
 */
export interface GalaxySourceUpdate {
  name?: string
  url?: string
  description?: string
  is_active?: boolean
  priority?: number
  token?: string
}

/**
 * Response from testing a Galaxy source connection
 */
export interface GalaxySourceTestResponse {
  success: boolean
  message: string
  response_time_ms?: number
  api_version?: string
  collections_count?: number
}

/**
 * Request to test a Galaxy source (for testing before save)
 */
export interface GalaxySourceTestRequest {
  url: string
  token?: string
  source_type: 'public' | 'private'
}

// Cache management
interface CacheEntry {
  data: GalaxySource[]
  timestamp: number
}

const CACHE_TTL_MS = 60000 // 1 minute
let cache: CacheEntry | null = null

const invalidateCache = (): void => {
  cache = null
}

const isCacheValid = (): boolean => {
  return cache !== null && Date.now() - cache.timestamp < CACHE_TTL_MS
}

/**
 * Galaxy Source Service
 *
 * Handles API calls for Galaxy source configuration management.
 * All operations require admin privileges.
 */
export const galaxySourceService = {
  /**
   * Get all Galaxy sources (admin only)
   * Results are cached for 1 minute
   */
  async adminGetAllSources(forceRefresh = false): Promise<GalaxySource[]> {
    if (!forceRefresh && isCacheValid()) {
      return cache!.data
    }

    try {
      const http = getHttpClient()
      const response = await http.get<GalaxySourceListResponse>('/galaxy-sources/admin')

      cache = {
        data: response.data.sources,
        timestamp: Date.now(),
      }

      return response.data.sources
    } catch (error: unknown) {
      console.error('Failed to get Galaxy sources:', error)
      throw error
    }
  },

  /**
   * Create a new Galaxy source (admin only)
   */
  async adminCreateSource(data: GalaxySourceCreate): Promise<GalaxySource> {
    try {
      const http = getHttpClient()
      const response = await http.post<GalaxySource>('/galaxy-sources/admin', data)
      invalidateCache()
      return response.data
    } catch (error: unknown) {
      console.error('Failed to create Galaxy source:', error)
      throw error
    }
  },

  /**
   * Update a Galaxy source (admin only)
   */
  async adminUpdateSource(id: string, data: GalaxySourceUpdate): Promise<GalaxySource> {
    try {
      const http = getHttpClient()
      const response = await http.put<GalaxySource>(`/galaxy-sources/admin/${id}`, data)
      invalidateCache()
      return response.data
    } catch (error: unknown) {
      console.error('Failed to update Galaxy source:', error)
      throw error
    }
  },

  /**
   * Delete a Galaxy source (admin only)
   */
  async adminDeleteSource(id: string): Promise<void> {
    try {
      const http = getHttpClient()
      await http.delete(`/galaxy-sources/admin/${id}`)
      invalidateCache()
    } catch (error: unknown) {
      console.error('Failed to delete Galaxy source:', error)
      throw error
    }
  },

  /**
   * Toggle active status (admin only)
   */
  async adminToggleSource(id: string, isActive: boolean): Promise<GalaxySource> {
    try {
      const http = getHttpClient()
      const response = await http.patch<GalaxySource>(
        `/galaxy-sources/admin/${id}/toggle`,
        null,
        { params: { is_active: isActive } }
      )
      invalidateCache()
      return response.data
    } catch (error: unknown) {
      console.error('Failed to toggle Galaxy source:', error)
      throw error
    }
  },

  /**
   * Reorder sources (admin only)
   */
  async adminReorderSources(sourceIds: string[]): Promise<void> {
    try {
      const http = getHttpClient()
      await http.post('/galaxy-sources/admin/reorder', {
        source_ids: sourceIds,
      })
      invalidateCache()
    } catch (error: unknown) {
      console.error('Failed to reorder Galaxy sources:', error)
      throw error
    }
  },

  /**
   * Test connection to an existing source (admin only)
   */
  async adminTestSource(id: string): Promise<GalaxySourceTestResponse> {
    try {
      const http = getHttpClient()
      const response = await http.post<GalaxySourceTestResponse>(
        `/galaxy-sources/admin/${id}/test`
      )
      invalidateCache() // Test updates last_test_at/status
      return response.data
    } catch (error: unknown) {
      console.error('Failed to test Galaxy source:', error)
      throw error
    }
  },

  /**
   * Test connection before saving (admin only)
   */
  async adminTestConnection(data: GalaxySourceTestRequest): Promise<GalaxySourceTestResponse> {
    try {
      const http = getHttpClient()
      const response = await http.post<GalaxySourceTestResponse>(
        '/galaxy-sources/admin/test-connection',
        data
      )
      return response.data
    } catch (error: unknown) {
      console.error('Failed to test Galaxy connection:', error)
      throw error
    }
  },

  /**
   * Invalidate cache (call after operations that modify sources)
   */
  invalidateCache,
}
