import { useState, useEffect } from 'react'
import { Box, Typography, CircularProgress, IconButton, Tooltip, Tabs, Tab, Chip } from '@mui/material'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem } from '@mui/x-tree-view/TreeItem'
import FolderIcon from '@mui/icons-material/Folder'
import ExtensionIcon from '@mui/icons-material/Extension'
import WidgetsIcon from '@mui/icons-material/Widgets'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import SettingsIcon from '@mui/icons-material/Settings'
import { useGalaxyCache } from '../../../contexts/GalaxyCacheContext'
import { Namespace } from '../../../services/ansibleApiService'
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
} from '../../../services/userPreferencesService'

interface ModulesTreeViewProps {
  searchQuery?: string
  onModuleDragStart?: (module: { collection: string; name: string; description?: string }) => void
}

interface CollectionData {
  name: string
  description?: string
  latest_version: string
}

interface ModuleData {
  name: string
  description?: string
  content_type?: string
}

// Local storage keys for collection and module favorites
const COLLECTION_FAVORITES_KEY = 'ansible_builder_favorite_collections'
const MODULE_FAVORITES_KEY = 'ansible_builder_favorite_modules'

// Helper functions for local storage favorites
const getLocalFavorites = (key: string): string[] => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setLocalFavorites = (key: string, favorites: string[]) => {
  localStorage.setItem(key, JSON.stringify(favorites))
}

