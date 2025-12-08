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
  FormControl,
  Select,
  MenuItem,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import FolderIcon from '@mui/icons-material/Folder'
import ExtensionIcon from '@mui/icons-material/Extension'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import HomeIcon from '@mui/icons-material/Home'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import RefreshIcon from '@mui/icons-material/Refresh'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SortIcon from '@mui/icons-material/Sort'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { useState, useEffect } from 'react'
import { galaxyService, Namespace, Collection, Module } from '../../services/galaxyService'
import { useAnsibleVersion } from '../../contexts/AnsibleVersionContext'
import { useGalaxy } from '../../contexts/GalaxyContext'
import { isVersionCompatible, getIncompatibilityReason } from '../../utils/versionUtils'

interface ModulesZoneProps {
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


const ModulesZone = ({ onCollapse }: ModulesZoneProps) => {
  console.log('ModulesZone v1.16.0 loaded at:', new Date().toISOString())
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const { ansibleVersion } = useAnsibleVersion()
  
  // Use Galaxy context for namespaces
  const {
    popularNamespaces,
    allNamespaces,
    isDiscovering,
    discoveryPhase,
    discoveryStats,
    streamingStatus,
    refreshNamespaces: forceRefreshNamespaces
  } = useGalaxy()
  
  // Navigation state
  const [navigationState, setNavigationState] = useState<NavigationState>({
    level: 'namespaces'
  })
  
  // Local data states (collections, versions, modules)
  const [collections, setCollections] = useState<Collection[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [modules, setModules] = useState<Module[]>([])
  
  // Loading and error states for collections/modules only (namespaces are handled by context)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedNamespaceZone, setSelectedNamespaceZone] = useState<number>(0)
  const [sortOption, setSortOption] = useState<SortOption>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Éléments génériques (blocks, handlers, etc.)
  // Note: 'play' n'est pas inclus car il y a un PLAY unique et obligatoire par espace de travail
  const genericElements = [
    { name: 'block', description: 'Group tasks with error handling' },
    { name: 'include_tasks', description: 'Include tasks from file' },
    { name: 'import_tasks', description: 'Import tasks statically' },
  ]
  
  // No need to load namespaces here, they are loaded by GalaxyContext on app startup
  
  // Load data based on navigation state
  useEffect(() => {
    if (activeTab === 1) {
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
  }, [navigationState, activeTab])

  // API calls for collections, versions, modules
  
  const loadCollections = async (namespace: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await galaxyService.getCollections(namespace)
      setCollections(result.collections || [])
    } catch (err) {
      setError(`Failed to load collections for ${namespace}`)
      console.error('Error loading collections:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const loadVersions = async (namespace: string, collection: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await galaxyService.getVersions(namespace, collection)
      const versions = result.versions || []
      setVersions(versions)
      
      // Si une seule version, naviguer directement vers les modules
      if (versions.length === 1) {
        navigateToModules(namespace, collection, versions[0].version)
      }
    } catch (err) {
      setError(`Failed to load versions for ${namespace}.${collection}`)
      console.error('Error loading versions:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const loadModules = async (namespace: string, collection: string, version: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await galaxyService.getModules(namespace, collection, version)
      // Combine modules and plugins
      const allModules = [...(result.modules || []), ...(result.plugins || [])]
      setModules(allModules)
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
    // Reset to popular zone by default
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
    
    // Inverser l'ordre si descendant
    return sortOrder === 'desc' ? sorted.reverse() : sorted
  }

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  // Force refresh is now handled by the context

  // Get status color and selectability for ALL tab
  const getAllTabStatus = () => {
    switch (discoveryPhase) {
      case 'discovering':
        return {
          color: 'error' as const, // Rouge
          selectable: false,
          tooltip: 'Discovering namespaces - Not ready yet'
        }
      case 'collecting':
        return {
          color: 'warning' as const, // Orange
          selectable: true,
          tooltip: 'Collecting statistics in parallel - Ready to use'
        }
      case 'complete':
        return {
          color: 'success' as const, // Vert
          selectable: true,
          tooltip: 'Discovery complete - All data available'
        }
      default:
        return {
          color: 'error' as const,
          selectable: false,
          tooltip: 'Discovery not started'
        }
    }
  }

  // Effect to reset namespace zone to 'popular' if 'all' becomes unselectable
  useEffect(() => {
    // Normaliser la valeur si c'est 'all'
    
    const allTabStatus = getAllTabStatus()
    console.log('useEffect: selectedNamespaceZone =', selectedNamespaceZone, 'discoveryPhase =', discoveryPhase, 'allTabStatus.selectable =', allTabStatus.selectable)
    if (selectedNamespaceZone === 1 && !allTabStatus.selectable) {
      console.log('Resetting namespace zone to popular (all tab not selectable)')
      setSelectedNamespaceZone(0)
    }
  }, [discoveryPhase, selectedNamespaceZone])

  // Debug effect to log when component renders with namespace zone
  useEffect(() => {
    console.log('Component render: navigationState.level =', navigationState.level, 'selectedNamespaceZone =', selectedNamespaceZone)
  }, [navigationState.level, selectedNamespaceZone])

  // Breadcrumb navigation
  const renderBreadcrumbs = () => {
    // Si aucun namespace n'est sélectionné, afficher uniquement l'icône maison
    if (!navigationState.namespace) {
      return (
        <Box sx={{ mb: 1 }}>
          <Tooltip title="Home (Ctrl+Click to refresh all namespaces)">
            <IconButton 
              size="small" 
              onClick={(e) => {
                if (e.ctrlKey) {
                  forceRefreshNamespaces()
                } else {
                  navigateToNamespaces()
                }
              }}
              sx={{ p: 0.5 }}
            >
              <HomeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
    
    // Format: namespace.collection (version)
    let breadcrumbText = navigationState.namespace
    
    if (navigationState.collection) {
      breadcrumbText += `.${navigationState.collection}`
    }
    
    if (navigationState.version) {
      breadcrumbText += ` (${navigationState.version})`
    }
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Tooltip title="Home (Ctrl+Click to refresh all namespaces)">
          <IconButton 
            size="small" 
            onClick={(e) => {
              if (e.ctrlKey) {
                forceRefreshNamespaces()
              } else {
                navigateToNamespaces()
              }
            }}
            sx={{ p: 0.5 }}
          >
            <HomeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        {navigationState.collection ? (
          // Si on a une collection, on peut cliquer pour revenir aux collections
          <Link
            underline="hover"
            sx={{ cursor: 'pointer' }}
            onClick={() => navigateToCollections(navigationState.namespace!)}
          >
            {navigationState.namespace}
          </Link>
        ) : (
          // Sinon, juste afficher le namespace
          <Typography variant="body2">
            {navigationState.namespace}
          </Typography>
        )}
        
        {navigationState.collection && (
          <>
            <Typography variant="body2">.</Typography>
            {navigationState.level === 'modules' && versions.length === 1 ? (
              // Si une seule version, ne pas rendre cliquable
              <Typography variant="body2">
                {navigationState.collection}
              </Typography>
            ) : (
              // Sinon, permettre de revenir aux versions
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
          {onCollapse && (
            <Tooltip title="Hide Modules">
              <IconButton size="small" onClick={onCollapse}>
                <ChevronLeftIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Tabs pour switcher entre Générique et Modules */}
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
          // Zone Générique
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
          // Zone Modules - Galaxy API
          <Box sx={{ p: 2 }}>
            {/* Breadcrumb navigation */}
            {renderBreadcrumbs()}
            
            {/* Loading */}
            {loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
                <CircularProgress />
                {isDiscovering && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    {streamingStatus}
                  </Typography>
                )}
              </Box>
            )}
            
            
            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
                <IconButton 
                  size="small" 
                  onClick={() => {
                    // Clear error and retry based on current navigation state
                    setError(null)
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
                  }}
                  sx={{ ml: 1 }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Alert>
            )}
            
            {/* Content based on navigation level */}
            {!loading && !error && (
              <>
                {/* Namespaces List - Two Zones */}
                {navigationState.level === 'namespaces' && (
                  <Box>
                    {/* Zone Selection */}
                    <Box sx={{ mb: 2 }}>
                      <Tabs
                        value={selectedNamespaceZone}
                        onChange={(_, value) => {
                          console.log('Tab change attempt:', value, 'type:', typeof value)
                          const allTabStatus = getAllTabStatus()
                          
                          if (value === 1 && !allTabStatus.selectable) {
                            // Visual feedback pour l'utilisateur
                            setError('Discovery in progress - ALL tab not ready yet. Please wait...')
                            setTimeout(() => setError(null), 3000)
                            return
                          }
                          
                          // Clear any previous error
                          setError(null)
                          setSelectedNamespaceZone(value)
                        }}
                        variant="fullWidth"
                        indicatorColor="primary"
                        textColor="primary"
                      >
                        <Tab 
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
                        <Tab 
                          label="All (v16)"
                        />
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
                    {selectedNamespaceZone === 0 && (
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
                        
                        {/* Discovery Status */}
                        {isDiscovering && (
                          <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <CircularProgress size={16} sx={{ mr: 1 }} />
                              <Typography variant="caption">
                                {streamingStatus || 'Discovering namespaces...'}
                              </Typography>
                            </Box>
                            {discoveryStats && (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip 
                                  label={`${allNamespaces.length} namespaces`} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined" 
                                />
                                {discoveryStats.statsCompleted > 0 && (
                                  <Chip 
                                    label={`${discoveryStats.statsCompleted} with stats`} 
                                    size="small" 
                                    color="secondary" 
                                    variant="outlined" 
                                  />
                                )}
                              </Box>
                            )}
                          </Box>
                        )}

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
                  <List dense>
                    {filterItems(collections)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((collection) => (
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
                            {collection.requires_ansible && !isVersionCompatible(ansibleVersion, collection.requires_ansible) && (
                              <Typography variant="caption" display="block" color="error.main" sx={{ fontWeight: 'bold' }}>
                                ⚠️ {getIncompatibilityReason(ansibleVersion, collection.requires_ansible)}
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
                          {(() => {
                            const isIncompatible = collection.requires_ansible && !isVersionCompatible(ansibleVersion, collection.requires_ansible)
                            return (
                              <ListItemButton
                                onClick={() => navigateToVersions(navigationState.namespace!, collection.name)}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  // Clic droit : aller directement à la dernière version
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
                                  position: 'relative',
                                  '&:hover::after': isIncompatible ? undefined : {
                                    content: '"🖱️ Right-click for latest"',
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '0.65rem',
                                    color: 'primary.main',
                                    opacity: 0.8,
                                    pointerEvents: 'none',
                                    backgroundColor: 'background.paper',
                                    padding: '2px 4px',
                                    borderRadius: '4px',
                                    boxShadow: 1,
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
                            )
                          })()}
                        </ListItem>
                      </Tooltip>
                    ))}
                  </List>
                )}
                
                {/* Versions List */}
                {navigationState.level === 'versions' && (
                  <List dense>
                    {filterItems(versions)
                      .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true })) // Tri par version décroissante
                      .map((version) => (
                      <Tooltip
                        key={version.version}
                        title={
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              Version {version.version}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              {navigationState.namespace}.{navigationState.collection}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Released: {new Date(version.created_at).toLocaleDateString()}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Updated: {new Date(version.updated_at).toLocaleDateString()}
                            </Typography>
                            {version.requires_ansible && (
                              <Typography variant="caption" display="block">
                                Requires Ansible: {version.requires_ansible}
                              </Typography>
                            )}
                            {version.requires_ansible && !isVersionCompatible(ansibleVersion, version.requires_ansible) && (
                              <Typography variant="caption" display="block" color="error.main" sx={{ fontWeight: 'bold' }}>
                                ⚠️ {getIncompatibilityReason(ansibleVersion, version.requires_ansible)}
                              </Typography>
                            )}
                            <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                              Click to browse modules
                            </Typography>
                          </Box>
                        }
                        placement="right"
                        arrow
                      >
                        <ListItem disablePadding>
                          {(() => {
                            const isIncompatible = version.requires_ansible && !isVersionCompatible(ansibleVersion, version.requires_ansible)
                            return (
                              <ListItemButton
                                onClick={() => navigateToModules(
                                  navigationState.namespace!, 
                                  navigationState.collection!, 
                                  version.version
                                )}
                                disabled={isIncompatible}
                                sx={{
                                  opacity: isIncompatible ? 0.4 : 1,
                                  '&:hover': {
                                    bgcolor: isIncompatible ? 'transparent' : 'action.hover',
                                    cursor: isIncompatible ? 'not-allowed' : 'pointer',
                                  },
                                }}
                              >
                                <Chip 
                                  label={version.version} 
                                  size="small" 
                                  sx={{ 
                                    mr: 1,
                                    bgcolor: isIncompatible ? 'error.light' : 'primary.light',
                                    color: isIncompatible ? 'error.contrastText' : 'primary.contrastText'
                                  }}
                                />
                                <ListItemText
                                  secondary={`Released: ${new Date(version.created_at).toLocaleDateString()}`}
                                  secondaryTypographyProps={{
                                    variant: 'caption',
                                    color: isIncompatible ? 'text.disabled' : 'text.secondary'
                                  }}
                                />
                                <ChevronRightIcon sx={{ color: isIncompatible ? 'text.disabled' : 'inherit' }} />
                              </ListItemButton>
                            )
                          })()}
                        </ListItem>
                      </Tooltip>
                    ))}
                  </List>
                )}
                
                {/* Modules List */}
                {navigationState.level === 'modules' && (
                  <List dense>
                    {filterItems(modules)
                      .sort((a, b) => a.name.localeCompare(b.name)) // Tri alphabétique
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
                )}
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default ModulesZone
