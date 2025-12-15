import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
  Button,
  Breadcrumbs,
  Link,
  LinearProgress,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import FolderIcon from '@mui/icons-material/Folder'
import ExtensionIcon from '@mui/icons-material/Extension'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import RefreshIcon from '@mui/icons-material/Refresh'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import HomeIcon from '@mui/icons-material/Home'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import CachedIcon from '@mui/icons-material/Cached'
import { FixedSizeList as VirtualList } from 'react-window'
import { ansibleApiService } from '../../services/ansibleApiService'
import { Namespace, Collection, Module } from '../../services/galaxyService'
import { useAnsibleVersions } from '../../hooks/useAnsibleVersions'
import { isVersionCompatible, getIncompatibilityReason } from '../../utils/versionUtils'

interface ModulesZoneProps {
  onCollapse?: () => void
}

type NavigationLevel = 'namespaces' | 'collections' | 'versions' | 'modules'

interface NavigationState {
  level: NavigationLevel
  namespace?: string
  collection?: string
  version?: string
}

const ITEMS_PER_PAGE = 50
const VIRTUAL_ITEM_HEIGHT = 60

const OptimizedModulesZone = ({ onCollapse }: ModulesZoneProps) => {
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  // Get current Ansible version from AppHeader VersionSelector
  const { selectedVersion: ansibleVersion } = useAnsibleVersions()
  
  // Navigation state
  const [navigationState, setNavigationState] = useState<NavigationState>({
    level: 'namespaces'
  })
  
  // Data states
  const [allNamespaces, setAllNamespaces] = useState<Namespace[]>([])
  const [allCollections, setAllCollections] = useState<Collection[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [modules, setModules] = useState<Module[]>([])
  
  // Loading and error states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isPreloaded, setIsPreloaded] = useState(false)

  // Generic elements
  const genericElements = [
    { name: 'block', description: 'Group tasks with error handling' },
    { name: 'include_tasks', description: 'Include tasks from file' },
    { name: 'import_tasks', description: 'Import tasks statically' },
  ]

  // Preload cache on first mount
  useEffect(() => {
    if (!isPreloaded) {
      preloadCache()
    }
  }, [])

  // Filter data based on search query
  const filteredNamespaces = useMemo(() => {
    if (!searchQuery) return allNamespaces
    const query = searchQuery.toLowerCase()
    return allNamespaces.filter(ns => 
      ns.name.toLowerCase().includes(query)
    )
  }, [allNamespaces, searchQuery])

  const filteredCollections = useMemo(() => {
    if (!searchQuery) return allCollections
    const query = searchQuery.toLowerCase()
    return allCollections.filter(col => 
      col.name.toLowerCase().includes(query) ||
      col.description?.toLowerCase().includes(query)
    )
  }, [allCollections, searchQuery])

  const filteredModules = useMemo(() => {
    if (!searchQuery) return modules
    const query = searchQuery.toLowerCase()
    return modules.filter(mod => 
      mod.name.toLowerCase().includes(query) ||
      mod.description?.toLowerCase().includes(query)
    )
  }, [modules, searchQuery])

  // Preload cache for faster access
  const preloadCache = async () => {
    try {
      setLoading(true)
      setLoadingProgress(10)
      
      // Load all namespaces from Ansible API
      setLoadingProgress(50)
      const namespaces = await ansibleApiService.getAllNamespaces()
      // Convert to galaxy format
      const formattedNamespaces = namespaces.map(ns => ({
        name: ns.name,
        description: '',
        collection_count: ns.collections_count || 0,
        total_downloads: 0,
        id: ns.name,
        avatar_url: null,
        company: ''
      }))
      setAllNamespaces(formattedNamespaces)
      setLoadingProgress(100)
      
      setIsPreloaded(true)
    } catch (err) {
      console.error('Error preloading cache:', err)
    } finally {
      setLoading(false)
      setLoadingProgress(0)
    }
  }

  // Navigation functions
  const navigateTo = (level: NavigationLevel, data?: any) => {
    setSearchQuery('')
    setError(null)
    
    switch (level) {
      case 'namespaces':
        setNavigationState({ level: 'namespaces' })
        break
      case 'collections':
        setNavigationState({ 
          level: 'collections', 
          namespace: data.namespace 
        })
        loadCollections(data.namespace)
        break
      case 'versions':
        setNavigationState({ 
          level: 'versions', 
          namespace: data.namespace,
          collection: data.collection 
        })
        loadVersions(data.namespace, data.collection)
        break
      case 'modules':
        setNavigationState({ 
          level: 'modules', 
          namespace: data.namespace,
          collection: data.collection,
          version: data.version 
        })
        loadModules(data.namespace, data.collection, data.version)
        break
    }
  }

  // Data loading functions
  const loadCollections = async (namespace: string) => {
    try {
      setLoading(true)
      setError(null)
      const collections = await ansibleApiService.getCollections(namespace)
      // Convert to galaxy format
      const formattedCollections = collections.map(name => ({
        name,
        description: '',
        latest_version: '1.0.0',
        download_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      setAllCollections(formattedCollections)
    } catch (err) {
      setError(`Failed to load collections: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const loadVersions = async (namespace: string, collection: string) => {
    try {
      setLoading(true)
      setError(null)
      // For Ansible API, simulate one version and navigate directly to modules
      const versions = [{
        version: 'latest',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]
      setVersions(versions)
      
      // Navigate directly to modules
      navigateTo('modules', {
        namespace,
        collection,
        version: 'latest'
      })
    } catch (err) {
      setError(`Failed to load versions: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const loadModules = async (namespace: string, collection: string, version: string) => {
    try {
      setLoading(true)
      setError(null)
      const modules = await ansibleApiService.getModules(namespace, collection)
      // Convert to galaxy format
      const formattedModules = modules.map(module => ({
        name: module.name,
        description: module.description || '',
        content_type: 'module'
      }))
      setModules(formattedModules)
    } catch (err) {
      setError(`Failed to load modules: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  // Refresh current view
  const handleRefresh = async () => {
    // For Ansible API, no cache to clear - just reload data
    
    // Reload data
    switch (navigationState.level) {
      case 'namespaces':
        setIsPreloaded(false)
        preloadCache()
        break
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

  // Render functions for virtual list
  const renderNamespaceItem = ({ index, style }: any) => {
    const namespace = filteredNamespaces[index]
    if (!namespace) return null

    return (
      <ListItem style={style} disablePadding>
        <ListItemButton 
          onClick={() => navigateTo('collections', { namespace: namespace.name })}
        >
          <ListItemText
            primary={namespace.name}
            secondary={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip 
                  label={`${namespace.collection_count} collections`} 
                  size="small" 
                  variant="outlined" 
                />
                {namespace.total_downloads > 1000 && (
                  <Typography variant="caption" color="text.secondary">
                    {(namespace.total_downloads / 1000).toFixed(0)}k downloads
                  </Typography>
                )}
              </Box>
            }
          />
        </ListItemButton>
      </ListItem>
    )
  }

  const renderCollectionItem = ({ index, style }: any) => {
    const collection = filteredCollections[index]
    if (!collection) return null

    const isCompatible = !collection.requires_ansible || 
      isVersionCompatible(collection.requires_ansible, ansibleVersion)

    return (
      <ListItem style={style} disablePadding>
        <Tooltip 
          title={
            <Box>
              <Typography variant="body2">{collection.description}</Typography>
              {collection.requires_ansible && (
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Requires Ansible: {collection.requires_ansible}
                </Typography>
              )}
              {!isCompatible && (
                <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                  {getIncompatibilityReason(collection.requires_ansible, ansibleVersion)}
                </Typography>
              )}
            </Box>
          }
          placement="right"
          arrow
        >
          <ListItemButton
            onClick={() => navigateTo('versions', { 
              namespace: navigationState.namespace,
              collection: collection.name 
            })}
            onContextMenu={(e) => {
              e.preventDefault()
              // Skip versions and go directly to latest
              navigateTo('modules', {
                namespace: navigationState.namespace,
                collection: collection.name,
                version: collection.latest_version
              })
            }}
            disabled={!isCompatible}
          >
            <ListItemText
              primary={collection.name}
              secondary={
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>
                    {collection.description}
                  </Typography>
                  {!isCompatible && (
                    <Chip label="Incompatible" size="small" color="error" />
                  )}
                </Box>
              }
              sx={{ 
                opacity: isCompatible ? 1 : 0.5 
              }}
            />
          </ListItemButton>
        </Tooltip>
      </ListItem>
    )
  }

  const renderModuleItem = ({ index, style }: any) => {
    const module = filteredModules[index]
    if (!module) return null

    const handleDragStart = (e: React.DragEvent) => {
      const dragData = {
        type: 'module',
        data: {
          collection: `${navigationState.namespace}.${navigationState.collection}`,
          name: module.name,
          description: module.description,
          content_type: module.content_type
        }
      }
      e.dataTransfer.setData('application/json', JSON.stringify(dragData))
      e.dataTransfer.effectAllowed = 'copy'
    }

    return (
      <ListItem style={style} disablePadding>
        <ListItemButton
          draggable
          onDragStart={handleDragStart}
          sx={{
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          <ListItemText
            primary={module.name}
            secondary={module.description}
          />
          <Chip
            label={module.content_type}
            size="small"
            variant="outlined"
            color={module.content_type === 'module' ? 'primary' : 'secondary'}
          />
        </ListItemButton>
      </ListItem>
    )
  }

  // Get current data and render function
  const getCurrentData = () => {
    switch (navigationState.level) {
      case 'namespaces':
        return {
          data: filteredNamespaces,
          renderer: renderNamespaceItem
        }
      case 'collections':
        return {
          data: filteredCollections,
          renderer: renderCollectionItem
        }
      case 'modules':
        return {
          data: filteredModules,
          renderer: renderModuleItem
        }
      default:
        return { data: [], renderer: () => null }
    }
  }

  // Render breadcrumb navigation
  const renderBreadcrumbs = () => (
    <Breadcrumbs 
      aria-label="navigation" 
      separator={<NavigateNextIcon fontSize="small" />}
      sx={{ mb: 1 }}
    >
      <Link
        component="button"
        underline="hover"
        onClick={() => navigateTo('namespaces')}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
      >
        <HomeIcon fontSize="small" />
        Namespaces
      </Link>
      
      {navigationState.namespace && (
        <Link
          component="button"
          underline="hover"
          onClick={() => navigateTo('collections', { namespace: navigationState.namespace })}
        >
          {navigationState.namespace}
        </Link>
      )}
      
      {navigationState.collection && (
        <Link
          component="button"
          underline="hover"
          onClick={() => navigateTo('versions', { 
            namespace: navigationState.namespace,
            collection: navigationState.collection 
          })}
        >
          {navigationState.collection}
        </Link>
      )}
      
      {navigationState.version && (
        <Typography color="text.primary">
          {navigationState.version}
        </Typography>
      )}
    </Breadcrumbs>
  )

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        p: 1.5, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="subtitle1">Modules</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh data">
            <IconButton size="small" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Collapse panel">
            <IconButton size="small" onClick={onCollapse}>
              <ChevronLeftIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Tabs 
        value={activeTab} 
        onChange={(_, value) => setActiveTab(value)} 
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Generic" />
        <Tab label="Modules" />
      </Tabs>
      
      {activeTab === 0 && (
        <Box sx={{ p: 2, overflowY: 'auto', flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Drag elements to the workspace
          </Typography>
          {genericElements.map((element) => (
            <Accordion key={element.name} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">{element.name}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                  {element.description}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
      
      {activeTab === 1 && (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ p: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search..."
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
            
            {navigationState.level !== 'namespaces' && (
              <Box sx={{ mt: 1 }}>
                {renderBreadcrumbs()}
              </Box>
            )}
          </Box>
          
          {loading && loadingProgress > 0 && (
            <Box sx={{ px: 2 }}>
              <LinearProgress variant="determinate" value={loadingProgress} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Loading data... {loadingProgress}%
              </Typography>
            </Box>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mx: 2, mb: 1 }}>
              {error}
            </Alert>
          )}
          
          {!loading && !error && navigationState.level === 'versions' ? (
            // Regular list for versions (usually few items)
            <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
              {versions.map((version) => (
                <ListItem key={version.version} disablePadding>
                  <ListItemButton
                    onClick={() => navigateTo('modules', {
                      namespace: navigationState.namespace,
                      collection: navigationState.collection,
                      version: version.version
                    })}
                  >
                    <ListItemText
                      primary={version.version}
                      secondary={
                        <Box>
                          {version.requires_ansible && (
                            <Typography variant="caption">
                              Requires Ansible: {version.requires_ansible}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            Released: {new Date(version.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            // Virtual list for large datasets
            <Box sx={{ flexGrow: 1, px: 1 }}>
              {(() => {
                const { data, renderer } = getCurrentData()
                return data.length > 0 ? (
                  <VirtualList
                    height={600} // Adjust based on your layout
                    itemCount={data.length}
                    itemSize={VIRTUAL_ITEM_HEIGHT}
                    width="100%"
                  >
                    {renderer}
                  </VirtualList>
                ) : (
                  !loading && (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {searchQuery ? 'No results found' : 'No data available'}
                      </Typography>
                    </Box>
                  )
                )
              })()}
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

export default OptimizedModulesZone