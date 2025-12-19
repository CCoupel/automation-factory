import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ansibleApiService, Namespace } from '../services/ansibleApiService'
import { notificationService, CacheNotification } from '../services/notificationService'
import { useAnsibleVersion } from './AnsibleVersionContext'

interface GalaxyCacheContextType {
  // Data
  popularNamespaces: Namespace[]
  allNamespaces: Namespace[]
  collectionsCache: Record<string, any[]>

  // Status
  isLoading: boolean
  isReady: boolean
  lastSync: string | null
  syncStatus: string
  error: string | null
  currentVersion: string

  // Actions
  refreshCache: () => Promise<void>
  forceRefreshCache: () => Promise<void>  // Force refresh bypassing cache
  enrichNamespaceOnDemand: (namespace: string) => Promise<any | null>
  getCollections: (namespace: string) => Promise<any[] | null>
  getModules: (namespace: string, collection: string, version: string) => Promise<any[] | null>
}

const GalaxyCacheContext = createContext<GalaxyCacheContextType | undefined>(undefined)

export const useGalaxyCache = () => {
  const context = useContext(GalaxyCacheContext)
  if (!context) {
    throw new Error('useGalaxyCache must be used within a GalaxyCacheProvider')
  }
  return context
}

interface GalaxyCacheProviderProps {
  children: ReactNode
}

