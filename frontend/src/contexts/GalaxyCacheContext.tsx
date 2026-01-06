import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ansibleApiService, Namespace } from '../services/ansibleApiService'
import { notificationService, CacheNotification } from '../services/notificationService'
import { useAnsibleVersion } from './AnsibleVersionContext'
import { preloadManager, PreloadProgress } from '../services/preloadManager'

// Re-export PreloadProgress for backward compatibility
export type { PreloadProgress }

// Module-level guard to prevent multiple initializations
let contextInitialized = false

interface GalaxyCacheContextType {
  popularNamespaces: Namespace[]
  allNamespaces: Namespace[]
  collectionsCache: Record<string, any[]>
  modulesCache: Record<string, any[]>
  isLoading: boolean
  isReady: boolean
  lastSync: string | null
  syncStatus: string
  error: string | null
  currentVersion: string
  preloadComplete: boolean
  preloadProgress: PreloadProgress
  refreshCache: () => Promise<void>
  forceRefreshCache: () => Promise<void>
  enrichNamespaceOnDemand: (namespace: string) => Promise<any | null>
  getCollections: (namespace: string) => Promise<any[] | null>
  getModules: (namespace: string, collection: string, version: string) => Promise<any[] | null>
  setCollectionsCacheData: (data: Record<string, any[]>) => void
  setModulesCacheData: (data: Record<string, any[]>) => void
  setPreloadComplete: (complete: boolean) => void
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
  const { ansibleVersion } = useAnsibleVersion()

