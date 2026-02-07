/**
 * RolesTreeView - Browse and drag Galaxy roles
 *
 * Displays roles from Ansible Galaxy:
 * - Standalone roles (API v1): author.role_name format
 * - Collection roles (API v3): namespace.collection.role format
 *
 * Supports public Galaxy and private Galaxy (AAP / Galaxy NG)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import PublicIcon from '@mui/icons-material/Public'
import LockIcon from '@mui/icons-material/Lock'
import FolderIcon from '@mui/icons-material/Folder'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import WidgetsIcon from '@mui/icons-material/Widgets'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  getStandaloneRoles,
  getPopularNamespaces,
  getCollectionRoles,
  getGalaxyConfig,
  clearGalaxyRolesCache,
  createStandaloneRoleDragData,
  createCollectionRoleDragData,
  formatDownloadCount,
  StandaloneRole,
  CollectionRole,
  RoleNamespace,
  GalaxySource,
  GalaxyConfig
} from '../../../services/galaxyRolesApiService'
import { useGalaxyCache } from '../../../contexts/GalaxyCacheContext'

interface RolesTreeViewProps {
  searchQuery?: string
  onRoleDragStart?: (role: { collection: string; name: string; description?: string }) => void
}

type ViewMode = 'standalone' | 'collection'

export const RolesTreeView = ({ searchQuery = '', onRoleDragStart }: RolesTreeViewProps) => {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('standalone')
  const [galaxySource, setGalaxySource] = useState<GalaxySource>('public')
  const [galaxyConfig, setGalaxyConfig] = useState<GalaxyConfig | null>(null)
  const [localSearch, setLocalSearch] = useState('')

  // Standalone roles state
  const [standaloneRoles, setStandaloneRoles] = useState<StandaloneRole[]>([])
  const [standaloneLoading, setStandaloneLoading] = useState(false)
  const [standaloneTotal, setStandaloneTotal] = useState(0)
  const [popularNamespaces, setPopularNamespaces] = useState<RoleNamespace[]>([])
  const [expandedNamespaces, setExpandedNamespaces] = useState<Set<string>>(new Set())

  // Collection roles state
  const [collectionRoles, setCollectionRoles] = useState<Record<string, CollectionRole[]>>({})
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set())

  // Get collections from Galaxy cache context
  const { allNamespaces, collectionsCache, getCollections, isReady } = useGalaxyCache()

  // Combined search query
  const effectiveSearch = searchQuery || localSearch

  // Load Galaxy config on mount
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getGalaxyConfig()
      setGalaxyConfig(config)
      // Set default source based on configuration
      if (!config.public_enabled && config.private_configured) {
        // Public disabled, use private
        setGalaxySource('private')
      } else if (config.preferred_source === 'private' && config.private_configured) {
        // User preference is private
        setGalaxySource('private')
      } else if (config.public_enabled) {
        setGalaxySource('public')
      }
    }
    loadConfig()
  }, [])

  // Load standalone roles
  const loadStandaloneRoles = useCallback(async () => {
    setStandaloneLoading(true)
    try {
      // Load popular namespaces
      const namespaces = await getPopularNamespaces(galaxySource, 30)
      setPopularNamespaces(namespaces)

      // Load roles (with optional search)
      const result = await getStandaloneRoles({
        search: effectiveSearch,
        pageSize: 100,
        source: galaxySource
      })
      setStandaloneRoles(result.results)
      setStandaloneTotal(result.count)
    } catch (error) {
      console.error('Failed to load standalone roles:', error)
    } finally {
      setStandaloneLoading(false)
    }
  }, [galaxySource, effectiveSearch])

  // Load standalone roles when switching to standalone tab or changing source/search
  useEffect(() => {
    if (viewMode === 'standalone') {
      loadStandaloneRoles()
    }
  }, [viewMode, galaxySource, loadStandaloneRoles])

  // Load roles for a specific namespace
  const loadNamespaceRoles = async (namespace: string) => {
    if (expandedNamespaces.has(namespace)) {
      // Collapse
      setExpandedNamespaces(prev => {
        const next = new Set(prev)
        next.delete(namespace)
        return next
      })
    } else {
      // Expand and load
      setExpandedNamespaces(prev => new Set(prev).add(namespace))
      const result = await getStandaloneRoles({
        namespace,
        pageSize: 50,
        source: galaxySource
      })
      // Merge with existing roles
      setStandaloneRoles(prev => {
        const existing = prev.filter(r => r.namespace !== namespace)
        return [...existing, ...result.results]
      })
    }
  }

  // Load collection roles
  const loadCollectionRoles = async (namespace: string, collection: string) => {
    const key = `${namespace}.${collection}`
    if (expandedCollections.has(key)) {
      // Collapse
      setExpandedCollections(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    } else {
      // Expand and load
      setExpandedCollections(prev => new Set(prev).add(key))
      if (!collectionRoles[key]) {
        setCollectionLoading(true)
        try {
          const roles = await getCollectionRoles(namespace, collection, 'latest', galaxySource)
          setCollectionRoles(prev => ({ ...prev, [key]: roles }))
        } catch (error) {
          console.error(`Failed to load roles for ${key}:`, error)
        } finally {
          setCollectionLoading(false)
        }
      }
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    clearGalaxyRolesCache()
    if (viewMode === 'standalone') {
      loadStandaloneRoles()
    }
  }

  // Handle standalone role drag
  const handleStandaloneRoleDragStart = (e: React.DragEvent, role: StandaloneRole) => {
    const dragData = createStandaloneRoleDragData(role)
    e.dataTransfer.setData('role', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'copy'
    onRoleDragStart?.({
      collection: role.namespace,
      name: role.name,
      description: role.description
    })
  }

  // Handle collection role drag
  const handleCollectionRoleDragStart = (e: React.DragEvent, role: CollectionRole) => {
    const dragData = createCollectionRoleDragData(role)
    e.dataTransfer.setData('role', JSON.stringify(dragData))
    e.dataTransfer.effectAllowed = 'copy'
    onRoleDragStart?.({
      collection: `${role.namespace}.${role.collection}`,
      name: role.name,
      description: role.description
    })
  }

  // Filter roles by search
  const filterRoles = <T extends { name: string; description?: string }>(roles: T[]): T[] => {
    if (!effectiveSearch) return roles
    const query = effectiveSearch.toLowerCase()
    return roles.filter(r =>
      r.name.toLowerCase().includes(query) ||
      (r.description && r.description.toLowerCase().includes(query))
    )
  }

  // Group standalone roles by namespace
  const rolesByNamespace = standaloneRoles.reduce((acc, role) => {
    if (!acc[role.namespace]) acc[role.namespace] = []
    acc[role.namespace].push(role)
    return acc
  }, {} as Record<string, StandaloneRole[]>)

  // Get collections with cached data
  const collectionsData = collectionsCache as Record<string, { name: string; description?: string }[]>

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with tabs and source toggle */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 1, py: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Tabs
            value={viewMode}
            onChange={(_, v) => setViewMode(v)}
            sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0 } }}
          >
            <Tab
              value="standalone"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccountTreeIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption">Standalone</Typography>
                  {standaloneTotal > 0 && (
                    <Chip label={standaloneTotal > 1000 ? `${Math.floor(standaloneTotal / 1000)}K` : standaloneTotal} size="small" sx={{ height: 16, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }} />
                  )}
                </Box>
              }
            />
            <Tab
              value="collection"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <WidgetsIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption">Collections</Typography>
                </Box>
              }
            />
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Source toggle - show if either both sources available or only private */}
            {(galaxyConfig?.private_configured || !galaxyConfig?.public_enabled) && (
              <ToggleButtonGroup
                value={galaxySource}
                exclusive
                onChange={(_, v) => v && setGalaxySource(v)}
                size="small"
                sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.25 } }}
              >
                {/* Only show public button if public is enabled */}
                {galaxyConfig?.public_enabled && (
                  <ToggleButton value="public">
                    <Tooltip title="Public Galaxy">
                      <PublicIcon sx={{ fontSize: 16 }} />
                    </Tooltip>
                  </ToggleButton>
                )}
                {/* Only show private button if private is configured */}
                {galaxyConfig?.private_configured && (
                  <ToggleButton value="private">
                    <Tooltip title={`Private: ${galaxyConfig.private_url}`}>
                      <LockIcon sx={{ fontSize: 16 }} />
                    </Tooltip>
                  </ToggleButton>
                )}
              </ToggleButtonGroup>
            )}

            {/* Refresh button */}
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={handleRefresh}>
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Search */}
        <TextField
          size="small"
          placeholder={viewMode === 'standalone' ? 'Search roles...' : 'Search in collections...'}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            sx: { fontSize: '0.875rem', '& input': { py: 0.75 } }
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* Alert if no Galaxy source available */}
        {galaxyConfig && !galaxyConfig.public_enabled && !galaxyConfig.private_configured && (
          <Alert severity="warning" sx={{ m: 1 }}>
            No Galaxy source configured. Enable public Galaxy or configure a private Galaxy in backend settings.
          </Alert>
        )}

        {/* Standalone Roles Tab */}
        {viewMode === 'standalone' && (galaxyConfig?.public_enabled || galaxyConfig?.private_configured) && (
          <Box>
            {standaloneLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {!standaloneLoading && standaloneRoles.length === 0 && (
              <Alert severity="info" sx={{ m: 1 }}>
                No standalone roles found. Try a different search or source.
              </Alert>
            )}

            {!standaloneLoading && popularNamespaces.length > 0 && (
              <List dense disablePadding>
                {popularNamespaces.map((ns) => {
                  const nsRoles = filterRoles(rolesByNamespace[ns.name] || [])
                  const isExpanded = expandedNamespaces.has(ns.name)

                  return (
                    <Box key={ns.name}>
                      <ListItem
                        component="div"
                        onClick={() => loadNamespaceRoles(ns.name)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <FolderIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={ns.name}
                          secondary={`${ns.role_count} roles • ${formatDownloadCount(ns.total_downloads)} downloads`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </ListItem>

                      <Collapse in={isExpanded}>
                        <List dense disablePadding sx={{ pl: 4 }}>
                          {nsRoles.map((role) => (
                            <ListItem
                              key={role.id}
                              component="div"
                              draggable
                              onDragStart={(e) => handleStandaloneRoleDragStart(e, role)}
                              sx={{
                                cursor: 'grab',
                                borderRadius: 1,
                                '&:hover': { bgcolor: 'secondary.light', color: 'secondary.contrastText' }
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 28 }}>
                                <AccountTreeIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={role.name}
                                secondary={role.description?.substring(0, 60)}
                                primaryTypographyProps={{ variant: 'body2' }}
                                secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                              />
                              <Tooltip title="Downloads">
                                <Chip
                                  icon={<DownloadIcon sx={{ fontSize: 12 }} />}
                                  label={formatDownloadCount(role.download_count)}
                                  size="small"
                                  sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }}
                                />
                              </Tooltip>
                            </ListItem>
                          ))}
                          {nsRoles.length === 0 && isExpanded && (
                            <ListItem>
                              <ListItemText
                                secondary="Loading roles..."
                                secondaryTypographyProps={{ variant: 'caption' }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Collapse>
                      <Divider />
                    </Box>
                  )
                })}
              </List>
            )}
          </Box>
        )}

        {/* Collection Roles Tab */}
        {viewMode === 'collection' && (galaxyConfig?.public_enabled || galaxyConfig?.private_configured) && (
          <Box>
            {!isReady && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}

            {isReady && allNamespaces.length === 0 && (
              <Alert severity="info" sx={{ m: 1 }}>
                No collections available. Switch to Modules tab to load namespaces.
              </Alert>
            )}

            {isReady && (
              <List dense disablePadding>
                {allNamespaces.slice(0, 30).map((ns) => {
                  const collections = collectionsData[ns.name] || []

                  return (
                    <Box key={ns.name}>
                      <ListItem
                        component="div"
                        onClick={() => {
                          // Toggle namespace expansion - load collections if needed
                          if (!collectionsData[ns.name]) {
                            getCollections(ns.name)
                          }
                        }}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <FolderIcon sx={{ fontSize: 18, color: 'info.main' }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={ns.name}
                          secondary={`${collections.length || '...'} collections`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>

                      {/* Collections under namespace */}
                      {collections.length > 0 && (
                        <List dense disablePadding sx={{ pl: 3 }}>
                          {collections.slice(0, 10).map((col) => {
                            const colKey = `${ns.name}.${col.name}`
                            const isExpanded = expandedCollections.has(colKey)
                            const roles = collectionRoles[colKey] || []

                            return (
                              <Box key={colKey}>
                                <ListItem
                                  component="div"
                                  onClick={() => loadCollectionRoles(ns.name, col.name)}
                                  sx={{
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: 'action.hover' }
                                  }}
                                >
                                  <ListItemIcon sx={{ minWidth: 28 }}>
                                    <WidgetsIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={col.name}
                                    primaryTypographyProps={{ variant: 'body2' }}
                                  />
                                  {roles.length > 0 && (
                                    <Chip
                                      label={`${roles.length} roles`}
                                      size="small"
                                      color="secondary"
                                      sx={{ height: 18, '& .MuiChip-label': { px: 0.5, fontSize: '0.65rem' } }}
                                    />
                                  )}
                                  {isExpanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
                                </ListItem>

                                <Collapse in={isExpanded}>
                                  <List dense disablePadding sx={{ pl: 4 }}>
                                    {collectionLoading && roles.length === 0 && (
                                      <ListItem>
                                        <CircularProgress size={16} />
                                        <ListItemText secondary="Loading roles..." sx={{ ml: 1 }} />
                                      </ListItem>
                                    )}
                                    {!collectionLoading && roles.length === 0 && isExpanded && (
                                      <ListItem>
                                        <ListItemText
                                          secondary="No roles in this collection"
                                          secondaryTypographyProps={{ variant: 'caption', fontStyle: 'italic' }}
                                        />
                                      </ListItem>
                                    )}
                                    {filterRoles(roles).map((role, idx) => (
                                      <ListItem
                                        key={`${role.fqcn}-${idx}`}
                                        component="div"
                                        draggable
                                        onDragStart={(e) => handleCollectionRoleDragStart(e, role)}
                                        sx={{
                                          cursor: 'grab',
                                          borderRadius: 1,
                                          '&:hover': { bgcolor: 'secondary.light', color: 'secondary.contrastText' }
                                        }}
                                      >
                                        <ListItemIcon sx={{ minWidth: 24 }}>
                                          <AccountTreeIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={role.name}
                                          secondary={role.description?.substring(0, 50)}
                                          primaryTypographyProps={{ variant: 'caption', fontWeight: 500 }}
                                          secondaryTypographyProps={{ variant: 'caption', fontSize: '0.65rem' }}
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </Collapse>
                              </Box>
                            )
                          })}
                        </List>
                      )}
                    </Box>
                  )
                })}
              </List>
            )}
          </Box>
        )}
      </Box>

      {/* Footer with source info */}
      <Box sx={{ px: 1, py: 0.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Typography variant="caption" color="text.secondary">
          {galaxySource === 'public' ? '🌐 ' : '🔒 '}
          {galaxySource === 'public' ? 'galaxy.ansible.com' : galaxyConfig?.private_url || 'Private Galaxy'}
        </Typography>
      </Box>
    </Box>
  )
}
