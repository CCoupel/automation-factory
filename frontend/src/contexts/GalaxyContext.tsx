import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { galaxyService, Namespace } from '../services/galaxyService'

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
      // First: Get popular namespaces instantly
      console.log('📥 Loading popular namespaces...')
      const popularResult = await galaxyService.getNamespaces()
      setPopularNamespaces(popularResult.namespaces || [])
      console.log(`✅ Loaded ${popularResult.namespaces?.length || 0} popular namespaces`)
      
      // Then: Start progressive discovery
      console.log('🔍 Starting progressive discovery...')
      await galaxyService.streamNamespacesEnhanced(
        // onNamespaces: Update all namespaces
        (namespacesUpdate) => {
          setAllNamespaces(namespacesUpdate)
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
      )
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
    
    // Clear cache and restart
    galaxyService.clearCache().then(() => {
      startNamespaceDiscovery()
    })
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