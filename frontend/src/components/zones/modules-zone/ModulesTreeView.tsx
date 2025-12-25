import { useState, useEffect, useRef } from 'react'
import { Box, Typography, CircularProgress, IconButton, Tooltip, Tabs, Tab, Chip, LinearProgress } from '@mui/material'
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
    getModules,
    collectionsCache,
    modulesCache,
    preloadComplete,
    setCollectionsCacheData,
    setModulesCacheData,
    setPreloadComplete
  } = useGalaxyCache()

  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set())

  // Use context cache for data
  const collectionsData = collectionsCache as Record<string, CollectionData[]>
  const modulesData = modulesCache as Record<string, ModuleData[]>

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

  // Preloading state - separate tracking for each level
  const [preloadProgress, setPreloadProgress] = useState<{
    phase: 'idle' | 'namespaces' | 'collections' | 'modules' | 'complete'
    namespaces: { current: number; total: number }
    collections: { current: number; total: number }
    modules: { current: number; total: number }
    currentItem: string
  }>({
    phase: 'idle',
    namespaces: { current: 0, total: 0 },
    collections: { current: 0, total: 0 },
    modules: { current: 0, total: 0 },
    currentItem: ''
  })
  const preloadStarted = useRef(false)

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

  // Preload all data (collections and modules) for instant search
  // Uses parallel loading with batches for better performance
  useEffect(() => {
    // Skip if already preloaded or not ready
    if (preloadComplete || preloadStarted.current || !isReady || allNamespaces.length === 0) return
    preloadStarted.current = true

    const BATCH_SIZE = 10 // Number of parallel requests

    const preloadAllData = async () => {
      const namespaces = allNamespaces.map(ns => ns.name)
      const totalNamespaces = namespaces.length

      // Initialize progress with totals
      setPreloadProgress(prev => ({
        ...prev,
        phase: 'namespaces',
        namespaces: { current: totalNamespaces, total: totalNamespaces },
        collections: { current: 0, total: 0 },
        modules: { current: 0, total: 0 },
        currentItem: 'Namespaces loaded'
      }))

      // Small delay to show namespaces phase
      await new Promise(resolve => setTimeout(resolve, 300))

      // Phase 1: Load all collections in parallel batches
      setPreloadProgress(prev => ({
        ...prev,
        phase: 'collections',
        currentItem: ''
      }))

      const allCollections: Record<string, CollectionData[]> = {}

      for (let i = 0; i < namespaces.length; i += BATCH_SIZE) {
        const batch = namespaces.slice(i, i + BATCH_SIZE)
        const batchNames = batch.join(', ')
        setPreloadProgress(prev => ({
          ...prev,
          phase: 'collections',
          collections: { current: Math.min(i + BATCH_SIZE, totalNamespaces), total: totalNamespaces },
          currentItem: batchNames
        }))

        // Load batch in parallel
        const results = await Promise.all(
          batch.map(async (ns) => {
            try {
              const collections = await getCollections(ns)
              return { ns, collections }
            } catch (error) {
              console.error(`Failed to preload collections for ${ns}:`, error)
              return { ns, collections: null }
            }
          })
        )

        // Store results
        results.forEach(({ ns, collections }) => {
          if (collections) {
            allCollections[ns] = collections
          }
        })
      }
      setCollectionsCacheData(allCollections)

      // Phase 2: Load all modules in parallel batches
      const collectionIds = Object.entries(allCollections).flatMap(([ns, cols]) =>
        cols.map(c => `${ns}.${c.name}`)
      )
      const totalCollections = collectionIds.length

      setPreloadProgress(prev => ({
        ...prev,
        phase: 'modules',
        collections: { current: totalNamespaces, total: totalNamespaces },
        modules: { current: 0, total: totalCollections },
        currentItem: ''
      }))

      const allModules: Record<string, ModuleData[]> = {}

      for (let i = 0; i < collectionIds.length; i += BATCH_SIZE) {
        const batch = collectionIds.slice(i, i + BATCH_SIZE)
        const batchNames = batch.length <= 3 ? batch.join(', ') : `${batch[0]} ... ${batch[batch.length - 1]}`
        setPreloadProgress(prev => ({
          ...prev,
          phase: 'modules',
          modules: { current: Math.min(i + BATCH_SIZE, totalCollections), total: totalCollections },
          currentItem: batchNames
        }))

        // Load batch in parallel
        const results = await Promise.all(
          batch.map(async (collectionId) => {
            const [namespace, collection] = collectionId.split('.')
            try {
              const modules = await getModules(namespace, collection, 'latest')
              return { collectionId, modules }
            } catch (error) {
              console.error(`Failed to preload modules for ${collectionId}:`, error)
              return { collectionId, modules: null }
            }
          })
        )

        // Store results
        results.forEach(({ collectionId, modules }) => {
          if (modules) {
            allModules[collectionId] = modules
          }
        })
      }
      setModulesCacheData(allModules)

      // Complete - mark in context so it persists across tab switches
      setPreloadComplete(true)
      setPreloadProgress(prev => ({
        ...prev,
        phase: 'complete',
        modules: { current: totalCollections, total: totalCollections },
        currentItem: 'Ready'
      }))
      console.log(`✅ Preload complete: ${Object.keys(allCollections).length} namespaces, ${Object.keys(allModules).length} collections (parallel batches of ${BATCH_SIZE})`)
    }

    preloadAllData()
  }, [isReady, allNamespaces, preloadComplete, getCollections, getModules, setCollectionsCacheData, setModulesCacheData, setPreloadComplete])

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

  // Search query for filtering
  const query = searchQuery.toLowerCase()

  // ===== RECURSIVE SEARCH LOGIC =====
  // An element is displayed if:
  // - It matches the search query directly (displayed normally, all children visible)
  // - OR one of its children matches (displayed in grey - transitive)

  // Check if a module matches the search
  const moduleMatchesSearch = (module: ModuleData): boolean => {
    if (!query) return true
    return module.name.toLowerCase().includes(query)
  }

  // Check if a collection matches the search directly
  const collectionMatchesSearch = (collection: CollectionData): boolean => {
    if (!query) return true
    return collection.name.toLowerCase().includes(query)
  }

  // Check if a collection has any matching modules (for transitive display)
  const collectionHasMatchingModules = (collectionId: string): boolean => {
    if (!query) return false
    const modules = modulesData[collectionId] || []
    return modules.some(m => m.name.toLowerCase().includes(query))
  }

  // Check if a collection should be displayed (matches or has matching children)
  const shouldDisplayCollection = (namespace: string, collection: CollectionData): boolean => {
    if (!query) return true
    const collectionId = `${namespace}.${collection.name}`
    return collectionMatchesSearch(collection) || collectionHasMatchingModules(collectionId)
  }

  // Check if a namespace matches the search directly
  const namespaceMatchesSearch = (namespace: string): boolean => {
    if (!query) return true
    return namespace.toLowerCase().includes(query)
  }

  // Check if a namespace has any matching collections or modules (for transitive display)
  const namespaceHasMatchingChildren = (namespace: string): boolean => {
    if (!query) return false
    const collections = collectionsData[namespace] || []

    // Check if any collection matches
    if (collections.some(c => c.name.toLowerCase().includes(query))) return true

    // Check if any module in any collection matches
    for (const collection of collections) {
      const collectionId = `${namespace}.${collection.name}`
      if (collectionHasMatchingModules(collectionId)) return true
    }

    return false
  }

  // Check if a namespace should be displayed (matches or has matching children)
  const shouldDisplayNamespace = (namespace: string): boolean => {
    if (!query) return true
    return namespaceMatchesSearch(namespace) || namespaceHasMatchingChildren(namespace)
  }

  // Check if element is displayed by transitivity (grey styling)
  const isNamespaceTransitive = (namespace: string): boolean => {
    if (!query) return false
    return !namespaceMatchesSearch(namespace) && namespaceHasMatchingChildren(namespace)
  }

  const isCollectionTransitive = (namespace: string, collection: CollectionData): boolean => {
    if (!query) return false
    const collectionId = `${namespace}.${collection.name}`
    // Transitive if: namespace matches (so collection shown as child) OR collection doesn't match but has matching modules
    if (namespaceMatchesSearch(namespace)) return false // Parent matches, not transitive
    return !collectionMatchesSearch(collection) && collectionHasMatchingModules(collectionId)
  }

  const isModuleTransitive = (namespace: string, collection: CollectionData, module: ModuleData): boolean => {
    if (!query) return false
    // Module is transitive if its parent (namespace or collection) matches but module itself doesn't
    if (namespaceMatchesSearch(namespace) || collectionMatchesSearch(collection)) {
      return !moduleMatchesSearch(module)
    }
    return false // If we got here via transitive path, module must match
  }

  // ===== DISPLAY FUNCTIONS =====

  // Get namespaces based on view mode and search
  const getDisplayedNamespaces = () => {
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

    // Filter by search query (recursive logic)
    if (query) {
      baseList = baseList.filter(ns => shouldDisplayNamespace(ns.name))
    }

    return baseList.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Filter collections based on favorites mode AND search
  const getDisplayedCollections = (namespace: string): CollectionData[] => {
    let collections = collectionsData[namespace] || []

    // First apply favorites filter
    if (viewMode === 'favorites') {
      // If namespace is a favorite, show ALL its collections (then filter by search)
      if (!isFavoriteNamespace(namespace)) {
        // Otherwise, show only collections that are favorites or contain favorite modules
        collections = collections.filter(c => {
          const collectionId = `${namespace}.${c.name}`
          if (isFavoriteCollection(collectionId)) return true
          return favoriteModules.some(m => m.startsWith(collectionId + '.'))
        })
      }
    }

    // Then apply search filter (recursive logic)
    if (query) {
      // If namespace matches directly, show all collections
      if (namespaceMatchesSearch(namespace)) {
        return collections
      }
      // Otherwise, filter to only show collections that match or have matching modules
      collections = collections.filter(c => shouldDisplayCollection(namespace, c))
    }

    return collections
  }

  // Filter modules based on favorites mode AND search
  const getDisplayedModules = (namespace: string, collection: CollectionData): ModuleData[] => {
    const collectionId = `${namespace}.${collection.name}`
    let modules = modulesData[collectionId] || []

    // First apply favorites filter
    if (viewMode === 'favorites') {
      // If namespace or collection is a favorite, show ALL modules (then filter by search)
      if (!isFavoriteNamespace(namespace) && !isFavoriteCollection(collectionId)) {
        // Otherwise, show only favorite modules
        modules = modules.filter(m => isFavoriteModule(`${collectionId}.${m.name}`))
      }
    }

    // Then apply search filter (recursive logic)
    if (query) {
      // If namespace or collection matches directly, show all modules
      if (namespaceMatchesSearch(namespace) || collectionMatchesSearch(collection)) {
        return modules
      }
      // Otherwise, filter to only show matching modules
      modules = modules.filter(m => moduleMatchesSearch(m))
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

  // Load collections for a namespace (lazy loading on click)
  const loadCollections = async (namespace: string) => {
    if (collectionsData[namespace]) return

    setLoadingNodes(prev => new Set(prev).add(namespace))
    try {
      const collections = await getCollections(namespace)
      if (collections) {
        setCollectionsCacheData({ [namespace]: collections })
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

  // Load modules for a collection (lazy loading on click)
  const loadModules = async (collectionId: string) => {
    if (modulesData[collectionId]) return

    const [namespace, collection] = collectionId.split('.')

    setLoadingNodes(prev => new Set(prev).add(collectionId))
    try {
      const modules = await getModules(namespace, collection, 'latest')
      if (modules) {
        setModulesCacheData({ [collectionId]: modules })
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

      {/* Preload Progress Indicator - 3 distinct bars */}
      {preloadProgress.phase !== 'idle' && preloadProgress.phase !== 'complete' && (
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Loading data for search...
          </Typography>

          {/* Namespaces bar */}
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FolderIcon sx={{ fontSize: 14, color: preloadProgress.namespaces.current > 0 ? 'success.main' : 'text.disabled' }} />
                <Typography variant="caption" color={preloadProgress.namespaces.current > 0 ? 'success.main' : 'text.disabled'}>
                  Namespaces
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {preloadProgress.namespaces.current}/{preloadProgress.namespaces.total}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={preloadProgress.namespaces.total > 0 ? (preloadProgress.namespaces.current / preloadProgress.namespaces.total) * 100 : 0}
              color="success"
              sx={{ height: 6, borderRadius: 1 }}
            />
          </Box>

          {/* Collections bar */}
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <WidgetsIcon sx={{ fontSize: 14, color: preloadProgress.phase === 'collections' ? 'info.main' : preloadProgress.collections.current > 0 ? 'success.main' : 'text.disabled' }} />
                <Typography variant="caption" color={preloadProgress.phase === 'collections' ? 'info.main' : preloadProgress.collections.current > 0 ? 'success.main' : 'text.disabled'}>
                  Collections
                </Typography>
                {preloadProgress.phase === 'collections' && <CircularProgress size={10} sx={{ ml: 0.5 }} />}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {preloadProgress.collections.current}/{preloadProgress.collections.total}
              </Typography>
            </Box>
            <LinearProgress
              variant={preloadProgress.phase === 'collections' ? 'determinate' : 'determinate'}
              value={preloadProgress.collections.total > 0 ? (preloadProgress.collections.current / preloadProgress.collections.total) * 100 : 0}
              color={preloadProgress.phase === 'collections' ? 'info' : 'success'}
              sx={{ height: 6, borderRadius: 1 }}
            />
          </Box>

          {/* Modules bar */}
          <Box sx={{ mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ExtensionIcon sx={{ fontSize: 14, color: preloadProgress.phase === 'modules' ? 'warning.main' : preloadProgress.modules.current > 0 ? 'success.main' : 'text.disabled' }} />
                <Typography variant="caption" color={preloadProgress.phase === 'modules' ? 'warning.main' : preloadProgress.modules.current > 0 ? 'success.main' : 'text.disabled'}>
                  Modules
                </Typography>
                {preloadProgress.phase === 'modules' && <CircularProgress size={10} sx={{ ml: 0.5 }} />}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {preloadProgress.modules.current}/{preloadProgress.modules.total}
              </Typography>
            </Box>
            <LinearProgress
              variant={preloadProgress.phase === 'modules' ? 'determinate' : 'determinate'}
              value={preloadProgress.modules.total > 0 ? (preloadProgress.modules.current / preloadProgress.modules.total) * 100 : 0}
              color={preloadProgress.phase === 'modules' ? 'warning' : 'success'}
              sx={{ height: 6, borderRadius: 1 }}
            />
          </Box>

          {/* Current item being loaded */}
          {preloadProgress.currentItem && (
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem', fontStyle: 'italic' }}>
              {preloadProgress.currentItem}
            </Typography>
          )}
        </Box>
      )}

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
              const isNsTransitive = isNamespaceTransitive(namespace.name)
              const displayedCollections = getDisplayedCollections(namespace.name)

              return (
                <TreeItem
                  key={namespace.name}
                  itemId={namespace.name}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: isNsTransitive ? 0.5 : 1 }}>
                      <FolderIcon sx={{ fontSize: 18, color: isNsTransitive ? 'text.disabled' : isFav ? 'warning.main' : 'primary.main' }} />
                      <Typography variant="body2" sx={{ fontWeight: 500, flex: 1, color: isNsTransitive ? 'text.disabled' : 'inherit' }}>
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
                    const isCollTransitive = isCollectionTransitive(namespace.name, collection)
                    const displayedModules = getDisplayedModules(namespace.name, collection)

                    return (
                      <TreeItem
                        key={collectionId}
                        itemId={collectionId}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: isCollTransitive ? 0.5 : 1 }}>
                            <WidgetsIcon sx={{ fontSize: 16, color: isCollTransitive ? 'text.disabled' : isCollFav ? 'warning.main' : 'secondary.main' }} />
                            <Typography variant="body2" sx={{ flex: 1, color: isCollTransitive ? 'text.disabled' : 'inherit' }}>
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
                          const isModTransitive = isModuleTransitive(namespace.name, collection, module)

                          return (
                            <TreeItem
                              key={treeItemId}
                              itemId={treeItemId}
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: isModTransitive ? 0.5 : 1 }}>
                                  <Box
                                    draggable
                                    onDragStart={(e) => handleModuleDragStart(e, namespace.name, collection.name, module)}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      flex: 1,
                                      cursor: 'grab',
                                      '&:hover': { bgcolor: isModTransitive ? 'action.hover' : 'primary.light', color: isModTransitive ? 'inherit' : 'white', borderRadius: 1 },
                                      py: 0.25,
                                      px: 0.5,
                                      borderRadius: 1,
                                    }}
                                  >
                                    <ExtensionIcon sx={{ fontSize: 14, color: isModTransitive ? 'text.disabled' : isModFav ? 'warning.main' : 'text.secondary' }} />
                                    <Typography variant="caption" sx={{ fontWeight: 500, color: isModTransitive ? 'text.disabled' : 'inherit' }}>
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
