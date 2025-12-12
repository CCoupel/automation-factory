import { getHttpClient } from '../utils/httpClient'

// Types
export interface Namespace {
  name: string
  collection_count: number
  total_downloads: number
  description?: string
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
  requires_ansible?: string // From latest version
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
  // Get ALL namespaces (backend handles pagination and limits)
  async getNamespaces() {
    const cacheKey = 'namespaces-all'
    
    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached) {
      console.log('Using cached namespaces data')
      return cached
    }
    
    try {
      console.log('Fetching ALL namespaces data...')
      const response = await getHttpClient().get('/galaxy/namespaces')
      
      // Cache for 15 minutes (namespaces don't change often)
      cache.set(cacheKey, response.data, 15)
      console.log(`Loaded ${response.data.namespaces?.length || 0} namespaces (${response.data.status || 'live'})`)
      
      return response.data
    } catch (error) {
      console.error('Error fetching namespaces:', error)
      throw error
    }
  },

  // Get ALL collections for a namespace (backend handles pagination)
  async getCollections(namespace: string) {
    const cacheKey = `collections-${namespace}-all`
    
    const cached = cache.get(cacheKey)
    if (cached) {
      console.log(`Using cached collections data for ${namespace}`)
      return cached
    }
    
    try {
      console.log(`Fetching ALL collections for namespace: ${namespace}`)
      const response = await getHttpClient().get(
        `/galaxy/namespaces/${namespace}/collections`
      )
      
      // Cache for 10 minutes
      cache.set(cacheKey, response.data, 10)
      console.log(`Loaded ${response.data.collections?.length || 0} collections for ${namespace}`)
      
      return response.data
    } catch (error) {
      console.error(`Error fetching collections for ${namespace}:`, error)
      throw error
    }
  },

  // Get ALL versions for a collection (backend handles pagination)
  async getVersions(namespace: string, collection: string) {
    const cacheKey = `versions-${namespace}-${collection}-all`
    
    const cached = cache.get(cacheKey)
    if (cached) {
      console.log(`Using cached versions data for ${namespace}.${collection}`)
      return cached
    }
    
    try {
      console.log(`Fetching ALL versions for ${namespace}.${collection}`)
      const response = await getHttpClient().get(
        `/galaxy/namespaces/${namespace}/collections/${collection}/versions`
      )
      
      // Cache for 10 minutes
      cache.set(cacheKey, response.data, 10)
      console.log(`Loaded ${response.data.versions?.length || 0} versions for ${namespace}.${collection}`)
      
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

  // Search collections (remove limit - let backend handle pagination)
  async searchCollections(query: string) {
    try {
      const response = await getHttpClient().get(
        `/galaxy/search?q=${encodeURIComponent(query)}`
      )
      return response.data
    } catch (error) {
      console.error(`Error searching collections for "${query}":`, error)
      throw error
    }
  },

  // Preload cache on backend for faster access
  async preloadCache(namespacesLimit: number = 20) {
    try {
      console.log(`Preloading cache for top ${namespacesLimit} namespaces...`)
      const response = await getHttpClient().post(
        `/galaxy/preload-cache?namespaces_limit=${namespacesLimit}`
      )
      console.log('Cache preload completed:', response.data)
      return response.data
    } catch (error) {
      console.error('Error preloading cache:', error)
      throw error
    }
  },

  // Get cache statistics
  async getCacheStats() {
    try {
      const response = await getHttpClient().get('/galaxy/cache/stats')
      return response.data
    } catch (error) {
      console.error('Error fetching cache stats:', error)
      throw error
    }
  },

  // Clear cache (frontend and backend)
  async clearCache(pattern?: string) {
    try {
      // Clear frontend cache
      if (!pattern) {
        cache.clear()
        console.log('Frontend cache cleared')
      } else {
        // Clear specific keys matching pattern
        const keys = Array.from((cache as any).cache.keys())
        keys.forEach((key: string) => {
          if (key.includes(pattern)) {
            cache.delete(key)
          }
        })
      }

      // Clear backend cache
      const url = pattern 
        ? `/galaxy/cache?pattern=${encodeURIComponent(pattern)}`
        : '/galaxy/cache'
      const response = await getHttpClient().delete(url)
      console.log('Backend cache cleared:', response.data)
      return response.data
    } catch (error) {
      console.error('Error clearing cache:', error)
      throw error
    }
  },

  // Batch preload multiple namespaces' collections
  async preloadNamespaceCollections(namespaces: string[]) {
    console.log(`Preloading collections for ${namespaces.length} namespaces...`)
    const promises = namespaces.map(ns => this.getCollections(ns))
    
    try {
      const results = await Promise.allSettled(promises)
      const successful = results.filter(r => r.status === 'fulfilled').length
      console.log(`Successfully preloaded ${successful}/${namespaces.length} namespaces`)
      return results
    } catch (error) {
      console.error('Error in batch preload:', error)
      throw error
    }
  },

  // NEW: Preload popular data on app startup
  async preloadOnStartup() {
    try {
      console.log('🚀 Starting app preload...')
      const response = await getHttpClient().post('/galaxy/preload?namespaces_count=15&collections=true')
      console.log('✅ App preload completed:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Error in app preload:', error)
      // Non-blocking: continue even if preload fails
      return null
    }
  },

  // NEW: Enhanced streaming with detailed progress callbacks
  async streamNamespacesEnhanced(
    onNamespaces: (namespaces: Namespace[]) => void,
    onStatus?: (status: string) => void,
    onProgress?: (stats: {discovered: number, statsCompleted: number}) => void,
    onComplete?: () => void
  ) {
    const TIMEOUT_MS = 60000 // 60 second timeout for full discovery
    let timeoutId: ReturnType<typeof setTimeout>
    
    try {
      console.log('📡 Starting enhanced namespace streaming...')
      
      // First check if Galaxy is disabled by calling a simple endpoint
      try {
        const testResponse = await getHttpClient().get('/galaxy/cache/all')
        if (testResponse.data.message?.includes('disabled') || testResponse.data.cached === false) {
          console.log('🚫 Galaxy is disabled, using mock streaming for development')
          
          // Simulate streaming with mock data
          const mockNamespaces = [
            { name: 'community', collection_count: 52, total_downloads: 185625429 },
            { name: 'ansible', collection_count: 18, total_downloads: 3766323 },
            { name: 'cisco', collection_count: 15, total_downloads: 1250000 },
            { name: 'redhat', collection_count: 8, total_downloads: 500000 },
            { name: 'microsoft', collection_count: 12, total_downloads: 800000 }
          ]
          
          // Simulate progressive discovery
          onStatus?.('Galaxy disabled - using mock data')
          onProgress?.({ discovered: 5, statsCompleted: 5 })
          onNamespaces(mockNamespaces)
          onStatus?.('Mock discovery complete')
          onComplete?.()
          return
        }
      } catch (e) {
        console.log('⚠️ Error checking Galaxy status, proceeding with normal flow')
      }
      
      // Get base URL from httpClient instance
      const httpClient = getHttpClient()
      const baseURL = httpClient.defaults.baseURL || ''
      const streamUrl = `${baseURL}/galaxy/namespaces/stream`
      
      console.log('📡 Stream URL:', streamUrl)
      onStatus?.('Connecting to namespace discovery stream...')
      
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Stream timeout after 60 seconds'))
        }, TIMEOUT_MS)
      })
      
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(streamUrl, {
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            // Copy auth header if available
            ...(localStorage.getItem('authToken') ? {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            } : {})
          }
        }),
        timeoutPromise
      ])

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let allNamespaces: Namespace[] = []

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Process complete SSE messages
        const messages = buffer.split('\n\n')
        buffer = messages.pop() || '' // Keep incomplete message in buffer

        for (const message of messages) {
          if (message.startsWith('data: ')) {
            try {
              const data = JSON.parse(message.slice(6)) // Remove 'data: '
              
              switch (data.type) {
                case 'popular':
                  // Instant popular namespaces
                  const popularNamespaces = data.data.namespaces || []
                  allNamespaces = popularNamespaces
                  onNamespaces([...allNamespaces])
                  onStatus?.(`Loaded ${popularNamespaces.length} popular namespaces instantly`)
                  console.log(`📥 Received ${popularNamespaces.length} popular namespaces`)
                  break
                  
                case 'status':
                  // Status messages during discovery
                  onStatus?.(data.message)
                  console.log(`📡 Status: ${data.message}`)
                  break
                  
                case 'namespace_batch':
                  // New namespaces discovered - display immediately with basic info
                  const newNamespaces = data.data || []
                  allNamespaces = [...allNamespaces, ...newNamespaces]
                  onNamespaces([...allNamespaces])
                  
                  onStatus?.(`Page ${data.page}: +${newNamespaces.length} namespaces (${data.total_discovered} total)`)
                  
                  // Update discovery stats
                  if (onProgress) {
                    onProgress({
                      discovered: data.total_discovered || 0,
                      statsCompleted: 0  // No stats yet
                    })
                  }
                  
                  console.log(`📥 Page ${data.page}: +${newNamespaces.length} namespaces (total: ${allNamespaces.length})`)
                  break
                  
                case 'stats_update':
                  // Update existing namespaces with collection stats
                  const statsUpdates = data.data || []
                  
                  // Update existing namespaces with stats
                  allNamespaces = allNamespaces.map(ns => {
                    const statsUpdate = statsUpdates.find((su: any) => su.name === ns.name)
                    return statsUpdate ? { ...ns, ...statsUpdate } : ns
                  })
                  onNamespaces([...allNamespaces])
                  
                  // Update progress stats
                  if (onProgress) {
                    onProgress({
                      discovered: allNamespaces.length,
                      statsCompleted: data.stats_completed || 0
                    })
                  }
                  
                  onStatus?.(`Stats updated: ${data.stats_completed} namespaces have collection counts`)
                  console.log(`📊 Stats update: ${statsUpdates.length} namespaces updated (${data.stats_completed} total with stats)`)
                  break
                  
                case 'complete':
                  console.log(`✅ Streaming complete! Total: ${data.total} namespaces (${data.popular} popular + ${data.discovered} discovered)`)
                  onStatus?.(`Discovery completed! Total: ${data.total} namespaces`)
                  onComplete?.()
                  return
                  
                case 'error':
                  console.error('❌ Streaming error:', data.error)
                  throw new Error(data.error)
              }
            } catch (parseError) {
              console.error('Failed to parse SSE message:', parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in enhanced namespace streaming:', error)
      throw error
    } finally {
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  },

  // Legacy streaming method (kept for backwards compatibility)
  async streamNamespaces(onNamespaces: (namespaces: Namespace[]) => void, onComplete?: () => void) {
    const TIMEOUT_MS = 15000 // 15 second timeout
    let timeoutId: ReturnType<typeof setTimeout>
    
    try {
      console.log('📡 Starting namespace streaming...')
      
      // Get base URL from httpClient instance
      const httpClient = getHttpClient()
      const baseURL = httpClient.defaults.baseURL || ''
      const streamUrl = `${baseURL}/galaxy/namespaces/stream`
      
      console.log('📡 Stream URL:', streamUrl)
      
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Stream timeout after 15 seconds'))
        }, TIMEOUT_MS)
      })
      
      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(streamUrl, {
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            // Copy auth header if available
            ...(localStorage.getItem('authToken') ? {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            } : {})
          }
        }),
        timeoutPromise
      ])

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let allNamespaces: Namespace[] = []

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Process complete SSE messages
        const messages = buffer.split('\n\n')
        buffer = messages.pop() || '' // Keep incomplete message in buffer

        for (const message of messages) {
          if (message.startsWith('data: ')) {
            try {
              const data = JSON.parse(message.slice(6)) // Remove 'data: '
              
              switch (data.type) {
                case 'popular':
                  // Instant popular namespaces
                  const popularNamespaces = data.data.namespaces || []
                  allNamespaces = popularNamespaces
                  onNamespaces([...allNamespaces])
                  console.log(`📥 Received ${popularNamespaces.length} popular namespaces`)
                  break
                  
                case 'status':
                  // Status messages during discovery
                  console.log(`📡 Status: ${data.message}`)
                  break
                  
                case 'discovery_progress':
                  // Discovery progress updates
                  console.log(`🔍 Discovery: Found ${data.new_namespaces} new namespaces on page ${data.page} (total discovered: ${data.total_discovered})`)
                  break
                  
                case 'batch':
                  // Progressive batches with actual namespace data
                  const batchNamespaces = data.data || []
                  allNamespaces = [...allNamespaces, ...batchNamespaces]
                  onNamespaces([...allNamespaces])
                  console.log(`📥 Received batch ${data.batch_index}: +${batchNamespaces.length} namespaces (total sent: ${data.total_sent}, total displayed: ${allNamespaces.length})`)
                  break
                  
                case 'complete':
                  console.log(`✅ Streaming complete! Total: ${data.total} namespaces (${data.popular} popular + ${data.discovered} discovered)`)
                  onComplete?.()
                  return
                  
                case 'error':
                  console.error('❌ Streaming error:', data.error)
                  throw new Error(data.error)
              }
            } catch (parseError) {
              console.error('Failed to parse SSE message:', parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in namespace streaming:', error)
      throw error
    } finally {
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }
}