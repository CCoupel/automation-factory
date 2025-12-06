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
import { useState, useEffect } from 'react'
import { galaxyService, Namespace, Collection, Module } from '../../services/galaxyService'

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

const ModulesZone = ({ onCollapse }: ModulesZoneProps) => {
  const [activeTab, setActiveTab] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Navigation state
  const [navigationState, setNavigationState] = useState<NavigationState>({
    level: 'namespaces'
  })
  
  // Data states
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [versions, setVersions] = useState<any[]>([])
  const [modules, setModules] = useState<Module[]>([])
  
  // Loading and error states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Éléments génériques (blocks, handlers, etc.)
  // Note: 'play' n'est pas inclus car il y a un PLAY unique et obligatoire par espace de travail
  const genericElements = [
    { name: 'block', description: 'Group tasks with error handling' },
    { name: 'include_tasks', description: 'Include tasks from file' },
    { name: 'import_tasks', description: 'Import tasks statically' },
  ]
  
  // Load namespaces on mount or when switching to Modules tab
  useEffect(() => {
    if (activeTab === 1 && navigationState.level === 'namespaces' && namespaces.length === 0) {
      // Start with a smaller limit for faster initial load
      loadNamespaces(30) // Reduced from default 100
    }
  }, [activeTab])
  
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
  
  // API calls
  const loadNamespaces = async (limit = 50) => {
    setLoading(true)
    setError(null)
    try {
      console.log(`Loading ${limit} namespaces...`)
      const result = await galaxyService.getNamespaces(limit)
      setNamespaces(result.namespaces || [])
      console.log(`Loaded ${result.namespaces?.length || 0} namespaces`)
    } catch (err) {
      setError('Failed to load namespaces')
      console.error('Error loading namespaces:', err)
    } finally {
      setLoading(false)
    }
  }
  
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

  // Breadcrumb navigation
  const renderBreadcrumbs = () => {
    // Si aucun namespace n'est sélectionné, afficher uniquement l'icône maison
    if (!navigationState.namespace) {
      return (
        <Box sx={{ mb: 1 }}>
          <IconButton 
            size="small" 
            onClick={navigateToNamespaces}
            sx={{ p: 0.5 }}
          >
            <HomeIcon fontSize="small" />
          </IconButton>
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
        <IconButton 
          size="small" 
          onClick={navigateToNamespaces}
          sx={{ p: 0.5 }}
        >
          <HomeIcon fontSize="small" />
        </IconButton>
        
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
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            )}
            
            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
                <IconButton 
                  size="small" 
                  onClick={() => loadNamespaces(50)}
                  sx={{ ml: 1 }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Alert>
            )}
            
            {/* Content based on navigation level */}
            {!loading && !error && (
              <>
                {/* Namespaces List */}
                {navigationState.level === 'namespaces' && (
                  <List dense>
                    {filterItems(namespaces)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((namespace) => (
                      <Tooltip
                        key={namespace.name}
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
                            onClick={() => navigateToCollections(namespace.name)}
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
                    ))}
                  </List>
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
                              // Clic droit : aller directement à la dernière version
                              navigateToModules(
                                navigationState.namespace!, 
                                collection.name, 
                                collection.latest_version
                              )
                            }}
                            sx={{
                              '&:hover': {
                                bgcolor: 'action.hover',
                                cursor: 'context-menu',
                              },
                              position: 'relative',
                              '&:hover::after': {
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
                            <ExtensionIcon sx={{ mr: 1, color: 'secondary.main' }} />
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
                                </Box>
                              }
                              primaryTypographyProps={{
                                variant: 'body2',
                                fontWeight: 'medium',
                              }}
                            />
                            <ChevronRightIcon />
                          </ListItemButton>
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
                            <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                              Click to browse modules
                            </Typography>
                          </Box>
                        }
                        placement="right"
                        arrow
                      >
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() => navigateToModules(
                              navigationState.namespace!, 
                              navigationState.collection!, 
                              version.version
                            )}
                            sx={{
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                            }}
                          >
                            <Chip 
                              label={version.version} 
                              size="small" 
                              sx={{ mr: 1 }}
                            />
                            <ListItemText
                              secondary={`Released: ${new Date(version.created_at).toLocaleDateString()}`}
                              secondaryTypographyProps={{
                                variant: 'caption',
                              }}
                            />
                            <ChevronRightIcon />
                          </ListItemButton>
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
