import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { galaxySmartService } from '../services/galaxySmartService'
import { notificationService, CacheNotification } from '../services/notificationService'
import { Namespace } from '../services/galaxyService'

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
  
  // Actions
  refreshCache: () => Promise<void>
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
  // Data state
  const [popularNamespaces, setPopularNamespaces] = useState<Namespace[]>([])
  const [allNamespaces, setAllNamespaces] = useState<Namespace[]>([])
  const [collectionsCache, setCollectionsCache] = useState<Record<string, any[]>>({})
  
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
  
  const loadCachedData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Get all cached data from SMART service
      const cachedData = await galaxySmartService.getAllCachedData()
      
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
        
        console.log('✅ Galaxy SMART data loaded successfully:', {
          popular: cachedData.popular_namespaces?.length || 0,
          all: cachedData.all_namespaces?.length || 0,
          collections_sample: Object.keys(cachedData.collections_sample || {}).length,
          sync_status: cachedData.cache_info?.sync_status,
          service: 'galaxy_smart'
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
      
      // Request backend to refresh its cache via SMART service
      const success = await galaxySmartService.triggerResync()
      
      if (success) {
        // Wait a bit for sync to start, then reload data
        setTimeout(() => {
          loadCachedData()
        }, 2000)
        
        setSyncStatus('refreshing')
      } else {
        setError('Failed to initiate cache refresh')
        setIsLoading(false)
      }
      
    } catch (err) {
      console.error('❌ Cache refresh failed:', err)
      setError(err instanceof Error ? err.message : 'Cache refresh failed')
      setIsLoading(false)
    }
  }

  const enrichNamespaceOnDemand = async (namespace: string) => {
    try {
      console.log(`🔄 Enriching namespace on-demand: ${namespace}`)
      
      const enrichedNamespace = await galaxySmartService.enrichNamespaceOnDemand(namespace)
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
      const collections = await galaxySmartService.getCollections(namespace)
      
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
      
      const modules = await galaxySmartService.getModules(namespace, collection, version)
      
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
    console.log('📨 Received cache notification:', notification.type, notification.message)
    
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
        
      case 'ping':
        // Keepalive ping - no action needed
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
    
    // Actions
    refreshCache,
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