export const GalaxyCacheProvider: React.FC<GalaxyCacheProviderProps> = ({ children }) => {
  // Get current Ansible version from shared context
  const { ansibleVersion } = useAnsibleVersion()

  // Data state
  const [popularNamespaces, setPopularNamespaces] = useState<Namespace[]>([])
  const [allNamespaces, setAllNamespaces] = useState<Namespace[]>([])
  const [collectionsCache, setCollectionsCache] = useState<Record<string, any[]>>({})
  const [currentVersion, setCurrentVersion] = useState<string>(ansibleVersion)

  // Status state
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string>('loading')
  const [error, setError] = useState<string | null>(null)

  // Load cached data and start notifications on component mount
  useEffect(() => {
    console.log('🚀 GalaxyCacheContext: Loading cached Galaxy data on app startup...')
    loadCachedData()

    // Start listening to SSE notifications
    notificationService.connect()

    // Subscribe to cache notifications
    const unsubscribe = notificationService.subscribe(handleNotification)

    // Cleanup on unmount
    return () => {
      unsubscribe()
      notificationService.disconnect()
    }
  }, [])

  // React to Ansible version changes
  useEffect(() => {
    if (ansibleVersion && ansibleVersion !== currentVersion) {
      console.log(`🔄 GalaxyCacheContext: Ansible version changed from ${currentVersion} to ${ansibleVersion}`)
      setCurrentVersion(ansibleVersion)

      // Update the service with new version
      ansibleApiService.setVersion(ansibleVersion)

      // Clear collections cache (collections are version-specific)
      setCollectionsCache({})

      // Reload namespaces for new version
      console.log(`📥 GalaxyCacheContext: Reloading data for Ansible ${ansibleVersion}...`)
      loadCachedData()
    }
  }, [ansibleVersion, currentVersion])
  
  const loadCachedData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Get all cached data from Ansible API service
      const cachedData = await ansibleApiService.getAllCachedData()
      
      if (cachedData) {
        // Update state with cached data
        setPopularNamespaces(cachedData.popular_namespaces || [])
        setAllNamespaces(cachedData.all_namespaces || [])
        
        // Store collections sample in cache
        if (cachedData.collections_sample) {
          setCollectionsCache(cachedData.collections_sample)
        }
        
        // Update status
        setSyncStatus(cachedData.cache_info?.sync_status || 'unknown')
        setLastSync(cachedData.cache_info?.last_sync || null)
        setIsReady(true)
        
        console.log('✅ Ansible API data loaded successfully:', {
          popular: cachedData.popular_namespaces?.length || 0,
          all: cachedData.all_namespaces?.length || 0,
          collections_sample: Object.keys(cachedData.collections_sample || {}).length,
          sync_status: cachedData.cache_info?.sync_status,
          service: 'ansible_api'
        })
      } else {
        // No cached data available
        setError('No cached Galaxy data available')
        setSyncStatus('no_cache')
        console.warn('⚠️ No cached Galaxy data found')
      }
      
    } catch (err) {
      console.error('❌ Failed to load cached Galaxy data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load cached data')
      setSyncStatus('error')
    } finally {
      setIsLoading(false)
    }
  }
  
  const refreshCache = async () => {
    try {
      console.log('🔄 Refreshing Galaxy cache...')
      setIsLoading(true)
      setError(null)

      // Use Ansible API service (no need for resync, just refresh data)
      console.log('🔄 Refreshing Ansible data...')
      await loadCachedData()
      setSyncStatus('refreshed')

      // Return to 'completed' (displayed as 'Cached') after 5 seconds
      setTimeout(() => {
        setSyncStatus('completed')
      }, 5000)

    } catch (err) {
      console.error('❌ Cache refresh failed:', err)
      setError(err instanceof Error ? err.message : 'Cache refresh failed')
      setSyncStatus('error')

      // Return to 'completed' after 5 seconds even on error
      setTimeout(() => {
        setSyncStatus('completed')
      }, 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const forceRefreshCache = async () => {
    try {
      console.log('🔄 FORCE Refreshing - Bypassing all caches...')
      setIsLoading(true)
      setSyncStatus('refreshing')
      setError(null)

      // Clear local collections cache
      setCollectionsCache({})

      // Request fresh data from backend with force_refresh parameter
      const cachedData = await ansibleApiService.getAllCachedData(true)

      if (cachedData) {
        setPopularNamespaces(cachedData.popular_namespaces || [])
        setAllNamespaces(cachedData.all_namespaces || [])
        setSyncStatus('refreshed')
        setLastSync(new Date().toISOString())
        setIsReady(true)

        console.log('✅ Force refresh completed:', {
          namespaces: cachedData.all_namespaces?.length || 0,
          version: currentVersion
        })

        // Return to 'completed' (displayed as 'Cached') after 5 seconds
        setTimeout(() => {
          setSyncStatus('completed')
        }, 5000)
      }

    } catch (err) {
      console.error('❌ Force cache refresh failed:', err)
      setError(err instanceof Error ? err.message : 'Force cache refresh failed')
      setSyncStatus('error')

      // Return to 'completed' after 5 seconds even on error
      setTimeout(() => {
        setSyncStatus('completed')
      }, 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const enrichNamespaceOnDemand = async (namespace: string) => {
    try {
      console.log(`🔄 Enriching namespace on-demand: ${namespace}`)
      
      // For Ansible API, no enrichment needed - return basic namespace info
      const enrichedNamespace = { name: namespace, collection_count: 0 }
      if (enrichedNamespace) {
        // Mettre à jour les données en cache avec le namespace enrichi
        setAllNamespaces(prev => 
          prev.map(ns => ns.name === namespace ? enrichedNamespace : ns)
        )
        console.log(`✅ Namespace ${namespace} enriched and updated`)
        return enrichedNamespace
      } else {
        console.warn(`⚠️ Failed to enrich namespace ${namespace}`)
        return null
      }
    } catch (error) {
      console.error(`❌ Error enriching namespace ${namespace}:`, error)
      return null
    }
  }
  
  const getCollections = async (namespace: string): Promise<any[] | null> => {
    try {
      // Check if already cached
      if (collectionsCache[namespace]) {
        console.log(`📚 Collections for ${namespace} found in cache`)
        return collectionsCache[namespace]
      }
      
      // Fetch from backend via SMART service
      console.log(`📥 Fetching collections for ${namespace} from SMART service...`)
      const collections = await ansibleApiService.getCollections(namespace)
      
      if (collections) {
        // Cache the result
        setCollectionsCache(prev => ({
          ...prev,
          [namespace]: collections
        }))
        
        console.log(`✅ Loaded ${collections.length} collections for ${namespace}`)
        return collections
      }
      
      console.warn(`⚠️ No cached collections found for ${namespace}`)
      return null
      
    } catch (error) {
      console.error(`❌ Failed to get collections for ${namespace}:`, error)
      return null
    }
  }
  
  const getModules = async (namespace: string, collection: string, version: string): Promise<any[] | null> => {
    try {
      console.log(`📥 Fetching modules for ${namespace}.${collection}:${version} from SMART service...`)
      
      const modules = await ansibleApiService.getModules(namespace, collection)
      
      if (modules) {
        console.log(`✅ Loaded ${modules.length} modules for ${namespace}.${collection}:${version}`)
        return modules
      }
      
      console.warn(`⚠️ No cached modules found for ${namespace}.${collection}:${version}`)
      return null
      
    } catch (error) {
      console.error(`❌ Failed to get modules for ${namespace}.${collection}:${version}:`, error)
      return null
    }
  }
  
  const handleNotification = (notification: CacheNotification) => {
    // Skip logging for ping keepalives
    if (notification.type === 'ping') {
      return // No action needed for keepalive pings
    }

    console.log('📨 Cache notification:', notification.type, notification.message || '')

    switch (notification.type) {
      case 'connected':
        console.log('✅ Connected to cache notifications')
        break

      case 'cache_sync_started':
        console.log('🚀 Cache sync started')
        setSyncStatus('syncing')
        setError(null)
        break

      case 'cache_sync_completed':
        console.log('✅ Cache sync completed')
        setSyncStatus('completed')
        setLastSync(notification.timestamp)

        // Reload cache data to get latest updates
        loadCachedData()
        break

      case 'cache_updated':
        console.log('📊 Cache data updated:', notification.data?.update_type)
        // Could selectively update specific data based on update_type
        loadCachedData()
        break

      case 'cache_error':
        console.error('❌ Cache sync error:', notification.data?.error)
        setSyncStatus('error')
        setError(notification.data?.error || 'Cache sync failed')
        break

      default:
        console.log('📨 Unknown notification type:', notification.type)
    }
  }
  
  const value: GalaxyCacheContextType = {
    // Data
    popularNamespaces,
    allNamespaces,
    collectionsCache,

    // Status
    isLoading,
    isReady,
    lastSync,
    syncStatus,
    error,
    currentVersion,

    // Actions
    refreshCache,
    forceRefreshCache,
    enrichNamespaceOnDemand,
    getCollections,
    getModules,
  }
  
  return (
    <GalaxyCacheContext.Provider value={value}>
      {children}
    </GalaxyCacheContext.Provider>
  )
}