export const ModulesTreeView = ({ searchQuery = '', onModuleDragStart }: ModulesTreeViewProps) => {
  const {
    allNamespaces,
    isLoading,
    isReady,
    getCollections,
    getModules
  } = useGalaxyCache()

  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [collectionsData, setCollectionsData] = useState<Record<string, CollectionData[]>>({})
  const [modulesData, setModulesData] = useState<Record<string, ModuleData[]>>({})
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set())

  // View mode: 'favorites' or 'all'
  const [viewMode, setViewMode] = useState<'favorites' | 'all'>('favorites')

  // Standard namespaces from admin configuration
  const [standardNamespaces, setStandardNamespaces] = useState<string[]>(['community'])

  // User favorites (namespaces from backend API)
  const [favoriteNamespaces, setFavoriteNamespaces] = useState<string[]>([])

  // Local favorites (collections and modules from localStorage)
  const [favoriteCollections, setFavoriteCollections] = useState<string[]>([])
  const [favoriteModules, setFavoriteModules] = useState<string[]>([])

  const [favoritesLoading, setFavoritesLoading] = useState(false)

  // Combined namespace favorites = standard + user
  const combinedNamespaceFavorites = [...new Set([...standardNamespaces, ...favoriteNamespaces])]

  // Total favorites count
  const totalFavoritesCount = combinedNamespaceFavorites.length + favoriteCollections.length + favoriteModules.length

  // Load standard namespaces from configuration on mount
  useEffect(() => {
    const loadStandardNamespaces = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          console.log('No token available - using default standard namespaces')
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
            console.log(`✅ Loaded ${data.namespaces.length} standard namespaces from configuration`)
          }
        }
      } catch (error) {
        console.error('Failed to load standard namespaces:', error)
      }
    }

    loadStandardNamespaces()
  }, [])

  // Load all favorites on mount
  useEffect(() => {
    const loadAllFavorites = async () => {
      setFavoritesLoading(true)
      try {
        // Load namespace favorites from backend
        const nsFavorites = await getUserFavorites()
        setFavoriteNamespaces(nsFavorites || [])

        // Load collection and module favorites from localStorage
        setFavoriteCollections(getLocalFavorites(COLLECTION_FAVORITES_KEY))
        setFavoriteModules(getLocalFavorites(MODULE_FAVORITES_KEY))
      } catch (error) {
        console.error('Failed to load favorites:', error)
      } finally {
        setFavoritesLoading(false)
      }
    }
    loadAllFavorites()
  }, [])

  // Check functions
  const isStandardNamespace = (namespace: string) => standardNamespaces.includes(namespace)
  const isUserFavoriteNamespace = (namespace: string) => favoriteNamespaces.includes(namespace)
  const isFavoriteNamespace = (namespace: string) => combinedNamespaceFavorites.includes(namespace)
  const isFavoriteCollection = (collectionId: string) => favoriteCollections.includes(collectionId)
  const isFavoriteModule = (moduleId: string) => favoriteModules.includes(moduleId)

  // Toggle namespace favorite
  const handleToggleNamespaceFavorite = async (e: React.MouseEvent, namespace: string) => {
    e.stopPropagation()
    if (isStandardNamespace(namespace) && !isUserFavoriteNamespace(namespace)) {
      return // Standard favorites are managed in configuration
    }

    try {
      if (isUserFavoriteNamespace(namespace)) {
        await removeFavorite('namespace', namespace)
        setFavoriteNamespaces(prev => prev.filter(f => f !== namespace))
      } else {
        await addFavorite('namespace', namespace)
        setFavoriteNamespaces(prev => [...prev, namespace])
      }
    } catch (error) {
      console.error('Failed to toggle namespace favorite:', error)
    }
  }

  // Toggle collection favorite (localStorage)
  const handleToggleCollectionFavorite = (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation()
    const newFavorites = isFavoriteCollection(collectionId)
      ? favoriteCollections.filter(f => f !== collectionId)
      : [...favoriteCollections, collectionId]
    setFavoriteCollections(newFavorites)
    setLocalFavorites(COLLECTION_FAVORITES_KEY, newFavorites)
  }

  // Toggle module favorite (localStorage)
  const handleToggleModuleFavorite = (e: React.MouseEvent, moduleId: string) => {
    e.stopPropagation()
    const newFavorites = isFavoriteModule(moduleId)
      ? favoriteModules.filter(f => f !== moduleId)
      : [...favoriteModules, moduleId]
    setFavoriteModules(newFavorites)
    setLocalFavorites(MODULE_FAVORITES_KEY, newFavorites)
  }

  // Get namespaces based on view mode and search
  const getDisplayedNamespaces = () => {
    const query = searchQuery.toLowerCase()

    // Get base list based on view mode
    let baseList: Namespace[]

    if (viewMode === 'favorites') {
      // In favorites mode, show namespaces that:
      // 1. Are favorite namespaces, OR
      // 2. Contain favorite collections, OR
      // 3. Contain favorite modules
      const nsWithFavCollections = favoriteCollections.map(c => c.split('.')[0])
      const nsWithFavModules = favoriteModules.map(m => m.split('.')[0])
      const allFavNs = [...new Set([...combinedNamespaceFavorites, ...nsWithFavCollections, ...nsWithFavModules])]

      baseList = allNamespaces.filter(ns => allFavNs.includes(ns.name))
    } else {
      baseList = allNamespaces
    }

    // Filter by search query
    if (query) {
      baseList = baseList.filter(ns => {
        if (ns.name.toLowerCase().includes(query)) return true
        const collections = collectionsData[ns.name]
        if (collections?.some(c => c.name.toLowerCase().includes(query))) return true
        for (const collectionId of Object.keys(modulesData)) {
          if (collectionId.startsWith(ns.name + '.')) {
            if (modulesData[collectionId]?.some(m => m.name.toLowerCase().includes(query))) {
              return true
            }
          }
        }
        return false
      })
    }

    return baseList.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Filter collections in favorites mode
  const getDisplayedCollections = (namespace: string): CollectionData[] => {
    const collections = collectionsData[namespace] || []

    if (viewMode === 'favorites') {
      // If namespace is a favorite, show ALL its collections
      if (isFavoriteNamespace(namespace)) {
        return collections
      }
      // Otherwise, show only collections that are favorites or contain favorite modules
      return collections.filter(c => {
        const collectionId = `${namespace}.${c.name}`
        if (isFavoriteCollection(collectionId)) return true
        return favoriteModules.some(m => m.startsWith(collectionId + '.'))
      })
    }

    return collections
  }

  // Filter modules in favorites mode
  const getDisplayedModules = (collectionId: string): ModuleData[] => {
    const modules = modulesData[collectionId] || []

    if (viewMode === 'favorites') {
      const [namespace] = collectionId.split('.')
      // If namespace or collection is a favorite, show ALL modules
      if (isFavoriteNamespace(namespace) || isFavoriteCollection(collectionId)) {
        return modules
      }
      // Otherwise, show only favorite modules
      return modules.filter(m => isFavoriteModule(`${collectionId}.${m.name}`))
    }

    return modules
  }

  const displayedNamespaces = getDisplayedNamespaces()

  // Handle node expansion - load data lazily
  const handleExpandedItemsChange = async (event: React.SyntheticEvent, nodeIds: string[]) => {
    setExpandedItems(nodeIds)

    const newlyExpanded = nodeIds.filter(id => !expandedItems.includes(id))

    for (const nodeId of newlyExpanded) {
      if (!nodeId.includes('.')) {
        await loadCollections(nodeId)
      } else if (nodeId.split('.').length === 2) {
        await loadModules(nodeId)
      }
    }
  }

  // Load collections for a namespace
  const loadCollections = async (namespace: string) => {
    if (collectionsData[namespace]) return

    setLoadingNodes(prev => new Set(prev).add(namespace))
    try {
      const collections = await getCollections(namespace)
      if (collections) {
        setCollectionsData(prev => ({ ...prev, [namespace]: collections }))
      }
    } catch (error) {
      console.error(`Failed to load collections for ${namespace}:`, error)
    } finally {
      setLoadingNodes(prev => {
        const next = new Set(prev)
        next.delete(namespace)
        return next
      })
    }
  }

  // Load modules for a collection
  const loadModules = async (collectionId: string) => {
    if (modulesData[collectionId]) return

    const [namespace, collection] = collectionId.split('.')

    setLoadingNodes(prev => new Set(prev).add(collectionId))
    try {
      const modules = await getModules(namespace, collection, 'latest')
      if (modules) {
        setModulesData(prev => ({ ...prev, [collectionId]: modules }))
      }
    } catch (error) {
      console.error(`Failed to load modules for ${collectionId}:`, error)
    } finally {
      setLoadingNodes(prev => {
        const next = new Set(prev)
        next.delete(collectionId)
        return next
      })
    }
  }

  // Handle module drag
  const handleModuleDragStart = (
    e: React.DragEvent,
    namespace: string,
    collection: string,
    module: ModuleData
  ) => {
    const moduleData = {
      collection: `${namespace}.${collection}`,
      name: module.name,
      description: module.description
    }
    e.dataTransfer.setData('module', JSON.stringify(moduleData))
    onModuleDragStart?.(moduleData)
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* View Mode Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={viewMode}
          onChange={(_, value) => setViewMode(value)}
          variant="fullWidth"
        >
          <Tab
            value="favorites"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StarIcon sx={{ fontSize: 16 }} />
                <Typography variant="body2">FAVORITES</Typography>
                <Chip
                  label={totalFavoritesCount}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ height: 20, '& .MuiChip-label': { px: 1 } }}
                />
              </Box>
            }
          />
          <Tab
            value="all"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">ALL</Typography>
                <Chip
                  label={allNamespaces.length}
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{ height: 20, '& .MuiChip-label': { px: 1 } }}
                />
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Tree View */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {viewMode === 'favorites' && totalFavoritesCount === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No favorites yet.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Switch to "ALL" and click star icons to add namespaces, collections, or modules.
            </Typography>
          </Box>
        ) : (
          <SimpleTreeView
            expandedItems={expandedItems}
            onExpandedItemsChange={handleExpandedItemsChange}
            sx={{
              '& .MuiTreeItem-content': { py: 0.5 },
              '& .MuiTreeItem-label': { fontSize: '0.875rem' }
            }}
          >
            {displayedNamespaces.map((namespace) => {
              const isStd = isStandardNamespace(namespace.name)
              const isUsr = isUserFavoriteNamespace(namespace.name)
              const isFav = isFavoriteNamespace(namespace.name)
              const displayedCollections = getDisplayedCollections(namespace.name)

              return (
                <TreeItem
                  key={namespace.name}
                  itemId={namespace.name}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FolderIcon sx={{ fontSize: 18, color: isFav ? 'warning.main' : 'primary.main' }} />
                      <Typography variant="body2" sx={{ fontWeight: 500, flex: 1 }}>
                        {namespace.name}
                      </Typography>
                      {loadingNodes.has(namespace.name) && <CircularProgress size={12} />}
                      {isStd && !isUsr && (
                        <Tooltip title="Configured by admin">
                          <SettingsIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        </Tooltip>
                      )}
                      <Tooltip title={isStd && !isUsr ? "Standard favorite" : isFav ? "Remove from favorites" : "Add to favorites"}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleToggleNamespaceFavorite(e, namespace.name)}
                          sx={{ p: 0.25 }}
                          disabled={isStd && !isUsr}
                        >
                          {isFav ? <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} /> : <StarBorderIcon sx={{ fontSize: 16, color: 'text.secondary' }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  {/* Collections */}
                  {displayedCollections.map((collection) => {
                    const collectionId = `${namespace.name}.${collection.name}`
                    const isCollFav = isFavoriteCollection(collectionId)
                    const displayedModules = getDisplayedModules(collectionId)

                    return (
                      <TreeItem
                        key={collectionId}
                        itemId={collectionId}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <WidgetsIcon sx={{ fontSize: 16, color: isCollFav ? 'warning.main' : 'secondary.main' }} />
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {collection.name}
                            </Typography>
                            {loadingNodes.has(collectionId) && <CircularProgress size={12} />}
                            <Tooltip title={isCollFav ? "Remove from favorites" : "Add to favorites"}>
                              <IconButton
                                size="small"
                                onClick={(e) => handleToggleCollectionFavorite(e, collectionId)}
                                sx={{ p: 0.25 }}
                              >
                                {isCollFav ? <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} /> : <StarBorderIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        }
                      >
                        {/* Modules */}
                        {displayedModules.map((module, idx) => {
                          const moduleId = `${collectionId}.${module.name}`
                          // Use unique itemId with index to avoid duplicates
                          const treeItemId = `module:${collectionId}.${module.name}:${idx}`
                          const isModFav = isFavoriteModule(moduleId)

                          return (
                            <TreeItem
                              key={treeItemId}
                              itemId={treeItemId}
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Box
                                    draggable
                                    onDragStart={(e) => handleModuleDragStart(e, namespace.name, collection.name, module)}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      flex: 1,
                                      cursor: 'grab',
                                      '&:hover': { bgcolor: 'primary.light', color: 'white', borderRadius: 1 },
                                      py: 0.25,
                                      px: 0.5,
                                      borderRadius: 1,
                                    }}
                                  >
                                    <ExtensionIcon sx={{ fontSize: 14, color: isModFav ? 'warning.main' : 'text.secondary' }} />
                                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                      {module.name}
                                    </Typography>
                                  </Box>
                                  <Tooltip title={isModFav ? "Remove from favorites" : "Add to favorites"}>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleToggleModuleFavorite(e, moduleId)}
                                      sx={{ p: 0.25 }}
                                    >
                                      {isModFav ? <StarIcon sx={{ fontSize: 12, color: 'warning.main' }} /> : <StarBorderIcon sx={{ fontSize: 12, color: 'text.secondary' }} />}
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              }
                            />
                          )
                        })}
                        {/* Placeholder - always show for displayed collections */}
                        {!modulesData[collectionId] && !loadingNodes.has(collectionId) && (
                          <TreeItem
                            itemId={`${collectionId}.__placeholder`}
                            label={<Typography variant="caption" color="text.secondary">Click to load modules...</Typography>}
                          />
                        )}
                      </TreeItem>
                    )
                  })}
                  {/* Placeholder - always show in favorites mode for displayed namespaces */}
                  {!collectionsData[namespace.name] && !loadingNodes.has(namespace.name) && (
                    <TreeItem
                      itemId={`${namespace.name}.__placeholder`}
                      label={<Typography variant="caption" color="text.secondary">Click to load collections...</Typography>}
                    />
                  )}
                </TreeItem>
              )
            })}
          </SimpleTreeView>
        )}

        {displayedNamespaces.length === 0 && viewMode === 'all' && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No namespaces found
          </Typography>
        )}
      </Box>
    </Box>
  )
}