  const [popularNamespaces, setPopularNamespaces] = useState<Namespace[]>([])
  const [allNamespaces, setAllNamespaces] = useState<Namespace[]>([])
  const [collectionsCache, setCollectionsCache] = useState<Record<string, any[]>>(
    () => preloadManager.getCollections()
  )
  const [modulesCache, setModulesCache] = useState<Record<string, any[]>>(
    () => preloadManager.getModules()
  )
  const [currentVersion, setCurrentVersion] = useState<string>(ansibleVersion)
  const [preloadComplete, setPreloadComplete] = useState<boolean>(
    () => preloadManager.isCompleted()
  )
  const [preloadProgress, setPreloadProgress] = useState<PreloadProgress>(
    () => preloadManager.getProgress()
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<string>('loading')
  const [error, setError] = useState<string | null>(null)

  // Subscribe to preload manager updates
  useEffect(() => {
    const unsubProgress = preloadManager.onProgress(setPreloadProgress)
    const unsubComplete = preloadManager.onComplete((collections, modules) => {
      setCollectionsCache(prev => ({ ...prev, ...collections }))
      setModulesCache(prev => ({ ...prev, ...modules }))
      setPreloadComplete(true)
    })
    return () => {
      unsubProgress()
      unsubComplete()
    }
  }, [])

  // Load cached data on mount - module-level guard
  useEffect(() => {
    if (contextInitialized) return
    contextInitialized = true

    console.log('🚀 GalaxyCacheContext: Initializing...')
    loadCachedData()
    notificationService.connect()
    const unsubscribe = notificationService.subscribe(handleNotification)
    return () => {
      unsubscribe()
      notificationService.disconnect()
    }
  }, [])

  // React to version changes
  useEffect(() => {
    if (!isReady) return
    if (ansibleVersion === currentVersion) return

    console.log(`🔄 Version changed from ${currentVersion} to ${ansibleVersion}`)
    setCurrentVersion(ansibleVersion)
    ansibleApiService.setVersion(ansibleVersion)
    setCollectionsCache({})
    setModulesCache({})
    setPreloadComplete(false)
    preloadManager.reset(ansibleVersion)
    loadCachedData()
  }, [ansibleVersion, currentVersion, isReady])

  // Trigger preload when namespaces are ready
  useEffect(() => {
    if (!isReady || allNamespaces.length === 0) return

    const namespaceNames = allNamespaces.map(ns => ns.name)
    preloadManager.startPreload(namespaceNames, ansibleVersion)
  }, [isReady, allNamespaces.length, ansibleVersion])

  const loadCachedData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await ansibleApiService.getAllCachedData()
      if (data) {
        setPopularNamespaces(data.popular_namespaces || [])
        setAllNamespaces(data.all_namespaces || [])
        if (data.collections_sample) setCollectionsCache(prev => ({ ...prev, ...data.collections_sample }))
        setSyncStatus(data.cache_info?.sync_status || 'unknown')
        setLastSync(data.cache_info?.last_sync || null)
        setIsReady(true)
        console.log('✅ Data loaded:', { namespaces: data.all_namespaces?.length || 0 })
      } else {
        setError('No cached data available')
        setSyncStatus('no_cache')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
      setSyncStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshCache = async () => {
    setIsLoading(true)
    setError(null)
    await loadCachedData()
    setSyncStatus('refreshed')
    setTimeout(() => setSyncStatus('completed'), 5000)
    setIsLoading(false)
  }

  const forceRefreshCache = async () => {
    setIsLoading(true)
    setSyncStatus('refreshing')
    setError(null)
    setCollectionsCache({})
    setModulesCache({})
    setPreloadComplete(false)
    preloadManager.reset()
    const data = await ansibleApiService.getAllCachedData(true)
    if (data) {
      setPopularNamespaces(data.popular_namespaces || [])
      setAllNamespaces(data.all_namespaces || [])
      setSyncStatus('refreshed')
      setLastSync(new Date().toISOString())
      setIsReady(true)
      setTimeout(() => setSyncStatus('completed'), 5000)
    }
    setIsLoading(false)
  }

  const enrichNamespaceOnDemand = async (namespace: string) => {
    const enriched = { name: namespace, collection_count: 0 }
    setAllNamespaces(prev => prev.map(ns => ns.name === namespace ? enriched : ns))
    return enriched
  }

  const getCollections = async (namespace: string) => {
    if (collectionsCache[namespace]) return collectionsCache[namespace]
    const cols = await ansibleApiService.getCollections(namespace)
    if (cols) setCollectionsCache(p => ({ ...p, [namespace]: cols }))
    return cols || null
  }

  const getModules = async (namespace: string, collection: string, _version: string) => {
    const key = `${namespace}.${collection}`
    if (modulesCache[key]) return modulesCache[key]
    const mods = await ansibleApiService.getModules(namespace, collection)
    if (mods) setModulesCache(p => ({ ...p, [key]: mods }))
    return mods || null
  }

  const setCollectionsCacheData = (d: Record<string, any[]>) => setCollectionsCache(p => ({ ...p, ...d }))
  const setModulesCacheData = (d: Record<string, any[]>) => setModulesCache(p => ({ ...p, ...d }))

  const handleNotification = (n: CacheNotification) => {
    if (n.type === 'ping') return
    if (n.type === 'connected') console.log('✅ Connected to notifications')
    else if (n.type === 'cache_sync_started') { setSyncStatus('syncing'); setError(null) }
    else if (n.type === 'cache_sync_completed') { setSyncStatus('completed'); setLastSync(n.timestamp); loadCachedData() }
    else if (n.type === 'cache_updated') loadCachedData()
    else if (n.type === 'cache_error') { setSyncStatus('error'); setError(n.data?.error || 'Sync failed') }
  }

  const value: GalaxyCacheContextType = {
    popularNamespaces, allNamespaces, collectionsCache, modulesCache,
    isLoading, isReady, lastSync, syncStatus, error, currentVersion, preloadComplete, preloadProgress,
    refreshCache, forceRefreshCache, enrichNamespaceOnDemand, getCollections, getModules,
    setCollectionsCacheData, setModulesCacheData, setPreloadComplete
  }

  return <GalaxyCacheContext.Provider value={value}>{children}</GalaxyCacheContext.Provider>
}
