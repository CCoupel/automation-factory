import {
  Box,
  Typography,
  List,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  Link,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import HomeIcon from '@mui/icons-material/Home'
import RefreshIcon from '@mui/icons-material/Refresh'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import SaveIcon from '@mui/icons-material/Save'
import { useState, useEffect } from 'react'
import { useAnsibleVersions } from '../../hooks/useAnsibleVersions'
import { useGalaxyCache } from '../../contexts/GalaxyCacheContext'
import { Namespace } from '../../services/ansibleApiService'
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
} from '../../services/userPreferencesService'
import {
  NamespaceListItem,
  CollectionListItem,
  ModuleListItem,
  GenericElementListItem,
  type Collection,
  type GenericElement,
} from './modules-zone'

interface ModulesZoneCachedProps {
  onCollapse?: () => void
}

type NavigationLevel = 'namespaces' | 'collections' | 'versions' | 'modules'
type SortOption = 'name' | 'collections' | 'downloads'
type SortOrder = 'asc' | 'desc'

interface NavigationState {
  level: NavigationLevel
  namespace?: string
  collection?: string
  version?: string
}


const ModulesZoneCached = ({ onCollapse }: ModulesZoneCachedProps) => {
  console.log('ModulesZoneCached v1.16.1 FIXED loaded at:', new Date().toISOString())
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  // Get current Ansible version from AppHeader VersionSelector
  const { selectedVersion: ansibleVersion } = useAnsibleVersions()
  
  // Use Galaxy cache context
  const {
    popularNamespaces,
    allNamespaces,
    isLoading: cacheLoading,
    isReady: cacheReady,
    error: cacheError,
    syncStatus,
    lastSync,
    refreshCache,
    enrichNamespaceOnDemand,
    getCollections,
    getModules
  } = useGalaxyCache()
  
  // Navigation state
  const [navigationState, setNavigationState] = useState<NavigationState>({
    level: 'namespaces'
  })
  
  // Local data states (collections, versions, modules)
  const [collections, setCollections] = useState<Collection[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  
  // Loading states for dynamic data
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // UI states
  const [selectedNamespaceZone, setSelectedNamespaceZone] = useState<'popular' | number>('popular')
  const [sortOption, setSortOption] = useState<SortOption>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  
  // User favorites
  const [favorites, setFavorites] = useState<string[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  
  // Standard namespaces - loaded from configuration
  const [standardNamespaces, setStandardNamespaces] = useState<string[]>(['community'])
  const [standardNamespacesLoading, setStandardNamespacesLoading] = useState(false)
  
  // Combined favorite namespaces (standard + user favorites)
  const [favoriteNamespaces, setFavoriteNamespaces] = useState<Namespace[]>([])
  
  // Generic elements (blocks, handlers, etc.)
  const genericElements = [
    { name: 'block', description: 'Group tasks with error handling' },
    { name: 'include_tasks', description: 'Include tasks from file' },
    { name: 'import_tasks', description: 'Import tasks statically' },
  ]
  
  // Load standard namespaces from configuration on mount
  useEffect(() => {
    const loadStandardNamespaces = async () => {
      setStandardNamespacesLoading(true)
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          console.log('No admin token available - using default standard namespaces')
          return
        }
        
        const response = await fetch('/api/admin/configuration/standard-namespaces', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.namespaces) {
            setStandardNamespaces(data.namespaces)
            console.log(`✅ Loaded ${data.namespaces.length} standard namespaces from configuration:`, data.namespaces)
          }
        } else if (response.status === 403) {
          console.log('User is not admin - using default standard namespaces')
        }
      } catch (error) {
        console.error('Failed to load standard namespaces from configuration:', error)
      } finally {
        setStandardNamespacesLoading(false)
      }
    }
    
    loadStandardNamespaces()
  }, [])
  
  // Load user favorites on mount
  useEffect(() => {
    const loadFavorites = async () => {
      setFavoritesLoading(true)
      try {
        const userFavorites = await getUserFavorites()
        setFavorites(userFavorites || [])
      } catch (error) {
        console.error('Failed to load user favorites:', error)
      } finally {
        setFavoritesLoading(false)
      }
    }
    
    loadFavorites()
  }, [])
  
  // Update favorite namespaces when favorites or cache data changes
  useEffect(() => {
    if (cacheReady && (popularNamespaces.length > 0 || allNamespaces.length > 0)) {
      // Combine standard namespaces + user favorites
      const combinedFavoriteNames = [...standardNamespaces, ...favorites]
      
      // Find namespace objects from the cache
      const foundNamespaces: Namespace[] = []
      const allAvailableNamespaces = [...popularNamespaces, ...allNamespaces]
      
      combinedFavoriteNames.forEach(name => {
        const namespace = allAvailableNamespaces.find(ns => ns.name === name)
        if (namespace && !foundNamespaces.some(ns => ns.name === namespace.name)) {
          foundNamespaces.push(namespace)
        }
      })
      
      setFavoriteNamespaces(foundNamespaces)
      console.log(`🌟 Updated favorite namespaces: ${foundNamespaces.length} total (${standardNamespaces.length} standard + ${favorites.length} user favorites)`)
    }
  }, [favorites, popularNamespaces, allNamespaces, cacheReady, standardNamespaces])
  
  // Load data based on navigation state
  useEffect(() => {
    if (activeTab === 1 && cacheReady) {
      switch (navigationState.level) {
        case 'collections':
          if (navigationState.namespace) {
            loadCollections(navigationState.namespace)
          }
          break
        case 'versions':
          if (navigationState.namespace && navigationState.collection) {
            loadVersions(navigationState.namespace, navigationState.collection)
          }
          break
        case 'modules':
          if (navigationState.namespace && navigationState.collection && navigationState.version) {
            loadModules(navigationState.namespace, navigationState.collection, navigationState.version)
          }
          break
      }
    }
  }, [navigationState, activeTab, cacheReady])
  
  // Load collections from cache
  const loadCollections = async (namespace: string) => {
    setLoading(true)
    setError(null)
    try {
      const cachedCollections = await getCollections(namespace)
      if (cachedCollections) {
        setCollections(cachedCollections)
      } else {
        setCollections([])
        setError(`No collections found for namespace ${namespace}`)
      }
    } catch (err) {
      setError(`Failed to load collections for ${namespace}`)
      console.error('Error loading collections:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Load versions (placeholder - could be enhanced with real version cache)
  const loadVersions = async (namespace: string, collection: string) => {
    setLoading(true)
    setError(null)
    try {
      // For now, use the latest version from the collection
      const selectedCollection = collections.find(c => c.name === collection)
      if (selectedCollection) {
        const versions = [{
          version: selectedCollection.latest_version,
          created_at: selectedCollection.created_at,
          updated_at: selectedCollection.updated_at,
          requires_ansible: selectedCollection.requires_ansible
        }]
        setVersions(versions)
        
        // If only one version, navigate directly to modules
        if (versions.length === 1) {
          navigateToModules(namespace, collection, versions[0].version)
        }
      } else {
        setVersions([])
        setError(`Collection ${collection} not found`)
      }
    } catch (err) {
      setError(`Failed to load versions for ${namespace}.${collection}`)
      console.error('Error loading versions:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Load modules from cache
  const loadModules = async (namespace: string, collection: string, version: string) => {
    setLoading(true)
    setError(null)
    try {
      const cachedModules = await getModules(namespace, collection, version)
      if (cachedModules) {
        setModules(cachedModules)
      } else {
        setModules([])
        setError(`No modules found for ${namespace}.${collection}:${version}`)
      }
    } catch (err) {
      setError(`Failed to load modules for ${namespace}.${collection}:${version}`)
      console.error('Error loading modules:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // Navigation functions
  const navigateToNamespaces = () => {
    setNavigationState({ level: 'namespaces' })
    setCollections([])
    setVersions([])
    setModules([])
    setSelectedNamespaceZone('popular')
  }
  
  const navigateToCollections = async (namespace: string) => {
    // Vérifier si le namespace a besoin d'enrichissement
    const selectedNamespace = [...popularNamespaces, ...allNamespaces].find(ns => ns.name === namespace)
    
    if (selectedNamespace && (selectedNamespace.collection_count === 0 || selectedNamespace.total_downloads === 0)) {
      console.log(`🔄 Namespace ${namespace} needs enrichment - triggering on-demand enrichment`)
      
      // Enrichir le namespace avant la navigation
      const enrichedNamespace = await enrichNamespaceOnDemand(namespace)
      if (enrichedNamespace) {
        console.log(`✅ Namespace ${namespace} enriched successfully before navigation`)
      }
    }
    
    setNavigationState({ level: 'collections', namespace })
    setVersions([])
    setModules([])
  }
  
  const navigateToVersions = (namespace: string, collection: string) => {
    setNavigationState({ level: 'versions', namespace, collection })
    setModules([])
  }
  
  const navigateToModules = (namespace: string, collection: string, version: string) => {
    setNavigationState({ level: 'modules', namespace, collection, version })
  }
  
  // Search filter
  const filterItems = (items: any[]) => {
    if (!searchQuery) return items
    const query = searchQuery.toLowerCase()
    return items.filter(item => 
      item.name?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query)
    )
  }
  
  // Sort namespaces
  const sortNamespaces = (namespaces: Namespace[]) => {
    const sorted = [...namespaces].sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'collections':
          return b.collection_count - a.collection_count
        case 'downloads':
          return b.total_downloads - a.total_downloads
        default:
          return 0
      }
    })
    
    return sortOrder === 'desc' ? sorted.reverse() : sorted
  }
  
  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }
  
  // Get status for ALL tab based on cache status
  const getAllTabStatus = () => {
    if (!cacheReady) {
      return {
        color: 'error' as const,
        selectable: false,
        tooltip: 'Cache not ready - Loading data from backend'
      }
    }
    
    switch (syncStatus) {
      case 'completed':
        return {
          color: 'success' as const,
          selectable: true,
          tooltip: 'Data ready from cache'
        }
      case 'syncing':
      case 'refreshing':
        return {
          color: 'warning' as const,
          selectable: true,
          tooltip: 'Syncing in background - Data available'
        }
      default:
        return {
          color: 'warning' as const,
          selectable: true,
          tooltip: 'Limited data available'
        }
    }
  }
  
  // Handle favorite toggle
  const handleToggleFavorite = async (namespace: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const wasFavorite = favorites.includes(namespace)
    
    try {
      if (wasFavorite) {
        await removeFavorite('namespace', namespace)
        setFavorites(prev => prev.filter(fav => fav !== namespace))
        console.log(`✅ Namespace ${namespace} removed from favorites`)
      } else {
        await addFavorite('namespace', namespace)
        setFavorites(prev => [...prev, namespace])
        console.log(`✅ Namespace ${namespace} added to favorites`)
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }
  
  // Handle home icon click behavior
  const handleHomeClick = (event: React.MouseEvent) => {
    if (event.ctrlKey) {
      // Ctrl+Click: Refresh cache from backend
      refreshCache()
    } else {
      // Normal click: Navigate to namespaces list
      navigateToNamespaces()
    }
  }

  // Breadcrumb navigation
  const renderBreadcrumbs = () => {
    if (!navigationState.namespace) {
      return (
        <Box sx={{ mb: 1 }}>
          <Tooltip title="Home (Ctrl+Click to refresh cache)">
            <IconButton 
              size="small" 
              onClick={handleHomeClick}
              sx={{ p: 0.5 }}
            >
              <HomeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
    
    let breadcrumbText = navigationState.namespace
    
    if (navigationState.collection) {
      breadcrumbText += `.${navigationState.collection}`
    }
    
    if (navigationState.version) {
      breadcrumbText += ` (${navigationState.version})`
    }
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Tooltip title="Home (Click to navigate home, Ctrl+Click to refresh cache)">
          <IconButton 
            size="small" 
            onClick={handleHomeClick}
            sx={{ p: 0.5 }}
          >
            <HomeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        {navigationState.collection ? (
          <Link
            underline="hover"
            sx={{ cursor: 'pointer' }}
            onClick={() => navigateToCollections(navigationState.namespace!)}
          >
            {navigationState.namespace}
          </Link>
        ) : (
          <Typography variant="body2">
            {navigationState.namespace}
          </Typography>
        )}
        
        {navigationState.collection && (
          <>
            <Typography variant="body2">.</Typography>
            {navigationState.level === 'modules' && versions.length === 1 ? (
              <Typography variant="body2">
                {navigationState.collection}
              </Typography>
            ) : (
              <Link
                underline="hover"
                sx={{ cursor: 'pointer' }}
                onClick={() => navigateToVersions(navigationState.namespace!, navigationState.collection!)}
              >
                {navigationState.collection}
              </Link>
            )}
          </>
        )}
        
        {navigationState.version && (
          <Typography variant="body2" color="text.secondary">
            ({navigationState.version})
          </Typography>
        )}
      </Box>
    )
  }
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #ddd' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Elements
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {syncStatus && (
              <Chip
                size="small"
                icon={
                  syncStatus === 'refreshing' ? (
                    <CircularProgress size={12} />
                  ) : syncStatus === 'refreshed' ? (
                    <CheckCircleIcon sx={{ fontSize: 14 }} />
                  ) : syncStatus === 'error' ? (
                    <ErrorIcon sx={{ fontSize: 14 }} />
                  ) : (
                    <SaveIcon sx={{ fontSize: 14 }} />
                  )
                }
                label={
                  syncStatus === 'refreshing'
                    ? 'Refreshing...'
                    : syncStatus === 'refreshed'
                    ? 'Refreshed'
                    : syncStatus === 'error'
                    ? 'Error'
                    : 'Cached'
                }
                color={
                  syncStatus === 'refreshing'
                    ? 'info'
                    : syncStatus === 'refreshed'
                    ? 'success'
                    : syncStatus === 'error'
                    ? 'error'
                    : 'success'
                }
                variant="outlined"
                sx={{
                  transition: 'all 0.3s ease'
                }}
              />
            )}
            {onCollapse && (
              <Tooltip title="Hide Modules">
                <IconButton size="small" onClick={onCollapse}>
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="fullWidth"
          sx={{ mb: 1.5 }}
        >
          <Tab label="Generic" />
          <Tab label="Modules" />
        </Tabs>


        <TextField
          fullWidth
          size="small"
          placeholder={activeTab === 0 ? "Search generic..." : "Search modules..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 0 ? (
          // Generic Zone
          <List dense>
            {filterItems(genericElements)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((element, index) => (
                <GenericElementListItem key={index} element={element} />
              ))}
          </List>
        ) : (
          // Modules Zone - Cached Data
          <Box sx={{ p: 2 }}>
            {/* Breadcrumb navigation */}
            {renderBreadcrumbs()}
            
            {/* Cache status */}
            {cacheLoading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                <CircularProgress />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                  Loading cached Galaxy data...
                </Typography>
              </Box>
            )}
            
            {/* Error from cache or API calls */}
            {(cacheError || error) && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {cacheError || error}
                <IconButton 
                  size="small" 
                  onClick={refreshCache}
                  sx={{ ml: 1 }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Alert>
            )}
            
            {/* Content based on navigation level */}
            {cacheReady && !cacheLoading && !cacheError && (
              <>
                {/* Namespaces List */}
                {navigationState.level === 'namespaces' && (
                  <Box>
                    {/* Zone Selection */}
                    <Box sx={{ mb: 2 }}>
                      <Tabs
                        value={selectedNamespaceZone}
                        onChange={(_, value) => {
                          const allTabStatus = getAllTabStatus()
                          if (value === 1 && !allTabStatus.selectable) {
                            return
                          }
                          setSelectedNamespaceZone(value)
                        }}
                        variant="fullWidth"
                        indicatorColor="primary"
                        textColor="primary"
                      >
                        <Tab 
                          value="popular" 
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">FAVORITE</Typography>
                              <Chip 
                                label={favoriteNamespaces.length} 
                                size="small" 
                                color="primary" 
                                variant="outlined" 
                              />
                            </Box>
                          }
                        />
                        {(() => {
                          const allTabStatus = getAllTabStatus()
                          return (
                            <Tab 
                              value={1} 
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2">All</Typography>
                                    <Chip 
                                      label={allNamespaces.length} 
                                      size="small" 
                                      color={allTabStatus.color} 
                                      variant="outlined"
                                    />
                                  </Box>
                                }
                                sx={{
                                  opacity: allTabStatus.selectable ? 1 : 0.5,
                                  cursor: allTabStatus.selectable ? 'pointer' : 'not-allowed'
                                }}
                              />
                          )
                        })()}
                      </Tabs>
                    </Box>

                    {/* Sort Controls */}
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Sort:
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 110 }}>
                        <Select
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value as SortOption)}
                          variant="outlined"
                          sx={{ 
                            fontSize: '0.75rem',
                            '& .MuiSelect-select': { py: 0.25, fontSize: '0.75rem' }
                          }}
                        >
                          <MenuItem value="name">
                            <Typography variant="caption">🔤 Name</Typography>
                          </MenuItem>
                          <MenuItem value="collections">
                            <Typography variant="caption">📚 Collections</Typography>
                          </MenuItem>
                          <MenuItem value="downloads">
                            <Typography variant="caption">📥 Downloads</Typography>
                          </MenuItem>
                        </Select>
                      </FormControl>
                      <Tooltip title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'} - Click to reverse`}>
                        <IconButton 
                          size="small" 
                          onClick={toggleSortOrder}
                          sx={{ 
                            p: 0.5,
                            '&:hover': { bgcolor: 'action.hover' }
                          }}
                        >
                          {sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Box>

                    {/* Favorite Namespaces Zone */}
                    {selectedNamespaceZone === 'popular' && (
                      <Box>
                        <List dense>
                          {sortNamespaces(filterItems(favoriteNamespaces))
                            .map((namespace) => (
                              <NamespaceListItem
                                key={namespace.name}
                                namespace={namespace}
                                onNavigate={navigateToCollections}
                                isFavorite={favorites.includes(namespace.name)}
                                onToggleFavorite={handleToggleFavorite}
                              />
                          ))}
                        </List>
                      </Box>
                    )}

                    {/* All Namespaces Zone */}
                    {selectedNamespaceZone === 1 && (
                      <Box>
                        <List dense>
                          {sortNamespaces(filterItems(allNamespaces))
                            .map((namespace) => (
                              <NamespaceListItem
                                key={namespace.name}
                                namespace={namespace}
                                onNavigate={navigateToCollections}
                                isFavorite={favorites.includes(namespace.name)}
                                onToggleFavorite={handleToggleFavorite}
                              />
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                )}
                
                {/* Collections List */}
                {navigationState.level === 'collections' && (
                  <Box>
                    {loading && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    )}

                    <List dense>
                      {filterItems(collections)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((collection) => (
                          <CollectionListItem
                            key={collection.name}
                            collection={collection}
                            namespace={navigationState.namespace!}
                            ansibleVersion={ansibleVersion}
                            onNavigateToVersions={navigateToVersions}
                            onNavigateToModules={navigateToModules}
                          />
                        ))}
                    </List>
                  </Box>
                )}
                
                {/* Modules List */}
                {navigationState.level === 'modules' && (
                  <Box>
                    {loading && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <CircularProgress size={24} />
                      </Box>
                    )}

                    <List dense>
                      {filterItems(modules)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((module, index) => (
                          <ModuleListItem
                            key={`${module.name}-${index}`}
                            module={module}
                            namespace={navigationState.namespace!}
                            collection={navigationState.collection!}
                            index={index}
                          />
                        ))}
                    </List>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default ModulesZoneCached