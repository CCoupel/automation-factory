import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  Breadcrumbs,
  Link,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import FolderIcon from '@mui/icons-material/Folder'
import ExtensionIcon from '@mui/icons-material/Extension'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HomeIcon from '@mui/icons-material/Home'
import RefreshIcon from '@mui/icons-material/Refresh'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { useState, useEffect } from 'react'
import { useAnsibleVersion } from '../../contexts/AnsibleVersionContext'
import { useGalaxyCache } from '../../contexts/GalaxyCacheContext'
import { Namespace } from '../../services/galaxyService'
import { isVersionCompatible, getIncompatibilityReason } from '../../utils/versionUtils'

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

interface Collection {
  name: string
  description?: string
  latest_version: string
  download_count: number
  created_at: string
  updated_at: string
  requires_ansible?: string
  deprecated?: boolean
}

const ModulesZoneCached = ({ onCollapse }: ModulesZoneCachedProps) => {
  console.log('ModulesZoneCached v1.16.1 FIXED loaded at:', new Date().toISOString())
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const { ansibleVersion } = useAnsibleVersion()
  
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
  
  // Generic elements (blocks, handlers, etc.)
  const genericElements = [
    { name: 'block', description: 'Group tasks with error handling' },
    { name: 'include_tasks', description: 'Include tasks from file' },
    { name: 'import_tasks', description: 'Import tasks statically' },
  ]
  
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
  
  const navigateToCollections = (namespace: string) => {
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
  
  // Breadcrumb navigation
  const renderBreadcrumbs = () => {
    if (!navigationState.namespace) {
      return (
        <Box sx={{ mb: 1 }}>
          <Tooltip title="Home (Click to refresh cache)">
            <IconButton 
              size="small" 
              onClick={refreshCache}
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
        <Tooltip title="Home (Click to refresh cache)">
          <IconButton 
            size="small" 
            onClick={refreshCache}
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
  
  // Component for namespace list item
  const NamespaceListItem = ({ namespace, onNavigate }: { namespace: Namespace, onNavigate: (name: string) => void }) => (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {namespace.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Ansible namespace containing collections
          </Typography>
          <Typography variant="caption" display="block">
            Collections: {namespace.collection_count}
          </Typography>
          <Typography variant="caption" display="block">
            Total downloads: {namespace.total_downloads.toLocaleString()}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
            Click to browse collections
          </Typography>
        </Box>
      }
      placement="right"
      arrow
    >
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => onNavigate(namespace.name)}
          sx={{
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
          <ListItemText
            primary={namespace.name}
            secondary={`${namespace.collection_count} collections • ${namespace.total_downloads.toLocaleString()} downloads`}
            primaryTypographyProps={{
              variant: 'body2',
              fontWeight: 'medium',
            }}
            secondaryTypographyProps={{
              variant: 'caption',
            }}
          />
          <ChevronRightIcon />
        </ListItemButton>
      </ListItem>
    </Tooltip>
  )

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
                label={syncStatus === 'completed' ? 'Cached' : syncStatus} 
                size="small" 
                color={syncStatus === 'completed' ? 'success' : 'warning'}
                variant="outlined"
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
              <Tooltip
                key={index}
                title={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {element.name}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {element.description}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Type: Generic Ansible construct
                    </Typography>
                    <Typography variant="caption" display="block">
                      Collection: ansible.generic
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                      Drag to add to playbook
                    </Typography>
                  </Box>
                }
                placement="right"
                arrow
              >
                <ListItem disablePadding>
                  <ListItemButton
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'module',
                        JSON.stringify({
                          collection: 'ansible.generic',
                          name: element.name,
                          description: element.description,
                        })
                      )
                    }}
                    sx={{
                      '&:hover': {
                        bgcolor: 'secondary.light',
                        color: 'white',
                      },
                    }}
                  >
                    <AccountTreeIcon sx={{ mr: 1, fontSize: 18 }} />
                    <ListItemText
                      primary={element.name}
                      secondary={element.description}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 'medium',
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        sx: { fontSize: '0.7rem' },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              </Tooltip>
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
                              <Typography variant="body2">Popular</Typography>
                              <Chip 
                                label={popularNamespaces.length} 
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
                                  <Typography variant="body2">All (FIXED v16)</Typography>
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

                    {/* Popular Namespaces Zone */}
                    {selectedNamespaceZone === 'popular' && (
                      <Box>
                        <List dense>
                          {sortNamespaces(filterItems(popularNamespaces))
                            .map((namespace) => (
                              <NamespaceListItem key={namespace.name} namespace={namespace} onNavigate={navigateToCollections} />
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
                              <NamespaceListItem key={namespace.name} namespace={namespace} onNavigate={navigateToCollections} />
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
                        .map((collection) => {
                          const isIncompatible = collection.requires_ansible && 
                            !isVersionCompatible(ansibleVersion, collection.requires_ansible)
                          
                          return (
                            <Tooltip
                              key={collection.name}
                              title={
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                    {collection.name}
                                  </Typography>
                                  <Typography variant="body2" sx={{ mb: 1 }}>
                                    {collection.description || 'No description available'}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Latest version: {collection.latest_version}
                                  </Typography>
                                  {collection.requires_ansible && (
                                    <Typography variant="caption" display="block">
                                      Requires Ansible: {collection.requires_ansible}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" display="block">
                                    Downloads: {collection.download_count.toLocaleString()}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Created: {new Date(collection.created_at).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="caption" display="block">
                                    Updated: {new Date(collection.updated_at).toLocaleDateString()}
                                  </Typography>
                                  {collection.deprecated && (
                                    <Typography variant="caption" display="block" color="warning.main">
                                      ⚠️ Deprecated
                                    </Typography>
                                  )}
                                  {isIncompatible && (
                                    <Typography variant="caption" display="block" color="error.main" sx={{ fontWeight: 'bold' }}>
                                      ⚠️ {getIncompatibilityReason(ansibleVersion, collection.requires_ansible!)}
                                    </Typography>
                                  )}
                                  <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                    Left click: browse versions • Right click: latest version
                                  </Typography>
                                </Box>
                              }
                              placement="right"
                              arrow
                            >
                              <ListItem disablePadding>
                                <ListItemButton
                                  onClick={() => navigateToVersions(navigationState.namespace!, collection.name)}
                                  onContextMenu={(e) => {
                                    e.preventDefault()
                                    navigateToModules(
                                      navigationState.namespace!, 
                                      collection.name, 
                                      collection.latest_version
                                    )
                                  }}
                                  disabled={isIncompatible}
                                  sx={{
                                    opacity: isIncompatible ? 0.4 : 1,
                                    '&:hover': {
                                      bgcolor: isIncompatible ? 'transparent' : 'action.hover',
                                      cursor: isIncompatible ? 'not-allowed' : 'context-menu',
                                    },
                                  }}
                                >
                                  <ExtensionIcon sx={{ 
                                    mr: 1, 
                                    color: isIncompatible ? 'error.main' : 'secondary.main' 
                                  }} />
                                  <ListItemText
                                    primary={collection.name}
                                    secondary={
                                      <Box>
                                        <Typography variant="caption" display="block">
                                          {collection.description || 'No description'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          v{collection.latest_version} • {collection.download_count.toLocaleString()} downloads
                                        </Typography>
                                        {isIncompatible && (
                                          <Typography variant="caption" color="error.main" sx={{ fontWeight: 'bold' }}>
                                            ⚠️ Incompatible with Ansible {ansibleVersion}
                                          </Typography>
                                        )}
                                      </Box>
                                    }
                                    primaryTypographyProps={{
                                      variant: 'body2',
                                      fontWeight: 'medium',
                                      color: isIncompatible ? 'text.disabled' : 'text.primary'
                                    }}
                                  />
                                  <ChevronRightIcon sx={{ color: isIncompatible ? 'text.disabled' : 'inherit' }} />
                                </ListItemButton>
                              </ListItem>
                            </Tooltip>
                          )
                        })}
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
                        <Tooltip
                          key={`${module.name}-${index}`}
                          title={
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {module.name}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                {module.description || 'No description available'}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Type: {module.content_type}
                              </Typography>
                              <Typography variant="caption" display="block">
                                Collection: {navigationState.namespace}.{navigationState.collection}
                              </Typography>
                              <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                Drag to add to playbook
                              </Typography>
                            </Box>
                          }
                          placement="right"
                          arrow
                        >
                          <ListItem disablePadding>
                            <ListItemButton
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData(
                                  'module',
                                  JSON.stringify({
                                    collection: `${navigationState.namespace}.${navigationState.collection}`,
                                    name: module.name,
                                    description: module.description,
                                  })
                                )
                              }}
                              sx={{
                                '&:hover': {
                                  bgcolor: 'primary.light',
                                  color: 'white',
                                },
                              }}
                            >
                              <ExtensionIcon sx={{ mr: 1, fontSize: 18 }} />
                              <ListItemText
                                primary={module.name}
                                secondary={module.description || 'No description'}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  fontWeight: 'medium',
                                }}
                                secondaryTypographyProps={{
                                  variant: 'caption',
                                  sx: { fontSize: '0.7rem' },
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        </Tooltip>
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