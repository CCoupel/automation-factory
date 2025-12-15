import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { galaxyService, Namespace } from '../services/galaxyService'
import { ansibleApiService } from '../services/ansibleApiService'
import { userPreferencesService } from '../services/userPreferencesService'

interface GalaxyContextType {
  // Namespaces
  popularNamespaces: Namespace[]
  allNamespaces: Namespace[]
  
  // Discovery state
  isDiscovering: boolean
  discoveryPhase: 'discovering' | 'collecting' | 'complete'
  discoveryStats: { discovered: number; statsCompleted: number } | null
  streamingStatus: string
  
  // Methods
  refreshNamespaces: () => void
}

const GalaxyContext = createContext<GalaxyContextType | undefined>(undefined)

export const useGalaxy = () => {
  const context = useContext(GalaxyContext)
  if (!context) {
    throw new Error('useGalaxy must be used within a GalaxyProvider')
  }
  return context
}

interface GalaxyProviderProps {
  children: ReactNode
}

export const GalaxyProvider: React.FC<GalaxyProviderProps> = ({ children }) => {
  // Namespace states
  const [popularNamespaces, setPopularNamespaces] = useState<Namespace[]>([])
  const [allNamespaces, setAllNamespaces] = useState<Namespace[]>([])
  
  // Discovery states
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [discoveryPhase, setDiscoveryPhase] = useState<'discovering' | 'collecting' | 'complete'>('discovering')
  const [discoveryStats, setDiscoveryStats] = useState<{ discovered: number; statsCompleted: number } | null>(null)
  const [streamingStatus, setStreamingStatus] = useState<string>('')
  
  // Start discovery on mount
  useEffect(() => {
    console.log('🚀 GalaxyContext: Starting namespace discovery on app load')
    startNamespaceDiscovery()
  }, [])
  
  const startNamespaceDiscovery = async () => {
    if (isDiscovering) {
      console.log('⚠️ Discovery already in progress, skipping...')
      return
    }
    
    setIsDiscovering(true)
    setDiscoveryPhase('discovering')
    setStreamingStatus('Initializing namespace discovery...')
    
    try {
      // First: Get namespaces from Ansible API
      console.log('📥 Loading namespaces from Ansible API...')
      const cachedData = await ansibleApiService.getAllCachedData()
      const popularResult = { namespaces: cachedData?.popular_namespaces || [] }
      
      // Load user favorites and merge with system defaults
      try {
        const userFavorites = await userPreferencesService.getFavoriteNamespaces()
        console.log(`📥 Loaded ${userFavorites.length} user favorite namespaces`)
        
        // Combine system popular + user favorites (remove duplicates)
        const systemPopular = popularResult.namespaces || []
        const allFavoriteNames = new Set([
          ...systemPopular.map(ns => ns.name),
          ...userFavorites
        ])
        
        // Create namespace objects for user favorites not in system popular
        const userFavoriteNamespaces = userFavorites
          .filter(name => !systemPopular.some(ns => ns.name === name))
          .map(name => ({
            name,
            collection_count: 0, // Will be updated when ALL data loads
            total_downloads: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        
        // Merge system popular + user favorites
        const mergedPopular = [...systemPopular, ...userFavoriteNamespaces]
        setPopularNamespaces(mergedPopular)
        console.log(`✅ Loaded ${mergedPopular.length} popular namespaces (${systemPopular.length} system + ${userFavoriteNamespaces.length} user favorites)`)
      } catch (error) {
        // Fallback to system popular only if user preferences fail
        console.warn('⚠️ Failed to load user favorites, using system popular only:', error)
        setPopularNamespaces(popularResult.namespaces || [])
        console.log(`✅ Loaded ${popularResult.namespaces?.length || 0} popular namespaces (system only)`)
      }
      
      // Then: Load all namespaces from Ansible API
      console.log('🔍 Loading all namespaces...')
      setAllNamespaces(cachedData?.all_namespaces || [])
      setDiscoveryPhase('complete')
      setIsDiscovering(false)
      
      // Skip streaming for now as we use Ansible API
      /*await galaxyService.streamNamespacesEnhanced(
        // onNamespaces: Update all namespaces and refresh popular with user favorites
        async (namespacesUpdate) => {
          setAllNamespaces(namespacesUpdate)
          
          // Update popular namespaces with real stats for user favorites
          try {
            const userFavorites = await userPreferencesService.getFavoriteNamespaces()
            const systemPopular = popularResult.namespaces || []
            
            // Update user favorite namespaces with real data from ALL discovery
            const updatedUserFavorites = userFavorites
              .filter(name => !systemPopular.some(ns => ns.name === name))
              .map(name => {
                const realData = namespacesUpdate.find(ns => ns.name === name)
                return realData || {
                  name,
                  collection_count: 0,
                  total_downloads: 0,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              })
            
            // Merge again with updated data
            const refreshedPopular = [...systemPopular, ...updatedUserFavorites]
            setPopularNamespaces(refreshedPopular)
            
          } catch (error) {
            console.warn('⚠️ Failed to update user favorites with real data:', error)
          }
        },
        // onStatus: Update status messages
        (status) => {
          setStreamingStatus(status)
        },
        // onProgress: Update discovery stats
        (stats) => {
          setDiscoveryStats(stats)
          
          if (stats.statsCompleted > 0) {
            setDiscoveryPhase('collecting')
            setStreamingStatus(`Discovery: ${stats.discovered} found, ${stats.statsCompleted} with stats`)
          } else if (stats.discovered > 0) {
            setDiscoveryPhase('collecting')
            setStreamingStatus(`Discovery: ${stats.discovered} namespaces found, collecting stats...`)
          }
        },
        // onComplete: Finish streaming
        () => {
          setStreamingStatus('Discovery completed!')
          setIsDiscovering(false)
          setDiscoveryPhase('complete')
          console.log('✅ Progressive discovery completed')
        }
      )*/
    } catch (error) {
      console.error('❌ Error during namespace discovery:', error)
      setStreamingStatus('Discovery failed')
      setIsDiscovering(false)
    }
  }
  
  const refreshNamespaces = () => {
    console.log('🔄 Refreshing namespaces...')
    
    // Clear all states
    setPopularNamespaces([])
    setAllNamespaces([])
    setDiscoveryStats(null)
    setDiscoveryPhase('discovering')
    
    // Restart discovery with Ansible API
    startNamespaceDiscovery()
  }
  
  const value: GalaxyContextType = {
    popularNamespaces,
    allNamespaces,
    isDiscovering,
    discoveryPhase,
    discoveryStats,
    streamingStatus,
    refreshNamespaces,
  }
  
  return <GalaxyContext.Provider value={value}>{children}</GalaxyContext.Provider>
}