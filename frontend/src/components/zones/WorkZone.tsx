import { Box, Typography, Paper, IconButton, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Tabs, Tab, Button, Chip, Badge } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import GridOnIcon from '@mui/icons-material/GridOn'
import GridOffIcon from '@mui/icons-material/GridOff'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import SettingsIcon from '@mui/icons-material/Settings'
import ExtensionIcon from '@mui/icons-material/Extension'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import NumbersIcon from '@mui/icons-material/Numbers'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import DataArrayIcon from '@mui/icons-material/DataArray'
import DataObjectIcon from '@mui/icons-material/DataObject'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import LockIcon from '@mui/icons-material/Lock'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import PlaySectionContent from './PlaySectionContent'
import BlockSectionContent from './BlockSectionContent'
import TaskAttributeIcons from '../common/TaskAttributeIcons'
import PlayAttributeIcons from '../common/PlayAttributeIcons'
import SectionLinks from '../common/SectionLinks'
import TabIconBadge from '../common/TabIconBadge'
import ResizeHandles from '../common/ResizeHandles'
import AddVariableDialog from '../dialogs/AddVariableDialog'
import { ModuleBlock, Link, PlayVariable, VariableType, PlaySectionName, Play, PlayAttributes, ModuleSchema, isSystemBlock } from '../../types/playbook'
import { generateAssertionsBlocks, SYSTEM_ASSERTIONS_BLOCK_PREFIX, SYSTEM_TASK_PREFIX, SYSTEM_LINK_PREFIX, updateAssertionsBlocks, isSystemAssertionsId, isSystemLink, CustomTypeInfo } from '../../utils/assertionsGenerator'
import { variableTypesService } from '../../services/variableTypesService'
import { playbookService, PlaybookContent } from '../../services/playbookService'
import { useAuth } from '../../contexts/AuthContext'
import { PlaybookUpdate } from '../../hooks/usePlaybookWebSocket'
import { useUserPreferences } from '../../contexts/UserPreferencesContext'

// Collaboration callback types for real-time sync
export interface CollaborationCallbacks {
  sendModuleAdd?: (data: { moduleId: string; module: ModuleBlock; position: { x: number; y: number } }) => void
  sendModuleMove?: (data: { moduleId: string; x: number; y: number; parentId?: string; parentSection?: string }) => void
  sendModuleDelete?: (data: { moduleId: string }) => void
  sendModuleConfig?: (data: { moduleId: string; field: string; value: unknown; element_id?: string }) => void
  sendModuleResize?: (data: { moduleId: string; width: number; height: number; x: number; y: number }) => void
  sendLinkAdd?: (data: { link: Link }) => void
  sendLinkDelete?: (data: { linkId: string }) => void
  sendPlayUpdate?: (data: { playId: string; field: string; value: unknown }) => void
  sendVariableUpdate?: (data: { variable: PlayVariable & { id: string; action: 'add' | 'update' | 'delete' } }) => void
  sendBlockCollapse?: (data: { blockId: string; collapsed: boolean }) => void
  sendSectionCollapse?: (data: { key: string; collapsed: boolean }) => void
}

// Selected role interface
interface SelectedRole {
  index: number
  role: string
  vars?: Record<string, any>
}

interface WorkZoneProps {
  onSelectModule: (module: { id: string; name: string; collection: string; taskName: string; when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string; delegateTo?: string; tags?: string[]; isBlock?: boolean; isPlay?: boolean; moduleParameters?: Record<string, any>; moduleSchema?: ModuleSchema; validationState?: { isValid: boolean; errors: string[]; warnings: string[]; lastValidated?: Date }; isSystem?: boolean; description?: string } | null) => void
  selectedModuleId: string | null
  onDeleteModule?: (deleteHandler: (id: string) => void) => void
  onUpdateModule?: (updateHandler: (id: string, updates: Partial<{ taskName?: string; when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string; delegateTo?: string; tags?: string[]; moduleParameters?: Record<string, any>; moduleSchema?: ModuleSchema; validationState?: { isValid: boolean; errors: string[]; warnings: string[]; lastValidated?: Date } }>) => void) => void
  onPlayAttributes?: (getHandler: () => PlayAttributes, updateHandler: (updates: Partial<PlayAttributes>) => void) => void
  // Role selection props
  onSelectRole?: (role: SelectedRole | null) => void
  selectedRoleIndex?: number | null
  onRoleCallbacks?: (
    getHandler: () => (string | { role: string; vars?: Record<string, any> })[],
    updateHandler: (index: number, updates: { role?: string; vars?: Record<string, any> }) => void
  ) => void
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error', playbookName: string) => void
  onSavePlaybook?: (saveHandler: () => Promise<void>) => void
  onLoadPlaybook?: (loadHandler: (playbookId: string) => Promise<void>) => void
  onGetPlaybookContent?: (getHandler: () => PlaybookContent) => void
  // Collaboration props for real-time sync
  collaborationCallbacks?: CollaborationCallbacks
  onApplyCollaborationUpdate?: (handler: (update: PlaybookUpdate) => void) => void
  // Active play ID for collaboration
  onActivePlayIdChange?: (playId: string) => void
  // Initial playbook ID from navigation (for quick restore)
  initialPlaybookId?: string | null
  // Callback when playbook ID changes
  onPlaybookIdChange?: (id: string | null) => void
}

// Helper to create START modules for a play
const createStartModulesForPlay = (playId: string): ModuleBlock[] => {
  const sections = ['pre_tasks', 'tasks', 'post_tasks', 'handlers'] as const
  return sections.map(section => ({
    id: `${playId}-start-${section.replace('_', '-')}`,
    collection: 'ansible.generic',
    name: 'start',
    description: `Start point for ${section.replace('_', ' ')}`,
    taskName: 'START',
    x: 50,
    y: 20,
    isPlay: true,
    parentSection: section,
  }))
}

// Helper to ensure START modules exist in a play's modules
const ensureStartModules = (playId: string, modules: ModuleBlock[]): ModuleBlock[] => {
  const requiredStartIds = [
    `${playId}-start-pre-tasks`,
    `${playId}-start-tasks`,
    `${playId}-start-post-tasks`,
    `${playId}-start-handlers`
  ]

  const existingStartIds = new Set(modules.filter(m => m.isPlay).map(m => m.id))
  const missingStartModules = createStartModulesForPlay(playId).filter(
    m => !existingStartIds.has(m.id)
  )

  return [...missingStartModules, ...modules]
}

// Session storage key for playbook cache
const PLAYBOOK_CACHE_KEY = 'ansible-builder-playbook-cache'

const WorkZone = ({ onSelectModule, selectedModuleId, onDeleteModule, onUpdateModule, onPlayAttributes, onSelectRole, selectedRoleIndex, onRoleCallbacks, onSaveStatusChange, onSavePlaybook, onLoadPlaybook, onGetPlaybookContent, collaborationCallbacks, onApplyCollaborationUpdate, onActivePlayIdChange, initialPlaybookId, onPlaybookIdChange }: WorkZoneProps) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const playSectionsContainerRef = useRef<HTMLDivElement>(null)
  const variablesSectionRef = useRef<HTMLDivElement>(null)
  const preTasksSectionRef = useRef<HTMLDivElement>(null)
  const tasksSectionRef = useRef<HTMLDivElement>(null)
  const postTasksSectionRef = useRef<HTMLDivElement>(null)
  const handlersSectionRef = useRef<HTMLDivElement>(null)

  // User preferences for highlight duration
  const { preferences } = useUserPreferences()

  // Gestion des PLAYs avec onglets
  const [plays, setPlays] = useState<Play[]>([
    {
      id: 'play-1',
      name: 'Play 1',
      modules: [
        // START task for pre_tasks section
        {
          id: 'play-1-start-pre-tasks',
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for pre-tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'pre_tasks',
        },
        // START task for tasks section
        {
          id: 'play-1-start-tasks',
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'tasks',
        },
        // START task for post_tasks section
        {
          id: 'play-1-start-post-tasks',
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for post-tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'post_tasks',
        },
        // START task for handlers section
        {
          id: 'play-1-start-handlers',
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for handlers',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'handlers',
        },
      ],
      links: [],
      variables: [
        { key: 'ansible_user', value: 'root', type: 'string', required: true },
        { key: 'ansible_port', value: '22', type: 'int', required: true },
      ],
      attributes: {
        hosts: 'all',
        remoteUser: undefined,
        gatherFacts: true,
        become: false,
        connection: 'ssh',
        roles: [],
      },
    },
  ])
  const [activePlayIndex, setActivePlayIndex] = useState(0)

  // Récupérer le PLAY actif
  const currentPlay = plays[activePlayIndex] || plays[0]
  const modules = currentPlay?.modules || []
  const links = currentPlay?.links || []

  // Fonctions pour mettre à jour le PLAY actif
  const setModules = (newModules: ModuleBlock[] | ((prev: ModuleBlock[]) => ModuleBlock[])) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        modules: typeof newModules === 'function' ? newModules(updatedPlays[activePlayIndex].modules) : newModules
      }
      return updatedPlays
    })
  }

  const setLinks = (newLinks: Link[] | ((prev: Link[]) => Link[])) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        links: typeof newLinks === 'function' ? newLinks(updatedPlays[activePlayIndex].links) : newLinks
      }
      return updatedPlays
    })
  }

  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null)
  const [gridEnabled, setGridEnabled] = useState(false)
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null)
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set())
  const [customTypes, setCustomTypes] = useState<CustomTypeInfo[]>([])
  const [editingTabIndex, setEditingTabIndex] = useState<number | null>(null)
  // Toutes les sections sont collapsed par défaut
  const [collapsedBlockSections, setCollapsedBlockSections] = useState<Set<string>>(new Set(['*:rescue', '*:always'])) // Format: "blockId:section" - Tasks ouverte par défaut
  // Sections du PLAY - Format: "playId:section" - Variables et Tasks ouvertes par défaut
  const [collapsedPlaySections, setCollapsedPlaySections] = useState<Set<string>>(new Set(['*:pre_tasks', '*:post_tasks', '*:handlers']))
  // Onglet actif pour les sections PLAY (présentation en tabs) - Variables reste en accordéon
  const [activeSectionTab, setActiveSectionTab] = useState<'roles' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'>('tasks')
  const [resizingBlock, setResizingBlock] = useState<{ id: string; startX: number; startY: number; startWidth: number; startHeight: number; startBlockX: number; startBlockY: number; direction: string } | null>(null)
  const [addVariableDialogOpen, setAddVariableDialogOpen] = useState(false)
  const [editingVariableIndex, setEditingVariableIndex] = useState<number | null>(null)

  // Ref to track last resized module for sync
  const lastResizedModuleRef = useRef<{ id: string; width: number; height: number; x: number; y: number } | null>(null)

  // State to track recently synced elements with their highlight color
  const [highlightedElements, setHighlightedElements] = useState<Map<string, string>>(new Map())

  // Get consistent color for a user based on their ID (same as PresenceIndicator)
  const getUserColor = useCallback((userId: string): string => {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7',
      '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
      '#009688', '#4caf50', '#8bc34a', '#cddc39',
      '#ffc107', '#ff9800', '#ff5722', '#795548'
    ]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }, [])

  // Function to highlight an element temporarily with user's color
  const highlightElement = useCallback((elementId: string, userId: string) => {
    const color = getUserColor(userId)
    console.log('[Highlight] Adding highlight to element:', elementId, 'with color:', color, 'from user:', userId)
    setHighlightedElements(prev => {
      const newMap = new Map(prev)
      newMap.set(elementId, color)
      return newMap
    })

    // Remove highlight after configured duration
    setTimeout(() => {
      console.log('[Highlight] Removing highlight from element:', elementId)
      setHighlightedElements(prev => {
        const newMap = new Map(prev)
        newMap.delete(elementId)
        return newMap
      })
    }, preferences.highlightDurationMs)
  }, [getUserColor, preferences.highlightDurationMs])

  // =====================================================
  // PLAYBOOK PERSISTENCE
  // =====================================================
  const { isAuthenticated } = useAuth()

  // Initialize from sessionStorage cache or initialPlaybookId prop
  const [currentPlaybookId, setCurrentPlaybookId] = useState<string | null>(() => {
    return initialPlaybookId || sessionStorage.getItem('currentPlaybookId')
  })
  const [playbookName, setPlaybookName] = useState<string>(() => {
    return sessionStorage.getItem('currentPlaybookName') || 'Untitled Playbook'
  })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // Track if we've already loaded from cache (to avoid redundant API calls)
  const hasRestoredFromCache = useRef(false)

  // Notify parent when playbook ID changes
  useEffect(() => {
    if (onPlaybookIdChange) {
      onPlaybookIdChange(currentPlaybookId)
    }
    // Also update sessionStorage
    if (currentPlaybookId) {
      sessionStorage.setItem('currentPlaybookId', currentPlaybookId)
    }
  }, [currentPlaybookId, onPlaybookIdChange])

  // Update sessionStorage when playbook name changes
  useEffect(() => {
    sessionStorage.setItem('currentPlaybookName', playbookName)
  }, [playbookName])

  // Cache playbook state to sessionStorage for quick restore on navigation
  const saveToCache = useCallback(() => {
    if (!currentPlaybookId) return
    try {
      const cacheData = {
        id: currentPlaybookId,
        name: playbookName,
        plays: plays,
        collapsedBlocks: Array.from(collapsedBlocks),
        collapsedBlockSections: Array.from(collapsedBlockSections),
        timestamp: Date.now()
      }
      sessionStorage.setItem(PLAYBOOK_CACHE_KEY, JSON.stringify(cacheData))
    } catch (e) {
      console.warn('Failed to cache playbook:', e)
    }
  }, [currentPlaybookId, playbookName, plays, collapsedBlocks, collapsedBlockSections])

  // Save to cache when state changes (debounced)
  useEffect(() => {
    if (!currentPlaybookId) return
    const timer = setTimeout(saveToCache, 500)
    return () => clearTimeout(timer)
  }, [currentPlaybookId, saveToCache])

  // Serialize current state to PlaybookContent
  const serializePlaybookContent = useCallback((): PlaybookContent => {
    // Flatten all modules from all plays, adding playId to each module
    const allModules: ModuleBlock[] = plays.flatMap(play =>
      play.modules.map(m => ({ ...m, playId: play.id }))
    )

    // Flatten all links from all plays
    const allLinks: Link[] = plays.flatMap(play => play.links)

    return {
      modules: allModules,
      links: allLinks,
      plays: plays.map(play => ({
        id: play.id,
        name: play.name,
        hosts: play.attributes?.hosts,
        gatherFacts: play.attributes?.gatherFacts,
        become: play.attributes?.become,
        remoteUser: play.attributes?.remoteUser,
        connection: play.attributes?.connection,
        // Include full attributes object for roles support
        attributes: play.attributes
      })),
      collapsedBlocks: Array.from(collapsedBlocks),
      collapsedBlockSections: Array.from(collapsedBlockSections),
      metadata: {
        playbookName: playbookName
      },
      variables: plays.flatMap(play =>
        play.variables.map(v => ({
          name: v.key,
          value: v.value,
          type: v.type,
          required: v.required,
          defaultValue: v.defaultValue,
          regexp: v.regexp
        }))
      )
    }
  }, [plays, collapsedBlocks, collapsedBlockSections, playbookName])

  // Save playbook to backend
  const savePlaybook = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping save')
      return
    }

    setSaveStatus('saving')

    try {
      const content = serializePlaybookContent()

      if (currentPlaybookId) {
        // Update existing playbook
        await playbookService.updatePlaybook(currentPlaybookId, {
          name: playbookName,
          content
        })
      } else {
        // Create new playbook
        const newPlaybook = await playbookService.createPlaybook({
          name: playbookName,
          content
        })
        setCurrentPlaybookId(newPlaybook.id)
      }

      setSaveStatus('saved')
      setLastSavedAt(new Date())

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save playbook:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [isAuthenticated, currentPlaybookId, playbookName, serializePlaybookContent])

  // Load a specific playbook by ID
  const loadPlaybook = useCallback(async (playbookId: string) => {
    try {
      const detailed = await playbookService.getPlaybook(playbookId)

      // Restore state from content
      setCurrentPlaybookId(detailed.id)
      setPlaybookName(detailed.name)

      // Restore plays (reconstruct from content)
      const content = detailed.content
      if (content.plays && content.plays.length > 0) {
        const restoredPlays = content.plays.map(play => {
          // Get all modules for this play (single play mode for now)
          const playModules = content.modules.filter(m => {
            // Include all modules for now (single play mode)
            // TODO: When multiple plays are supported, filter by play association
            return true
          })

          // Ensure START modules exist for each section
          const modulesWithStarts = ensureStartModules(play.id, playModules)

          return {
            id: play.id,
            name: play.name,
            modules: modulesWithStarts,
            links: content.links, // Simplified
            variables: content.variables.map(v => ({
              key: v.name,
              value: v.value,
              type: (v as any).type || 'string',
              required: (v as any).required !== undefined ? (v as any).required : true,
              ...(v as any).defaultValue && { defaultValue: (v as any).defaultValue },
              ...(v as any).regexp && { regexp: (v as any).regexp }
            })),
            attributes: {
              hosts: play.hosts || 'all',
              remoteUser: undefined,
              gatherFacts: play.gatherFacts !== undefined ? play.gatherFacts : true,
              become: play.become || false,
              connection: 'ssh',
              roles: []
            }
          }
        })
        setPlays(restoredPlays)
      }

      // Restore collapsed states
      if (content.collapsedBlocks) {
        setCollapsedBlocks(new Set(content.collapsedBlocks))
      }
      if (content.collapsedBlockSections) {
        setCollapsedBlockSections(new Set(content.collapsedBlockSections))
      }
    } catch (error) {
      console.error('Failed to load playbook:', error)
    }
  }, [])

  // Auto-save with debounce
  useEffect(() => {
    if (!isAuthenticated) return

    const timer = setTimeout(() => {
      savePlaybook()
    }, 3000) // 3 seconds debounce

    return () => clearTimeout(timer)
  }, [plays, collapsedBlocks, collapsedBlockSections, playbookName, savePlaybook, isAuthenticated])

  // Notify parent of save status changes
  useEffect(() => {
    if (onSaveStatusChange) {
      onSaveStatusChange(saveStatus, playbookName)
    }
  }, [saveStatus, playbookName, onSaveStatusChange])

  // Expose savePlaybook function to parent
  useEffect(() => {
    if (onSavePlaybook) {
      onSavePlaybook(savePlaybook)
    }
  }, [savePlaybook, onSavePlaybook])

  // Expose loadPlaybook function to parent
  useEffect(() => {
    if (onLoadPlaybook) {
      onLoadPlaybook(loadPlaybook)
    }
  }, [loadPlaybook, onLoadPlaybook])

  // Expose getPlaybookContent function to parent (for Preview/Validation)
  useEffect(() => {
    if (onGetPlaybookContent) {
      onGetPlaybookContent(serializePlaybookContent)
    }
  }, [serializePlaybookContent, onGetPlaybookContent])

  // Fetch custom variable types for assertions generation
  useEffect(() => {
    variableTypesService.getVariableTypesFlat()
      .then(types => {
        // Extract custom types with their patterns
        const custom = types
          .filter(t => !t.is_builtin)
          .map(t => ({
            name: t.name,
            label: t.label,
            pattern: (t as { pattern?: string }).pattern || '',
            is_filter: (t as { is_filter?: boolean }).is_filter || false,
          }))
        setCustomTypes(custom)
      })
      .catch(err => {
        console.error('Failed to load custom variable types:', err)
      })
  }, [])

  // Generate/update system assertions blocks when variables or custom types change
  // Creates ONE BLOCK PER VARIABLE for better visual organization
  useEffect(() => {
    // Get existing system blocks (to preserve positions)
    const existingSystemBlocks = modules.filter(m => m.id.startsWith(SYSTEM_ASSERTIONS_BLOCK_PREFIX))

    console.log('[SystemBlocks] Variables:', currentPlay.variables)
    console.log('[SystemBlocks] Existing system blocks:', existingSystemBlocks.length)

    const result = updateAssertionsBlocks(
      existingSystemBlocks,
      currentPlay.variables,
      currentPlay.id,
      customTypes
    )

    console.log('[SystemBlocks] Generation result:', result)

    if (result) {
      const { blocks, tasks, links: systemLinks } = result

      console.log('[SystemBlocks] Generated blocks:', blocks.map(b => ({ id: b.id, isSystem: b.isSystem, isBlock: b.isBlock, systemType: b.systemType })))
      console.log('[SystemBlocks] Generated tasks:', tasks.map(t => ({ id: t.id, isSystem: t.isSystem, parentId: t.parentId })))

      // Remove all existing system assertion blocks and tasks
      const cleanedModules = modules.filter(m => !isSystemAssertionsId(m.id))

      // Remove existing system links and add new ones
      const cleanedLinks = links.filter(l => !isSystemLink(l.id))

      // Add all blocks and their tasks
      const newModules = [...blocks, ...tasks, ...cleanedModules]
      console.log('[SystemBlocks] Total modules after merge:', newModules.length, 'System blocks:', newModules.filter(m => m.isSystem).length)

      setModules(newModules)
      setLinks([...systemLinks, ...cleanedLinks])

      // Ensure system blocks ARE collapsed by default
      setCollapsedBlocks(prev => {
        const newSet = new Set(prev)
        blocks.forEach(block => {
          newSet.add(block.id)
        })
        return newSet
      })
    } else if (existingSystemBlocks.length > 0) {
      // No variables, remove all assertions blocks, tasks, and system links
      setModules(prev => prev.filter(m => !isSystemAssertionsId(m.id)))
      setLinks(prev => prev.filter(l => !isSystemLink(l.id)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlay.variables, currentPlay.id, customTypes])

  // Apply collaboration updates from other users
  const applyCollaborationUpdate = useCallback((update: PlaybookUpdate) => {
    const { update_type, data, username, user_id } = update
    console.log(`[Collab] Applying ${update_type} from ${username} (${user_id}):`, data)

    switch (update_type) {
      case 'module_add': {
        const { module } = data as { module: ModuleBlock }

        // If it's a block, collapse rescue and always sections by default
        if (module.isBlock) {
          setCollapsedBlockSections(prev => {
            const newSet = new Set(prev)
            newSet.add(`${module.id}:rescue`)
            newSet.add(`${module.id}:always`)
            return newSet
          })
        }

        // If the module has a parentId (task in block), update the parent's blockSections
        const isBlockSection = (s?: string): s is 'normal' | 'rescue' | 'always' => {
          return s === 'normal' || s === 'rescue' || s === 'always'
        }

        if (module.parentId && module.parentSection && isBlockSection(module.parentSection)) {
          const section = module.parentSection
          setModules(prev => {
            // First add the module
            const withNewModule = [...prev, module]
            // Then update the parent block
            return withNewModule.map(m => {
              if (m.id === module.parentId && m.isBlock) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                if (!sections[section]?.includes(module.id)) {
                  return {
                    ...m,
                    blockSections: {
                      ...sections,
                      [section]: [...(sections[section] || []), module.id]
                    }
                  }
                }
              }
              return m
            })
          })
        } else {
          setModules(prev => [...prev, module])
        }
        // Highlight the added module with user's color
        highlightElement(module.id, user_id)
        break
      }
      case 'module_move': {
        type ParentSectionType = 'normal' | 'rescue' | 'always' | 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
        type BlockSectionType = 'normal' | 'rescue' | 'always'
        const { moduleId, x, y, parentId, parentSection } = data as {
          moduleId: string; x: number; y: number;
          parentId?: string; parentSection?: ParentSectionType
        }
        setModules(prev => {
          // Find the module being moved
          const movedModule = prev.find(m => m.id === moduleId)
          if (!movedModule) return prev

          const oldParentId = movedModule.parentId
          const oldSection = movedModule.parentSection as BlockSectionType | undefined

          // Check if parentSection is a block section (normal/rescue/always) or a play section
          const isBlockSection = (section?: string): section is BlockSectionType => {
            return section === 'normal' || section === 'rescue' || section === 'always'
          }

          return prev.map(m => {
            let updated = { ...m }
            let hasChanges = false

            // Remove from old parent's blockSections if it had one (only for block sections)
            if (oldParentId && m.id === oldParentId && oldSection && isBlockSection(oldSection)) {
              const sections = m.blockSections || { normal: [], rescue: [], always: [] }
              if (sections[oldSection]?.includes(moduleId)) {
                updated = {
                  ...updated,
                  blockSections: {
                    ...sections,
                    [oldSection]: sections[oldSection].filter(id => id !== moduleId)
                  }
                }
                hasChanges = true
              }
            }

            // Add to new parent's blockSections if moving into a block (only for block sections)
            if (parentId && m.id === parentId && m.isBlock && parentSection && isBlockSection(parentSection)) {
              const sections = updated.blockSections || { normal: [], rescue: [], always: [] }
              if (!sections[parentSection]?.includes(moduleId)) {
                updated = {
                  ...updated,
                  blockSections: {
                    ...sections,
                    [parentSection]: [...(sections[parentSection] || []), moduleId]
                  }
                }
                hasChanges = true
              }
            }

            // Update the moved module itself
            if (m.id === moduleId) {
              updated = {
                ...updated,
                x,
                y,
                ...(parentId !== undefined && { parentId }),
                ...(parentSection !== undefined && { parentSection })
              }
              hasChanges = true
            }

            return hasChanges ? updated : m
          })
        })
        // Highlight the moved module with user's color
        highlightElement(moduleId, user_id)
        break
      }
      case 'module_delete': {
        const { moduleId } = data as { moduleId: string }
        setModules(prev => prev.filter(m => m.id !== moduleId))
        setLinks(prev => prev.filter(l => l.from !== moduleId && l.to !== moduleId))
        break
      }
      case 'module_config': {
        const { moduleId, field, value } = data as { moduleId: string; field: string; value: unknown }
        // Direct module properties (not in moduleParameters)
        const directFields = ['taskName', 'when', 'loop', 'tags', 'delegateTo', 'ignoreErrors', 'become']
        setModules(prev => {
          const newModules = prev.map(m => {
            if (m.id === moduleId) {
              if (directFields.includes(field)) {
                // Update direct module property
                return { ...m, [field]: value }
              } else {
                // Update moduleParameters
                const updatedParams = { ...(m.moduleParameters || {}), [field]: value }
                return { ...m, moduleParameters: updatedParams }
              }
            }
            return m
          })

          // If this is the selected module, update selectedModule in MainLayout
          // Use setTimeout to avoid setState during render
          if (selectedModuleId === moduleId) {
            const updatedModule = newModules.find(m => m.id === moduleId)
            if (updatedModule) {
              setTimeout(() => {
                onSelectModule({
                  id: updatedModule.id,
                  name: updatedModule.name,
                  collection: updatedModule.collection,
                  taskName: updatedModule.taskName || '',
                  when: updatedModule.when,
                  ignoreErrors: updatedModule.ignoreErrors,
                  become: updatedModule.become,
                  loop: updatedModule.loop,
                  delegateTo: updatedModule.delegateTo,
                  tags: updatedModule.tags,
                  isBlock: updatedModule.isBlock,
                  isPlay: updatedModule.isPlay,
                  moduleParameters: updatedModule.moduleParameters,
                  moduleSchema: updatedModule.moduleSchema,
                  validationState: updatedModule.validationState,
                })
              }, 0)
            }
          }

          return newModules
        })
        // Highlight the configured module with user's color
        highlightElement(moduleId, user_id)
        break
      }
      case 'link_add': {
        const { link } = data as { link: Link }
        setLinks(prev => [...prev, link])
        // Highlight both connected modules with user's color
        highlightElement(link.from, user_id)
        highlightElement(link.to, user_id)
        break
      }
      case 'link_delete': {
        const { linkId } = data as { linkId: string }
        setLinks(prev => prev.filter(l => l.id !== linkId))
        break
      }
      case 'play_update': {
        const { playId, field, value } = data as { playId: string; field: string; value: unknown }
        // Play attributes are stored in play.attributes
        const attributeFields = ['hosts', 'remoteUser', 'connection', 'gatherFacts', 'become', 'roles']
        setPlays(prev => prev.map(p => {
          if (p.id === playId) {
            if (attributeFields.includes(field)) {
              // Update play.attributes
              return { ...p, attributes: { ...(p.attributes || {}), [field]: value } }
            } else {
              // Update direct play property (like 'name')
              return { ...p, [field]: value }
            }
          }
          return p
        }))
        break
      }
      case 'variable_update': {
        const { variable } = data as { variable: { id: string; name: string; value: unknown } }
        setPlays(prev => prev.map(p => {
          const idx = p.variables.findIndex(v => v.key === variable.name)
          if (idx >= 0) {
            const newVars = [...p.variables]
            newVars[idx] = {
              ...newVars[idx],
              key: variable.name,
              value: String(variable.value)
            }
            return { ...p, variables: newVars }
          }
          return p
        }))
        break
      }
      case 'block_collapse': {
        const { blockId, collapsed } = data as { blockId: string; collapsed: boolean }
        setCollapsedBlocks(prev => {
          const newSet = new Set(prev)
          if (collapsed) {
            newSet.add(blockId)
          } else {
            newSet.delete(blockId)
          }
          return newSet
        })
        // Highlight the collapsed/expanded block with user's color
        highlightElement(blockId, user_id)
        break
      }
      case 'module_resize': {
        const { moduleId, width, height, x, y } = data as { moduleId: string; width: number; height: number; x: number; y: number }
        setModules(prev => prev.map(m =>
          m.id === moduleId
            ? { ...m, width, height, x, y }
            : m
        ))
        // Highlight the resized module with user's color
        highlightElement(moduleId, user_id)
        break
      }
      // Note: section_collapse is NOT synced - each user can work on different sections independently
      default:
        console.warn(`[Collab] Unknown update type: ${update_type}`)
    }
  }, [selectedModuleId, onSelectModule, highlightElement])

  // Expose collaboration update handler to parent
  useEffect(() => {
    if (onApplyCollaborationUpdate) {
      onApplyCollaborationUpdate(applyCollaborationUpdate)
    }
  }, [applyCollaborationUpdate, onApplyCollaborationUpdate])

  // Load playbook on mount - try cache first for instant restore
  useEffect(() => {
    if (!isAuthenticated) return
    if (hasRestoredFromCache.current) return // Skip if already restored

    // Try to restore from cache first (for navigation back scenarios)
    const tryRestoreFromCache = (): boolean => {
      try {
        const cached = sessionStorage.getItem(PLAYBOOK_CACHE_KEY)
        if (!cached) return false

        const cacheData = JSON.parse(cached)
        // Cache is valid for 5 minutes (navigation scenarios)
        const cacheAge = Date.now() - cacheData.timestamp
        if (cacheAge > 5 * 60 * 1000) {
          console.log('[WorkZone] Cache expired, will reload from API')
          return false
        }

        // Restore from cache
        console.log('[WorkZone] Restoring playbook from cache:', cacheData.name)
        setCurrentPlaybookId(cacheData.id)
        setPlaybookName(cacheData.name)
        setPlays(cacheData.plays)
        setCollapsedBlocks(new Set(cacheData.collapsedBlocks || []))
        setCollapsedBlockSections(new Set(cacheData.collapsedBlockSections || []))
        hasRestoredFromCache.current = true
        return true
      } catch (e) {
        console.warn('[WorkZone] Failed to restore from cache:', e)
        return false
      }
    }

    // If cache restoration succeeded, skip API call
    if (tryRestoreFromCache()) {
      return
    }

    const loadLastPlaybook = async () => {
      try {
        // Get user's playbooks
        const playbooks = await playbookService.listPlaybooks()

        if (playbooks.length > 0) {
          // Load the most recent playbook
          const lastPlaybook = playbooks[0]
          const detailed = await playbookService.getPlaybook(lastPlaybook.id)

          // Restore state from content
          setCurrentPlaybookId(detailed.id)
          setPlaybookName(detailed.name)

          // Restore plays (reconstruct from content)
          const content = detailed.content
          if (content.plays && content.plays.length > 0) {
            const restoredPlays = content.plays.map(play => {
              // Get all modules for this play (single play mode for now)
              const playModules = content.modules.filter(m => {
                // Include all modules for now (single play mode)
                return true
              })

              // Ensure START modules exist for each section
              const modulesWithStarts = ensureStartModules(play.id, playModules)

              return {
                id: play.id,
                name: play.name,
                modules: modulesWithStarts,
                links: content.links, // Simplified
                variables: content.variables.map(v => ({
              key: v.name,
              value: v.value,
              type: (v as any).type || 'string',
              required: (v as any).required !== undefined ? (v as any).required : true,
              ...(v as any).defaultValue && { defaultValue: (v as any).defaultValue },
              ...(v as any).regexp && { regexp: (v as any).regexp }
            })),
                attributes: {
                  hosts: play.hosts || 'all',
                  remoteUser: undefined,
                  gatherFacts: play.gatherFacts !== undefined ? play.gatherFacts : true,
                  become: play.become || false,
                  connection: 'ssh',
                  roles: []
                }
              }
            })
            setPlays(restoredPlays)
          }

          // Restore collapsed states
          if (content.collapsedBlocks) {
            setCollapsedBlocks(new Set(content.collapsedBlocks))
          }
          if (content.collapsedBlockSections) {
            setCollapsedBlockSections(new Set(content.collapsedBlockSections))
          }

          hasRestoredFromCache.current = true
        }
      } catch (error) {
        console.error('Failed to load playbook:', error)
      }
    }

    loadLastPlaybook()
  }, [isAuthenticated]) // Only run on mount and auth change

  const GRID_SIZE = 50

  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }

  // Calculer les dimensions d'un block basé sur ses enfants
  const getBlockDimensions = (block: ModuleBlock) => {
    // Les PLAY ont la taille d'une tâche normale (150px x 50px)
    if (block.isPlay) {
      return { width: 150, height: 50 }
    }

    // Si le block est collapsed, retourner la taille d'une tâche normale
    if (collapsedBlocks.has(block.id)) {
      return { width: 140, height: 60 }
    }

    // Les blocks normaux - calculer automatiquement selon le contenu des sections
    const baseWidth = 250
    const headerHeight = 50
    const sectionHeaderHeight = 25
    const minSectionContentHeight = 200 // Hauteur minimum de chaque section
    const sectionPadding = 4 // Padding de la section Box (p: 0.5 en MUI = 4px)
    const bottomPadding = 20 // Padding en bas pour l'espace

    // Dimensions manuelles (définies par redimensionnement manuel)
    // Utilisées comme minimum - le block ne peut pas être plus petit que ça
    const manualWidth = block.width || baseWidth
    const manualHeight = block.height || 0

    let totalHeight = headerHeight

    // Avec le comportement accordion, compter seulement les headers de toutes les sections
    // et le contenu de la section ouverte
    const sections: Array<'normal' | 'rescue' | 'always'> = ['normal', 'rescue', 'always']

    // Ajouter les headers de toutes les sections
    totalHeight += sections.length * sectionHeaderHeight

    // Calculer le contenu de la section ouverte basé sur les tâches réelles
    const openSection = sections.find(section => !isSectionCollapsed(block.id, section))
    if (openSection && block.blockSections) {
      const taskIds = block.blockSections[openSection] || []

      if (taskIds.length === 0) {
        // Section vide - utiliser la hauteur minimum
        totalHeight += minSectionContentHeight
      } else {
        // Calculer la hauteur nécessaire pour contenir toutes les tâches
        let maxBottomY = 0
        let maxRightX = 0

        taskIds.forEach(taskId => {
          const task = modules.find(m => m.id === taskId)
          if (task) {
            const taskY = task.y || 10
            let taskHeight = 60 // Hauteur par défaut d'une tâche

            // Si c'est un block imbriqué, obtenir sa hauteur calculée
            if (task.isBlock) {
              const nestedBlockDims = getBlockDimensions(task)
              taskHeight = nestedBlockDims.height
              maxRightX = Math.max(maxRightX, (task.x || 10) + nestedBlockDims.width)
            } else {
              maxRightX = Math.max(maxRightX, (task.x || 10) + 140)
            }

            maxBottomY = Math.max(maxBottomY, taskY + taskHeight)
          }
        })

        // Ajouter le padding de la section et un espace en bas
        const sectionContentHeight = Math.max(
          maxBottomY + bottomPadding,
          minSectionContentHeight
        )

        totalHeight += sectionContentHeight

        // Ajuster la largeur si nécessaire pour contenir les tâches
        const calculatedWidth = Math.max(
          baseWidth,
          maxRightX + sectionPadding * 2 + 20 // padding des deux côtés + marge
        )

        // Utiliser le maximum entre dimensions manuelles et calculées
        // Permet de garder le redimensionnement manuel ET de s'agrandir si nécessaire
        return {
          width: Math.max(manualWidth, calculatedWidth),
          height: Math.max(manualHeight, totalHeight)
        }
      }
    }

    // Section vide ou pas de blockSections - utiliser hauteur par défaut
    const defaultHeight = totalHeight + minSectionContentHeight

    return {
      width: Math.max(manualWidth, baseWidth),
      height: Math.max(manualHeight, defaultHeight)
    }
  }

  /**
   * Obtenir les dimensions d'un module (block ou tâche)
   * Pour usage dans SectionLinks
   */
  const getModuleDimensions = (module: ModuleBlock): { width: number; height: number } => {
    if (module.isBlock) {
      return getBlockDimensions(module)
    }
    // Module virtuel (mini START task) - 60x40px
    if (module.collection === 'virtual') {
      return { width: 60, height: 40 }
    }
    // Tâche START (PLAY START - isPlay=true) - 60x40px
    if (module.isPlay) {
      return { width: 60, height: 40 }
    }
    // Tâche normale - 140x60px
    return { width: 140, height: 60 }
  }

  // Obtenir le thème de couleur d'un PLAY (toujours vert)
  const getPlayTheme = () => {
    return {
      borderColor: '#2e7d32',
      bgColor: 'rgba(46, 125, 50, 0.08)',
      iconColor: '#2e7d32'
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    const target = e.target as HTMLElement
    const blockContainerElem = target.closest('.block-container')

    // Toujours utiliser le canvas principal pour le calcul de position
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()

    const moduleData = e.dataTransfer.getData('module')
    const existingModuleId = e.dataTransfer.getData('existingModule')

    // Déterminer si c'est un block/PLAY qui est déplacé
    const movedModule = existingModuleId ? modules.find(m => m.id === existingModuleId) : null
    const isMovingBlockOrPlay = movedModule && (movedModule.isBlock || movedModule.isPlay)

    // Récupérer l'offset du drag (où l'utilisateur a cliqué sur le module)
    const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
    const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')

    // Calculer l'offset en fonction du type de module déplacé
    let offsetX = 75 // Par défaut pour une tâche normale (150 / 2)
    let offsetY = 60 // Par défaut pour une tâche normale (120 / 2)

    // Si on a un offset de drag stocké (module déplacé), l'utiliser
    if (dragOffsetXStr && dragOffsetYStr) {
      offsetX = parseFloat(dragOffsetXStr)
      offsetY = parseFloat(dragOffsetYStr)
    } else if (movedModule) {
      // Module existant déplacé
      if (movedModule.isBlock || movedModule.isPlay) {
        const dims = getBlockDimensions(movedModule)
        offsetX = dims.width / 2
        offsetY = dims.height / 2
      }
    } else if (moduleData) {
      // Nouveau module depuis la palette - vérifier si c'est un block/play
      const parsedData = JSON.parse(moduleData)
      if (parsedData.name === 'block' || parsedData.name === 'play') {
        // Pour un nouveau block/play, utiliser un offset par défaut raisonnable
        // Un block fait environ 400x300, donc offset au centre
        offsetX = 200
        offsetY = 150
      }
    }

    // Calculer la position du drop avec l'offset approprié
    console.log('Drop Debug:', {
      clientX: e.clientX,
      clientY: e.clientY,
      rectLeft: rect.left,
      rectTop: rect.top,
      offsetX,
      offsetY,
      movedModule: movedModule?.name,
      isMovingBlockOrPlay
    })

    let x = e.clientX - rect.left - offsetX
    let y = e.clientY - rect.top - offsetY

    console.log('Calculated position:', { x, y })

    if (gridEnabled) {
      x = snapToGrid(x)
      y = snapToGrid(y)
    }

    // Cas 1: Drop dans un block container (zone vide du block)
    // Seulement pour les tâches normales, pas pour les blocks/PLAY
    if (blockContainerElem && !isMovingBlockOrPlay) {
      const blockId = blockContainerElem.getAttribute('data-block-id')
      const block = modules.find(m => m.id === blockId)

      if (block && block.isBlock) {
        // Calculer la position relative au block parent
        const blockContainerRect = blockContainerElem.getBoundingClientRect()
        let relativeX = e.clientX - blockContainerRect.left - offsetX
        let relativeY = e.clientY - blockContainerRect.top - offsetY

        // Contraintes pour garder la tâche dans le block
        const taskWidth = 140
        const taskHeight = 60
        const blockDims = getBlockDimensions(block)
        const containerPadding = 8 // padding du block-container
        const maxX = blockDims.width - taskWidth - containerPadding * 2
        const maxY = blockDims.height - taskHeight - 50 - containerPadding * 2 // 50 = hauteur du header

        // Limiter les positions
        relativeX = Math.max(0, Math.min(relativeX, maxX))
        relativeY = Math.max(0, Math.min(relativeY, maxY))

        // Cas 1a: Déplacement d'un module existant dans le block
        if (existingModuleId) {
          // Tâche normale - on peut la mettre dans le block
          setModules(prev => prev.map(m => {
            // Retirer du parent précédent si différent
            if (m.id === movedModule?.parentId && movedModule.parentId !== blockId && m.children) {
              return { ...m, children: m.children.filter(id => id !== existingModuleId) }
            }
            // Ajouter au nouveau parent si pas déjà dedans
            if (m.id === blockId && !m.children?.includes(existingModuleId)) {
              return { ...m, children: [...(m.children || []), existingModuleId] }
            }
            // Mettre à jour la position du module déplacé
            if (m.id === existingModuleId) {
              return { ...m, x: relativeX, y: relativeY, parentId: blockId }
            }
            return m
          }))
          // Send collaboration update for module move into block
          collaborationCallbacks?.sendModuleMove?.({ moduleId: existingModuleId, x: relativeX, y: relativeY, parentId: blockId })
          setDraggedModuleId(null)
          return
        }

        // Cas 1b: Nouveau module depuis la palette
        if (moduleData && !existingModuleId) {
          const parsedData = JSON.parse(moduleData)
          // Ne pas créer de block dans un block via drop dans la zone
          if (parsedData.name !== 'block') {
            const newModule: ModuleBlock = {
              id: Date.now().toString(),
              collection: parsedData.collection,
              name: parsedData.name,
              description: parsedData.description,
              taskName: `Task with ${parsedData.name}`,
              x: relativeX,
              y: relativeY,
              parentId: blockId,
            }
            setModules(prev => [...prev, newModule])
            setModules(prev => prev.map(m =>
              m.id === blockId ? { ...m, children: [...(m.children || []), newModule.id] } : m
            ))
            // Send collaboration update for new module
            collaborationCallbacks?.sendModuleAdd?.({
              moduleId: newModule.id,
              module: newModule,
              position: { x: relativeX, y: relativeY }
            })
          }
        }
        return
      }
    }

    // Cas 2: Drop sur la zone de travail (canvas)
    // S'exécute si: pas dans un block-container OU si on déplace un block/PLAY
    if (!blockContainerElem || isMovingBlockOrPlay) {
      if (existingModuleId) {
        // Repositionnement d'un module existant
        // Vérifier les liens AVANT de faire toute modification
        const hasLinks = links.some(l => l.from === existingModuleId || l.to === existingModuleId)

        // Utiliser setModules avec forme fonctionnelle pour accéder au nouvel état
        setModules(prev => {
          const movedModule = prev.find(m => m.id === existingModuleId)
          if (!movedModule) return prev

          // Si c'est une tâche ou un block dans une section de block
          if (movedModule.parentId && movedModule.parentSection && !movedModule.isPlay) {
            // Vérifier si le parent est un bloc système
            const parentBlock = prev.find(m => m.id === movedModule.parentId)
            if (parentBlock?.isSystem) {
              // Bloquer le drop-out depuis un bloc système
              return prev
            }

            if (hasLinks) {
              // A des liens: ne pas permettre le déplacement
              return prev
            }

            // Pas de liens: permettre le déplacement hors du block
            // Retirer de l'ancienne section ET déplacer le module en un seul appel
            return prev.map(m => {
              if (m.id === movedModule.parentId) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                const oldSection = movedModule.parentSection!
                return {
                  ...m,
                  blockSections: {
                    ...sections,
                    [oldSection]: sections[oldSection].filter(id => id !== existingModuleId)
                  }
                }
              }
              // Déplacer le module dans la zone de travail
              if (m.id === existingModuleId) {
                return { ...m, x, y, parentId: undefined, parentSection: undefined }
              }
              return m
            })
          }

          // Si ce n'est pas une tâche dans une section, retourner l'état inchangé
          return prev
        })

        if (hasLinks) {
          setDraggedModuleId(null)
          return
        }

        const movedModule = modules.find(m => m.id === existingModuleId)
        // Si le module a été déplacé hors d'une section, on a déjà tout fait ci-dessus
        if (movedModule?.parentId && movedModule?.parentSection && !movedModule.isPlay) {
          setDraggedModuleId(null)
          return
        }

        setModules(prev => prev.map(m => {
          // Retirer du parent si dans un block (ancienne logique pour les blocks sans sections)
          if (m.id === movedModule?.parentId && m.children) {
            return { ...m, children: m.children.filter(id => id !== existingModuleId) }
          }
          // Déplacer le module
          if (m.id === existingModuleId) {
            return { ...m, x, y, parentId: undefined, parentSection: undefined }
          }
          // Les enfants du block ne doivent PAS être déplacés car leurs positions sont relatives au parent
          // Seul le block parent bouge
          return m
        }))

        // Send collaboration update for module move
        console.log('[WorkZone] Module moved, calling sendModuleMove. collaborationCallbacks:', collaborationCallbacks ? 'exists' : 'undefined', 'sendModuleMove:', collaborationCallbacks?.sendModuleMove ? 'exists' : 'undefined')
        collaborationCallbacks?.sendModuleMove?.({ moduleId: existingModuleId, x, y })

        setDraggedModuleId(null)
      } else if (moduleData) {
        // Nouveau module depuis la palette
        const parsedData = JSON.parse(moduleData)
        const isBlock = parsedData.name === 'block'
        const isPlay = parsedData.name === 'play'

        const newModuleId = `module-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const newModule: ModuleBlock = {
          id: newModuleId,
          collection: parsedData.collection,
          name: parsedData.name,
          description: parsedData.description,
          taskName: isPlay ? 'New Play' : isBlock ? 'Error Handling Block' : `Task with ${parsedData.name}`,
          x,
          y,
          isBlock,
          isPlay,
          children: isBlock ? [] : undefined, // Deprecated - use blockSections
          blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined,
        }
        setModules([...modules, newModule])

        // If it's a block, collapse rescue and always sections by default (local only - not synced)
        if (isBlock) {
          setCollapsedBlockSections(prev => {
            const newSet = new Set(prev)
            newSet.add(`${newModuleId}:rescue`)
            newSet.add(`${newModuleId}:always`)
            return newSet
          })
        }

        // Send collaboration update for new module
        console.log('[WorkZone] New module added, calling sendModuleAdd. collaborationCallbacks:', collaborationCallbacks ? 'exists' : 'undefined', 'sendModuleAdd:', collaborationCallbacks?.sendModuleAdd ? 'exists' : 'undefined')
        collaborationCallbacks?.sendModuleAdd?.({
          moduleId: newModule.id,
          module: newModule,
          position: { x, y }
        })
      }
    }
  }

  const handleModuleDragStart = (id: string, e: React.DragEvent) => {
    // Les tâches système sont repositionnables mais pas modifiables
    // On permet le drag même pour les tâches dans les blocs système

    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('existingModule', id)

    // Calculer l'offset du clic par rapport au coin supérieur gauche du module
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const offsetX = e.clientX - rect.left
    const offsetY = e.clientY - rect.top

    // Stocker l'offset pour l'utiliser lors du drop
    e.dataTransfer.setData('dragOffsetX', offsetX.toString())
    e.dataTransfer.setData('dragOffsetY', offsetY.toString())

    // Ajouter l'info du parent système pour valider les drops
    const sourceModule = modules.find(m => m.id === id)
    if (sourceModule?.parentId) {
      const parentBlock = modules.find(m => m.id === sourceModule.parentId)
      if (parentBlock?.isSystem) {
        e.dataTransfer.setData('systemParentId', sourceModule.parentId)
      }
    }

    setDraggedModuleId(id)

    // Empêcher la propagation pour éviter que le block parent ne capture le drag
    e.stopPropagation()
  }

  const handleModuleDragOver = (targetId: string, e: React.DragEvent) => {
    e.preventDefault()
    // Ne pas bloquer la propagation pour permettre au canvas de recevoir l'événement
  }

  const handleModuleDropOnModule = (targetId: string, e: React.DragEvent) => {
    const sourceId = e.dataTransfer.getData('existingModule')

    // Si on drop un module sur lui-même, laisser l'événement remonter pour le déplacement
    if (sourceId === targetId) {
      // Ne pas appeler preventDefault ni stopPropagation pour permettre le déplacement
      return
    }

    // Bloquer la propagation seulement si on crée un lien
    e.preventDefault()
    e.stopPropagation()

    // Si on drop un module existant sur un autre
    if (sourceId && sourceId !== targetId) {
      // CAS SPÉCIAL: Si la source est un mini START task (pattern: blockId-section-start)
      if (sourceId.endsWith('-start')) {
        const targetModule = modules.find(m => m.id === targetId)

        // Vérifier que la cible existe (pas un header d'accordéon)
        if (!targetModule) {
          setDraggedModuleId(null)
          return
        }

        // Parser le mini START ID pour extraire blockId et section
        const startIdParts = sourceId.split('-')
        const section = startIdParts[startIdParts.length - 2]
        const blockId = startIdParts.slice(0, -2).join('-')

        // Empêcher les liens circulaires (mini START vers son propre block parent)
        if (targetId === blockId || targetModule.parentId === sourceId) {
          setDraggedModuleId(null)
          return
        }

        // VALIDATION: Le mini START ne peut créer de lien qu'avec une tâche de la même section
        if (targetModule.parentId !== blockId || targetModule.parentSection !== section) {
          console.log('Mini START can only create links with tasks in the same section')
          setDraggedModuleId(null)
          return
        }

        // Créer le lien
        createLink(getLinkTypeFromSource(sourceId), sourceId, targetId)
        setDraggedModuleId(null)
        return
      }

      const sourceModule = modules.find(m => m.id === sourceId)
      const targetModule = modules.find(m => m.id === targetId)

      if (!sourceModule || !targetModule) return

      // Empêcher les liens circulaires (source vers son parent ou vice versa)
      if (sourceModule.parentId === targetId || targetModule.parentId === sourceId) {
        return
      }

      // CAS SPÉCIAL: START task de section PLAY (isPlay = true)
      if (sourceModule.isPlay) {
        // Un START task de PLAY ne peut créer de lien qu'avec une tâche de la même section PLAY
        // (ou un block entier, mais ce cas est géré dans handleBlockSectionDrop)
        if (!targetModule.parentId && targetModule.parentSection) {
          // Vérifier que c'est la même section PLAY
          if (sourceModule.parentSection !== targetModule.parentSection) {
            console.log('PLAY START can only create links with tasks in the same PLAY section')
            return
          }
        } else {
          // La cible n'est pas dans une section PLAY
          console.log('PLAY START can only create links with tasks in the same PLAY section')
          return
        }
      }

      // VALIDATION: Les deux tâches doivent être dans la même section
      // Cas 1: Deux tâches dans des sections de blocks
      if (sourceModule.parentId && sourceModule.parentSection && targetModule.parentId && targetModule.parentSection) {
        // Doivent être dans le même block ET la même section
        if (sourceModule.parentId !== targetModule.parentId || sourceModule.parentSection !== targetModule.parentSection) {
          console.log('Tasks must be in the same block section to create a link')
          return
        }
      }
      // Cas 2: Deux tâches dans des sections PLAY (hors START tasks déjà gérés)
      else if (!sourceModule.parentId && sourceModule.parentSection && !targetModule.parentId && targetModule.parentSection) {
        // Doivent être dans la même section PLAY
        if (sourceModule.parentSection !== targetModule.parentSection) {
          console.log('Tasks must be in the same PLAY section to create a link')
          return
        }
      }
      // Cas 3: Une tâche dans une section, l'autre pas (ou sections différentes)
      else {
        console.log('Tasks must be in the same type of section to create a link')
        return
      }

      // Créer le lien
      createLink(getLinkTypeFromSource(sourceId), sourceId, targetId)
    }
    setDraggedModuleId(null)
  }

  // Déterminer le type de lien basé sur la section parente de la tâche source
  const getLinkTypeFromSource = (sourceId: string): 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers' => {
    // Gérer les mini START tasks des sections de blocks (pattern: blockId-section-start)
    if (sourceId.endsWith('-start')) {
      if (sourceId.includes('-normal-start')) return 'normal'
      if (sourceId.includes('-rescue-start')) return 'rescue'
      if (sourceId.includes('-always-start')) return 'always'
    }

    const sourceModule = modules.find(m => m.id === sourceId)

    // Si la tâche est dans une section PLAY, utiliser le type de la section
    if (sourceModule?.parentSection && !sourceModule.parentId) {
      // Tâche dans une section PLAY
      if (sourceModule.parentSection === 'pre_tasks') return 'pre_tasks'
      if (sourceModule.parentSection === 'tasks') return 'tasks'
      if (sourceModule.parentSection === 'post_tasks') return 'post_tasks'
      if (sourceModule.parentSection === 'handlers') return 'handlers'
    }

    // Si la tâche est dans une section de block
    if (sourceModule?.parentSection && sourceModule.parentId) {
      if (sourceModule.parentSection === 'rescue') return 'rescue'
      if (sourceModule.parentSection === 'always') return 'always'
    }

    // Par défaut, lien normal
    return 'normal'
  }

  // Handlers de redimensionnement
  const handleResizeStart = (blockId: string, direction: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const block = modules.find(m => m.id === blockId)
    if (!block || !block.isBlock) return

    const blockDims = getBlockDimensions(block)

    setResizingBlock({
      id: blockId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: block.width || blockDims.width,
      startHeight: block.height || blockDims.height,
      startBlockX: block.x,
      startBlockY: block.y,
      direction
    })
  }

  useEffect(() => {
    if (!resizingBlock) return

    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizingBlock.startX
      const deltaY = e.clientY - resizingBlock.startY

      let newWidth = resizingBlock.startWidth
      let newHeight = resizingBlock.startHeight
      let newX = resizingBlock.startBlockX
      let newY = resizingBlock.startBlockY

      const minWidth = 300
      const minHeight = 250

      // Calculer les nouvelles dimensions selon la direction
      if (resizingBlock.direction.includes('e')) {
        newWidth = Math.max(minWidth, resizingBlock.startWidth + deltaX)
      }
      if (resizingBlock.direction.includes('w')) {
        const potentialWidth = Math.max(minWidth, resizingBlock.startWidth - deltaX)
        if (potentialWidth >= minWidth) {
          newWidth = potentialWidth
          newX = resizingBlock.startBlockX + (resizingBlock.startWidth - newWidth)
        }
      }
      if (resizingBlock.direction.includes('s')) {
        newHeight = Math.max(minHeight, resizingBlock.startHeight + deltaY)
      }
      if (resizingBlock.direction.includes('n')) {
        const potentialHeight = Math.max(minHeight, resizingBlock.startHeight - deltaY)
        if (potentialHeight >= minHeight) {
          newHeight = potentialHeight
          newY = resizingBlock.startBlockY + (resizingBlock.startHeight - newHeight)
        }
      }

      // Mettre à jour le block
      setModules(prev => prev.map(m =>
        m.id === resizingBlock.id
          ? { ...m, width: newWidth, height: newHeight, x: newX, y: newY }
          : m
      ))

      // Store dimensions for sync when resize ends
      lastResizedModuleRef.current = {
        id: resizingBlock.id,
        width: newWidth,
        height: newHeight,
        x: newX,
        y: newY
      }
    }

    const handleResizeEnd = () => {
      setResizingBlock(null)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [resizingBlock, modules])

  // Send resize sync when resizing ends
  useEffect(() => {
    if (resizingBlock === null && lastResizedModuleRef.current) {
      const { id, width, height, x, y } = lastResizedModuleRef.current
      collaborationCallbacks?.sendModuleResize?.({ moduleId: id, width, height, x, y })
      lastResizedModuleRef.current = null
    }
  }, [resizingBlock, collaborationCallbacks])

  // Handler pour le drop dans une section de block
  const handleBlockSectionDrop = (blockId: string, section: 'normal' | 'rescue' | 'always', e: React.DragEvent) => {
    const sourceId = e.dataTransfer.getData('existingModule')
    const moduleData = e.dataTransfer.getData('module')

    // Si on drop le block parent sur sa propre section, laisser l'événement remonter pour le déplacement
    if (sourceId === blockId) {
      return
    }

    // Vérifier si le block cible ou source est un bloc système
    const targetBlock = modules.find(m => m.id === blockId)
    const sourceModule = sourceId ? modules.find(m => m.id === sourceId) : null
    const isTargetSystemBlock = targetBlock?.isSystem === true
    const isSourceFromSystemBlock = sourceModule?.parentId ? modules.find(m => m.id === sourceModule.parentId)?.isSystem === true : false

    // Bloquer les drops vers les blocs système (sauf repositionnement interne)
    const isInternalReposition = sourceModule?.parentId === blockId && sourceModule?.parentSection === section
    if (isTargetSystemBlock && !isInternalReposition) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    // Bloquer les drops DEPUIS les blocs système (pas de sortie des tâches)
    if (isSourceFromSystemBlock && sourceModule?.parentId !== blockId) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    // Cas spécial: START de section PLAY droppé dans une section de block
    if (sourceId) {
      // Si c'est un START de section PLAY (isPlay = true), créer un lien avec le block
      if (sourceModule && sourceModule.isPlay) {
        e.preventDefault()
        e.stopPropagation()
        createLink(getLinkTypeFromSource(sourceId), sourceId, blockId)
        return
      }
    }

    // Ignorer les mini START tasks des blocks - ils ne doivent pas être déplacés
    if (sourceId && sourceId.endsWith('-start')) {
      return
    }

    // Calculer la position relative à la section
    const sectionElem = e.currentTarget as HTMLElement
    const sectionRect = sectionElem.getBoundingClientRect()
    const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
    const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')
    const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : 75
    const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : 60

    let relativeX = e.clientX - sectionRect.left - offsetX
    let relativeY = e.clientY - sectionRect.top - offsetY

    // Contraindre dans les limites de la section
    const taskWidth = 140
    const taskHeight = 60
    relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - taskWidth))
    relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - taskHeight))

    // Cas 1: Module existant déplacé
    if (sourceId) {
      const sourceModule = modules.find(m => m.id === sourceId)
      if (!sourceModule) return

      // Sous-cas 1.1: Même section - repositionnement
      if (sourceModule.parentId === blockId && sourceModule.parentSection === section) {
        e.preventDefault()
        e.stopPropagation()
        setModules(prev => prev.map(m =>
          m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
        ))
        // Send collaboration update for module move (include parentId/parentSection to prevent removal)
        collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: blockId, parentSection: section })
        return
      }
      // Sous-cas 1.2: Tâche externe (zone de travail ou autre section)
      else {
        // Vérifier si la tâche a des liens
        const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

        if (!hasLinks) {
          // Pas de liens: déplacer la tâche dans cette section
          e.preventDefault()
          e.stopPropagation()

          // Un seul appel à setModules pour: retirer de l'ancien parent + ajouter au nouveau parent + update la tâche
          setModules(prev => {
            const oldParentId = sourceModule.parentId
            const oldSection = sourceModule.parentSection

            return prev.map(m => {
              // 1. Retirer de l'ancien parent (si existe)
              if (oldParentId && m.id === oldParentId) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                return {
                  ...m,
                  blockSections: {
                    ...sections,
                    [oldSection!]: sections[oldSection!].filter(id => id !== sourceId)
                  }
                }
              }

              // 2. Ajouter au nouveau parent
              if (m.id === blockId) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                return {
                  ...m,
                  blockSections: {
                    ...sections,
                    [section]: sections[section].includes(sourceId) ? sections[section] : [...sections[section], sourceId]
                  }
                }
              }

              // 3. Mettre à jour la tâche elle-même
              if (m.id === sourceId) {
                return {
                  ...m,
                  parentId: blockId,
                  parentSection: section,
                  x: relativeX,
                  y: relativeY
                }
              }

              return m
            })
          })
          // Send collaboration update for module move into block section
          collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: blockId, parentSection: section })
          return
        } else {
          // A des liens: créer un lien avec le block
          e.preventDefault()
          e.stopPropagation()
          createLink(getLinkTypeFromSource(sourceId), sourceId, blockId)
          return
        }
      }
    }
    // Cas 2: Nouveau module depuis la palette
    else if (moduleData) {
      const parsedData = JSON.parse(moduleData)
      // Ne pas permettre de déposer un PLAY dans une section (les blocks sont autorisés)
      if (parsedData.name !== 'play') {
        e.preventDefault()
        e.stopPropagation()

        const newModuleId = `module-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const isBlock = parsedData.name === 'block'
        const newModule: ModuleBlock = {
          id: newModuleId,
          collection: parsedData.collection,
          name: parsedData.name,
          description: parsedData.description || '',
          taskName: `${parsedData.name} ${isBlock ? 'block' : 'task'}`,
          x: relativeX,
          y: relativeY,
          parentId: blockId,
          parentSection: section,
          isBlock: isBlock,
          ...(isBlock && { blockSections: { normal: [], rescue: [], always: [] } }),
        }

        // Un seul appel à setModules pour ajouter le module ET mettre à jour blockSections
        setModules(prev => {
          // Ajouter le nouveau module
          const updatedModules = [...prev, newModule]

          // Mettre à jour le block parent pour ajouter l'ID à la section
          return updatedModules.map(m => {
            if (m.id === blockId) {
              const sections = m.blockSections || { normal: [], rescue: [], always: [] }
              return {
                ...m,
                blockSections: {
                  ...sections,
                  [section]: [...sections[section], newModuleId]
                }
              }
            }
            return m
          })
        })

        // Send collaboration update for new module in block section
        collaborationCallbacks?.sendModuleAdd?.({
          moduleId: newModuleId,
          module: newModule,
          position: { x: relativeX, y: relativeY }
        })
      }
    }
  }

  const createLink = (type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers', fromId: string, toId: string) => {
    const sourceId = fromId
    const targetId = toId

    if (!sourceId || !targetId) return

    // Règle universelle pour tous les types de liens:
    // 1. Une source ne peut avoir qu'un seul lien sortant de ce type
    // 2. Une cible ne peut avoir qu'un seul lien entrant de ce type
    // Cela garantit une chaîne linéaire: A -> B -> C (pas de branches multiples)

    setLinks(prevLinks => {
      // Supprimer les liens existants qui violent les règles
      let updatedLinks = prevLinks.filter(l => {
        // Supprimer tout lien sortant de la source pour ce type
        if (l.from === sourceId && l.type === type) return false
        // Supprimer tout lien entrant vers la cible pour ce type
        if (l.to === targetId && l.type === type) return false
        return true
      })

      // Ajouter le nouveau lien
      const newLink: Link = {
        id: `link-${Date.now()}`,
        from: sourceId,
        to: targetId,
        type
      }
      updatedLinks.push(newLink)

      // Send collaboration update for the new link
      collaborationCallbacks?.sendLinkAdd?.({ link: newLink })

      return updatedLinks
    })
  }

  const updateTaskName = (id: string, newName: string) => {
    // Trouver le module à mettre à jour
    const module = modules.find(m => m.id === id)

    // Si c'est un PLAY, synchroniser avec le nom de l'onglet
    if (module?.isPlay) {
      setPlays(prevPlays => {
        const updatedPlays = [...prevPlays]
        updatedPlays[activePlayIndex] = {
          ...updatedPlays[activePlayIndex],
          name: newName,
          modules: updatedPlays[activePlayIndex].modules.map(m =>
            m.id === id ? { ...m, taskName: newName } : m
          )
        }
        return updatedPlays
      })
    } else {
      // Pour les autres tâches, mise à jour normale
      setModules(modules.map(m => m.id === id ? { ...m, taskName: newName } : m))
    }
  }

  const updateInventory = (id: string, newInventory: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, inventory: newInventory } : m))
  }

  const deleteLink = (linkId: string) => {
    setLinks(links.filter(l => l.id !== linkId))
    // Send collaboration update
    collaborationCallbacks?.sendLinkDelete?.({ linkId })
  }

  const toggleBlockCollapse = (blockId: string) => {
    setCollapsedBlocks(prev => {
      const newSet = new Set(prev)
      const wasCollapsed = newSet.has(blockId)
      if (wasCollapsed) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      // Send collaboration update
      collaborationCallbacks?.sendBlockCollapse?.({ blockId, collapsed: !wasCollapsed })
      return newSet
    })
  }

  const addTaskToBlockSection = (taskId: string, blockId: string, section: 'normal' | 'rescue' | 'always', x?: number, y?: number) => {
    // Utiliser la forme fonctionnelle pour garantir l'accès à l'état le plus récent
    setModules(prev => {
      const task = prev.find(m => m.id === taskId)
      const block = prev.find(m => m.id === blockId)

      if (!task || !block || !block.isBlock) return prev

      // Si la tâche vient d'une autre section du même block, la retirer de l'ancienne section
      const oldSection = task.parentSection

      // Mettre à jour le block pour ajouter la tâche à la section appropriée
      return prev.map(m => {
        if (m.id === blockId) {
          const sections = m.blockSections || { normal: [], rescue: [], always: [] }

          // Retirer de l'ancienne section si elle change
          const updatedSections = { ...sections }
          if (oldSection && oldSection !== section && updatedSections[oldSection]) {
            updatedSections[oldSection] = updatedSections[oldSection].filter(id => id !== taskId)
          }

          // Ajouter à la nouvelle section si pas déjà présente
          if (!updatedSections[section].includes(taskId)) {
            updatedSections[section] = [...updatedSections[section], taskId]
          }

          return {
            ...m,
            blockSections: updatedSections
          }
        }
        // Mettre à jour la tâche avec le parent, la section et la position
        if (m.id === taskId) {
          return {
            ...m,
            parentId: blockId,
            parentSection: section,
            x: x !== undefined ? x : (m.x || 10),
            y: y !== undefined ? y : (m.y || 10)
          }
        }
        return m
      })
    })
  }

  const toggleBlockSection = (blockId: string, section: 'normal' | 'rescue' | 'always') => {
    const key = `${blockId}:${section}`
    const wildcardKey = `*:${section}`
    setCollapsedBlockSections(prev => {
      const newSet = new Set(prev)

      // Si la section est actuellement collapsed (va être ouverte)
      const isCurrentlyCollapsed = newSet.has(key) || newSet.has(wildcardKey)

      if (isCurrentlyCollapsed) {
        // Fermer toutes les sections de ce block
        const otherSections: Array<'normal' | 'rescue' | 'always'> = ['normal', 'rescue', 'always']
        otherSections.forEach(s => {
          newSet.delete(`*:${s}`)
          newSet.add(`${blockId}:${s}`)
          // Note: section_collapse is NOT synced - each user can work on different sections independently
        })

        // Ouvrir uniquement la section cliquée
        newSet.delete(wildcardKey)
        newSet.delete(key)
        // Note: section_collapse is NOT synced - each user can work on different sections independently
      } else {
        // Si déjà ouverte, la fermer
        newSet.add(key)
        // Note: section_collapse is NOT synced - each user can work on different sections independently
      }

      return newSet
    })
  }

  const isSectionCollapsed = (blockId: string, section: 'normal' | 'rescue' | 'always') => {
    const key = `${blockId}:${section}`
    const wildcardKey = `*:${section}`
    return collapsedBlockSections.has(key) || collapsedBlockSections.has(wildcardKey)
  }

  const isPlaySectionCollapsed = (playId: string, section: PlaySectionName) => {
    const key = `${playId}:${section}`
    const wildcardKey = `*:${section}`
    return collapsedPlaySections.has(key) || collapsedPlaySections.has(wildcardKey)
  }

  // Helper pour récupérer la section PLAY dans laquelle se trouve un module (en remontant la hiérarchie)
  const getModulePlaySection = (module: ModuleBlock): 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers' | null => {
    // Si le module a directement une parentSection mais pas de parentId, c'est qu'il est directement dans une section PLAY
    if (module.parentSection && !module.parentId) {
      return module.parentSection as any
    }

    // Si le module a un parentId, remonter au parent
    if (module.parentId) {
      const parent = modules.find(m => m.id === module.parentId)
      if (parent) {
        return getModulePlaySection(parent) // Récursion pour remonter la hiérarchie
      }
    }

    return null // Pas dans une section PLAY
  }

  // Fonction générale pour compter les tâches dans la chaîne partant d'un START (PLAY ou block)
  const getStartChainCount = (startId: string): number => {
    // Parcourir récursivement tous les liens depuis START (BFS)
    const visited = new Set<string>()
    const queue = [startId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      // Trouver tous les liens sortants depuis cette tâche
      const outgoingLinks = links.filter(link => link.from === currentId)
      for (const link of outgoingLinks) {
        if (!visited.has(link.to)) {
          queue.push(link.to)
        }
      }
    }

    // Retourner le nombre de tâches (moins START elle-même)
    return Math.max(0, visited.size - 1)
  }

  // Fonction wrapper pour compter les tâches dans la chaîne partant de START d'une section PLAY
  const getTaskChainCount = (sectionName: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'): number => {
    // Trouver la tâche START de la section
    const startTask = modules.find(m => m.isPlay && !m.parentId && m.parentSection === sectionName)
    if (!startTask) return 0
    return getStartChainCount(startTask.id)
  }

  const togglePlaySection = (playId: string, section: PlaySectionName) => {
    setCollapsedPlaySections(prev => {
      const newSet = new Set(prev)
      const key = `${playId}:${section}`
      const wildcardKey = `*:${section}`

      // Variables et Roles fonctionnent indépendamment (pas d'accordion)
      if (section === 'variables' || section === 'roles') {
        newSet.delete(wildcardKey)
        if (newSet.has(key)) {
          newSet.delete(key)
        } else {
          newSet.add(key)
        }
        return newSet
      }

      // Comportement accordion pour les sections de tâches uniquement
      const isCurrentlyCollapsed = newSet.has(key) || newSet.has(wildcardKey)

      if (isCurrentlyCollapsed) {
        // Fermer toutes les sections de tâches de ce PLAY (pas Variables ni Roles)
        const taskSections: Array<'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'> = ['pre_tasks', 'tasks', 'post_tasks', 'handlers']
        taskSections.forEach(s => {
          newSet.delete(`*:${s}`)
          newSet.add(`${playId}:${s}`)
        })

        // Ouvrir uniquement la section cliquée
        newSet.delete(wildcardKey)
        newSet.delete(key)
      }
      // Si déjà ouverte, ne rien faire (garder au moins une section de tâches ouverte)

      return newSet
    })
  }

  const handlePlaySectionDrop = (section: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers', e: React.DragEvent) => {
    const sourceId = e.dataTransfer.getData('existingModule')
    const moduleData = e.dataTransfer.getData('module')
    const systemParentId = e.dataTransfer.getData('systemParentId')

    // Bloquer les drops de tâches provenant d'un bloc système
    if (systemParentId) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    // Calculer la position relative à la section
    const sectionElem = e.currentTarget as HTMLElement
    const sectionRect = sectionElem.getBoundingClientRect()
    const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
    const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')

    // Cas 1: Module existant déplacé
    if (sourceId) {
      const sourceModule = modules.find(m => m.id === sourceId)
      if (!sourceModule) return

      // Ne pas autoriser le déplacement des tâches START
      if (sourceModule.isPlay) return

      // Déterminer l'offset selon le type de module
      const isBlock = sourceModule.isBlock
      const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : (isBlock ? 200 : 75)
      const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : (isBlock ? 150 : 60)

      let relativeX = e.clientX - sectionRect.left - offsetX
      let relativeY = e.clientY - sectionRect.top - offsetY

      // Contraindre dans les limites de la section
      const itemWidth = isBlock ? 400 : 140
      const itemHeight = isBlock ? 300 : 60
      relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - itemWidth))
      relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - itemHeight))

      // Sous-cas 1.1: Même section - repositionnement
      if (sourceModule.parentSection === section) {
        e.preventDefault()
        e.stopPropagation()
        setModules(prev => prev.map(m =>
          m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
        ))
        // Send collaboration update for module move (include parentSection for play sections)
        collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentSection: section })
        return
      }
      // Sous-cas 1.2: Tâche/Block externe (autre section ou zone de travail)
      else {
        // Vérifier si la tâche a des liens
        const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

        if (!hasLinks) {
          // Pas de liens: déplacer la tâche/block dans cette section
          e.preventDefault()
          e.stopPropagation()

          // Retirer de l'ancienne section de block si elle était dans une
          const oldParentId = sourceModule.parentId
          const oldSection = sourceModule.parentSection

          setModules(prev => prev.map(m => {
            // 1. Retirer de l'ancien parent block si existe
            if (oldParentId && m.id === oldParentId && oldSection) {
              const sections = m.blockSections || { normal: [], rescue: [], always: [] }
              return {
                ...m,
                blockSections: {
                  ...sections,
                  [oldSection]: sections[oldSection].filter(id => id !== sourceId)
                }
              }
            }

            // 2. Mettre à jour la tâche/block avec la nouvelle section PLAY et position
            if (m.id === sourceId) {
              return { ...m, parentSection: section, x: relativeX, y: relativeY, parentId: undefined }
            }

            return m
          }))
          // Send collaboration update for module move to play section (out of block)
          collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: undefined, parentSection: section })
          return
        } else {
          // A des liens: on ne peut pas déplacer une tâche/block avec des liens entre sections
          e.preventDefault()
          e.stopPropagation()
          return
        }
      }
    }
    // Cas 2: Nouveau module depuis la palette
    else if (moduleData) {
      const parsedData = JSON.parse(moduleData)
      // Ne pas permettre de déposer un PLAY dans une section
      if (parsedData.name !== 'play') {
        e.preventDefault()
        e.stopPropagation()

        const isBlock = parsedData.name === 'block'

        // Ajuster l'offset selon le type (block ou tâche)
        const dropOffsetX = isBlock ? 200 : 75
        const dropOffsetY = isBlock ? 150 : 60
        const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : dropOffsetX
        const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : dropOffsetY

        let relativeX = e.clientX - sectionRect.left - offsetX
        let relativeY = e.clientY - sectionRect.top - offsetY

        // Contraindre dans les limites de la section
        const itemWidth = isBlock ? 400 : 140
        const itemHeight = isBlock ? 300 : 60
        relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - itemWidth))
        relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - itemHeight))

        const newModuleId = `module-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const newModule: ModuleBlock = {
          id: newModuleId,
          collection: parsedData.collection,
          name: parsedData.name,
          description: parsedData.description || '',
          taskName: isBlock ? 'Error Handling Block' : `${parsedData.name} task`,
          x: relativeX,
          y: relativeY,
          isBlock: isBlock,
          blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined,
          parentSection: section, // Assigner à la section du PLAY
        }

        setModules([...modules, newModule])

        // Send collaboration update for new module in play section
        collaborationCallbacks?.sendModuleAdd?.({
          moduleId: newModuleId,
          module: newModule,
          position: { x: relativeX, y: relativeY }
        })
      }
    }
  }

  const getPlaySectionColor = (section: PlaySectionName) => {
    switch (section) {
      case 'variables':
        return '#673ab7' // Violet profond
      case 'roles':
        return '#4caf50' // Vert
      case 'pre_tasks':
        return '#9c27b0' // Violet
      case 'tasks':
        return '#1976d2' // Bleu
      case 'post_tasks':
        return '#00796b' // Vert foncé
      case 'handlers':
        return '#ff9800' // Orange
      default:
        return '#757575' // Gris
    }
  }

  const getSectionColor = (section: 'normal' | 'rescue' | 'always') => {
    switch (section) {
      case 'normal':
        return '#1976d2' // Bleu
      case 'rescue':
        return '#ff9800' // Orange
      case 'always':
        return '#4caf50' // Vert
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDelete = useCallback((id: string) => {
    const module = modules.find(m => m.id === id)

    // Ne pas supprimer la tâche PLAY obligatoire
    if (module?.isPlay) {
      return
    }

    // Ne pas supprimer les blocs système (assertions)
    if (module && isSystemBlock(module)) {
      return
    }

    // Désélectionner si c'est le module sélectionné
    if (selectedModuleId === id) {
      onSelectModule(null)
    }

    // Supprimer les liens associés
    setLinks(links.filter(l => l.from !== id && l.to !== id))

    // Si c'est un block, supprimer aussi ses enfants
    if (module?.isBlock && module.children) {
      setModules(modules.filter(m => m.id !== id && !module.children?.includes(m.id)))
    } else {
      // Retirer du parent si dans un block
      setModules(modules.map(m => {
        if (m.children?.includes(id)) {
          return { ...m, children: m.children.filter(childId => childId !== id) }
        }
        return m
      }).filter(m => m.id !== id))
    }

    // Send collaboration update
    collaborationCallbacks?.sendModuleDelete?.({ moduleId: id })
  }, [modules, links, selectedModuleId, onSelectModule, setModules, setLinks, collaborationCallbacks])

  // Exposer handleDelete au parent via callback
  useEffect(() => {
    if (onDeleteModule) {
      onDeleteModule(handleDelete)
    }
  }, [handleDelete, onDeleteModule])

  // Fonction pour mettre à jour un module
  const handleUpdateModuleAttributes = useCallback((id: string, updates: Partial<{ taskName?: string; when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string; delegateTo?: string; tags?: string[]; moduleParameters?: Record<string, any>; moduleSchema?: ModuleSchema; validationState?: { isValid: boolean; errors: string[]; warnings: string[]; lastValidated?: Date } }>) => {
    // Gérer les modules normaux
    // Trouver le module avant la mise à jour
    const module = modules.find(m => m.id === id)
    if (!module) return

    // Mettre à jour le module dans l'état
    setModules(modules.map(m => {
      if (m.id === id) {
        return { ...m, ...updates }
      }
      return m
    }))

    // Mettre à jour aussi le module sélectionné si c'est celui-ci
    if (selectedModuleId === id) {
      onSelectModule({
        id: module.id,
        name: module.name,
        collection: module.collection,
        taskName: updates.taskName !== undefined ? updates.taskName : module.taskName,
        when: updates.when !== undefined ? updates.when : module.when,
        ignoreErrors: updates.ignoreErrors !== undefined ? updates.ignoreErrors : module.ignoreErrors,
        become: updates.become !== undefined ? updates.become : module.become,
        loop: updates.loop !== undefined ? updates.loop : module.loop,
        delegateTo: updates.delegateTo !== undefined ? updates.delegateTo : module.delegateTo,
        tags: updates.tags !== undefined ? updates.tags : module.tags,
        isBlock: module.isBlock,
        isPlay: module.isPlay,
        moduleParameters: updates.moduleParameters !== undefined ? updates.moduleParameters : module.moduleParameters,
        moduleSchema: updates.moduleSchema !== undefined ? updates.moduleSchema : module.moduleSchema,
        validationState: updates.validationState !== undefined ? updates.validationState : module.validationState,
      })
    }
  }, [modules, selectedModuleId, onSelectModule, setModules, setPlays, activePlayIndex, currentPlay])

  // Exposer handleUpdateModuleAttributes au parent via callback
  useEffect(() => {
    if (onUpdateModule) {
      onUpdateModule(handleUpdateModuleAttributes)
    }
  }, [handleUpdateModuleAttributes, onUpdateModule])

  // Fonction pour obtenir les attributs du PLAY courant
  const getPlayAttributes = useCallback((): PlayAttributes => {
    return currentPlay.attributes || {}
  }, [currentPlay])

  // Fonction pour mettre à jour les attributs du PLAY courant
  const updatePlayAttributes = useCallback((updates: Partial<PlayAttributes>) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        attributes: {
          ...updatedPlays[activePlayIndex].attributes,
          ...updates
        }
      }
      return updatedPlays
    })
  }, [activePlayIndex, setPlays])

  // Exposer les fonctions PLAY attributes au parent via callback
  useEffect(() => {
    if (onPlayAttributes) {
      onPlayAttributes(getPlayAttributes, updatePlayAttributes)
    }
  }, [getPlayAttributes, updatePlayAttributes, onPlayAttributes])

  // Get current roles
  const getRoles = useCallback(() => {
    return plays[activePlayIndex]?.attributes?.roles || []
  }, [plays, activePlayIndex])

  // Update a role at a specific index
  const updateRole = useCallback((index: number, updates: { role?: string; vars?: Record<string, any> }) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const currentRoles = [...(updatedPlays[activePlayIndex].attributes?.roles || [])]

      if (index >= 0 && index < currentRoles.length) {
        const currentRole = currentRoles[index]
        const currentRoleName = typeof currentRole === 'string' ? currentRole : currentRole.role
        const currentVars = typeof currentRole === 'string' ? {} : (currentRole.vars || {})

        // Build the new role object
        const newVars = updates.vars !== undefined ? updates.vars : currentVars
        const newRoleName = updates.role !== undefined ? updates.role : currentRoleName

        // If no vars, store as string; otherwise as object
        if (Object.keys(newVars).length === 0) {
          currentRoles[index] = newRoleName
        } else {
          currentRoles[index] = { role: newRoleName, vars: newVars }
        }

        updatedPlays[activePlayIndex] = {
          ...updatedPlays[activePlayIndex],
          attributes: {
            ...updatedPlays[activePlayIndex].attributes,
            roles: currentRoles
          }
        }
      }
      return updatedPlays
    })
  }, [activePlayIndex])

  // Expose role callbacks to parent
  useEffect(() => {
    if (onRoleCallbacks) {
      onRoleCallbacks(getRoles, updateRole)
    }
  }, [getRoles, updateRole, onRoleCallbacks])

  // Notify parent of active play ID changes (for collaboration)
  useEffect(() => {
    if (onActivePlayIdChange && currentPlay?.id) {
      onActivePlayIdChange(currentPlay.id)
    }
  }, [currentPlay?.id, onActivePlayIdChange])

  // Obtenir le style du lien selon son type
  const getLinkStyle = (type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers') => {
    switch (type) {
      case 'rescue':
        return { stroke: '#ff9800', strokeDasharray: '5,5', label: 'rescue' }
      case 'always':
        return { stroke: '#4caf50', strokeDasharray: '0', strokeWidth: '3', label: 'always' }
      case 'pre_tasks':
        return { stroke: '#9c27b0', strokeDasharray: '0', label: '' }
      case 'tasks':
        return { stroke: '#1976d2', strokeDasharray: '0', label: '' }
      case 'post_tasks':
        return { stroke: '#00796b', strokeDasharray: '0', label: '' }
      case 'handlers':
        return { stroke: '#f57c00', strokeDasharray: '8,4', label: '' }
      default:
        return { stroke: '#1976d2', strokeDasharray: '0', label: '' }
    }
  }

  // Vérifier si un module est orphelin (récursivement)
  const isOrphan = (moduleId: string, visited = new Set<string>()): boolean => {
    const module = modules.find(m => m.id === moduleId)

    // Un PLAY n'est jamais orphelin (c'est la racine de la généalogie)
    if (module?.isPlay) return false

    // Éviter les boucles infinies
    if (visited.has(moduleId)) return true
    visited.add(moduleId)

    const incomingLink = links.find(l => l.to === moduleId)

    // Pas de lien entrant = orphelin
    if (!incomingLink) return true

    // A un lien entrant, vérifier si la source est orpheline
    return isOrphan(incomingLink.from, visited)
  }

  // Obtenir le thème de couleur d'un block selon le type de lien entrant
  const getBlockTheme = (blockId: string) => {
    const incomingLink = links.find(l => l.to === blockId)

    // Vérifier si le block est orphelin
    if (isOrphan(blockId)) {
      // Thème gris pour les orphelins
      return {
        borderColor: '#757575',
        bgColor: 'rgba(117, 117, 117, 0.05)',
        iconColor: '#757575'
      }
    }

    if (!incomingLink) {
      // Pas de lien entrant mais pas orphelin (ne devrait pas arriver avec la logique actuelle)
      return {
        borderColor: '#9c27b0',
        bgColor: 'rgba(156, 39, 176, 0.05)',
        iconColor: '#9c27b0'
      }
    }

    switch (incomingLink.type) {
      case 'rescue':
        return {
          borderColor: '#ff9800',
          bgColor: 'rgba(255, 152, 0, 0.05)',
          iconColor: '#ff9800'
        }
      case 'always':
        return {
          borderColor: '#4caf50',
          bgColor: 'rgba(76, 175, 80, 0.05)',
          iconColor: '#4caf50'
        }
      default: // 'normal'
        return {
          borderColor: '#1976d2',
          bgColor: 'rgba(25, 118, 210, 0.05)',
          iconColor: '#1976d2'
        }
    }
  }

  // Obtenir le thème de couleur d'une tâche normale selon son statut orphelin
  const getTaskTheme = (taskId: string) => {
    // Vérifier si la tâche est orpheline
    if (isOrphan(taskId)) {
      // Thème gris pour les orphelins
      return {
        numberBgColor: '#757575',
        moduleNameColor: '#757575',
        borderColor: '#757575'
      }
    }

    // Tâche connectée - couleurs normales
    return {
      numberBgColor: '#1976d2',
      moduleNameColor: '#1976d2',
      borderColor: '#1976d2'
    }
  }


  // Obtenir un module ou créer un objet virtuel pour un mini START task
  const getModuleOrVirtual = (moduleId: string): ModuleBlock | undefined => {
    // Essayer de trouver dans modules
    const module = modules.find(m => m.id === moduleId)
    if (module) return module

    // Si c'est un mini START task (pattern: blockId-section-start)
    if (moduleId.endsWith('-start')) {
      // Parser le blockId et la section depuis moduleId
      const parts = moduleId.split('-')
      if (parts.length >= 3 && parts[parts.length - 1] === 'start') {
        const section = parts[parts.length - 2] as 'normal' | 'rescue' | 'always'
        const blockId = parts.slice(0, -2).join('-')

        // Vérifier que le block parent existe
        const parentBlock = modules.find(m => m.id === blockId)

        if (parentBlock) {
          // Créer un module virtuel avec coordonnées RELATIVES à la section
          // SectionLinks utilisera ces coordonnées directement
          return {
            id: moduleId,
            collection: 'virtual',
            name: 'mini-start',
            description: 'Mini START task',
            taskName: 'START',
            x: 20, // Position relative dans la section
            y: 10, // Position relative dans la section
            isBlock: false,
            isPlay: false,
            parentId: blockId, // Important: lier au parent block
            parentSection: section, // Important: lier à la section
          }
        }
      }
    }

    return undefined
  }


  // Gestion des PLAYs (onglets)
  const addPlay = () => {
    const newPlayId = `play-${Date.now()}`
    const newPlay: Play = {
      id: newPlayId,
      name: `Play ${plays.length + 1}`,
      modules: [
        // START task for pre_tasks section
        {
          id: `${newPlayId}-start-pre-tasks`,
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for pre-tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'pre_tasks',
        },
        // START task for tasks section
        {
          id: `${newPlayId}-start-tasks`,
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'tasks',
        },
        // START task for post_tasks section
        {
          id: `${newPlayId}-start-post-tasks`,
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for post-tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'post_tasks',
        },
        // START task for handlers section
        {
          id: `${newPlayId}-start-handlers`,
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for handlers',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'handlers',
        },
      ],
      links: [],
      variables: [],
      attributes: {
        hosts: 'all',
        remoteUser: undefined,
        gatherFacts: true,
        become: false,
        connection: 'ssh',
        roles: [],
      },
    }
    setPlays([...plays, newPlay])
    setActivePlayIndex(plays.length)
  }

  const deletePlay = (index: number) => {
    if (plays.length === 1) return // Ne pas supprimer le dernier PLAY
    const newPlays = plays.filter((_, i) => i !== index)
    setPlays(newPlays)
    if (activePlayIndex >= newPlays.length) {
      setActivePlayIndex(newPlays.length - 1)
    }
  }

  // Gestion des variables
  const addVariable = () => {
    setEditingVariableIndex(null)
    setAddVariableDialogOpen(true)
  }

  const editVariable = (index: number) => {
    setEditingVariableIndex(index)
    setAddVariableDialogOpen(true)
  }

  const handleAddVariableFromDialog = (variable: Omit<PlayVariable, 'value'> & { value?: string }) => {
    const newVariable: PlayVariable = {
      key: variable.key,
      value: variable.value || variable.defaultValue || '',
      type: variable.type,
      required: variable.required,
      ...(variable.defaultValue && { defaultValue: variable.defaultValue }),
      ...(variable.regexp && { regexp: variable.regexp })
    }

    if (editingVariableIndex !== null) {
      // Update existing variable
      updateVariable(editingVariableIndex, newVariable)
    } else {
      // Add new variable
      setPlays(prevPlays => {
        const updatedPlays = [...prevPlays]
        updatedPlays[activePlayIndex] = {
          ...updatedPlays[activePlayIndex],
          variables: [...updatedPlays[activePlayIndex].variables, newVariable]
        }
        return updatedPlays
      })
    }
    setEditingVariableIndex(null)
  }

  const deleteVariable = (index: number) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        variables: updatedPlays[activePlayIndex].variables.filter((_, i) => i !== index)
      }
      return updatedPlays
    })
  }

  // Update an existing variable
  const updateVariable = useCallback((index: number, variable: PlayVariable) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const newVariables = [...updatedPlays[activePlayIndex].variables]
      newVariables[index] = variable
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        variables: newVariables
      }
      return updatedPlays
    })

    // Send collaboration update
    if (collaborationCallbacks?.sendVariableUpdate) {
      collaborationCallbacks.sendVariableUpdate({
        variable: {
          ...variable,
          id: `var-${index}`,
          action: 'update'
        }
      })
    }
  }, [activePlayIndex, collaborationCallbacks])

  // Gestion des roles
  const [draggedRoleIndex, setDraggedRoleIndex] = useState<number | null>(null)

  const deleteRole = (index: number) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const currentRoles = updatedPlays[activePlayIndex].attributes?.roles || []
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        attributes: {
          ...updatedPlays[activePlayIndex].attributes,
          roles: currentRoles.filter((_, i) => i !== index)
        }
      }
      return updatedPlays
    })
  }

  const toggleRoleEnabled = (index: number) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const currentRoles = [...(updatedPlays[activePlayIndex].attributes?.roles || [])]

      if (index >= 0 && index < currentRoles.length) {
        const currentRole = currentRoles[index]
        const roleName = typeof currentRole === 'string' ? currentRole : currentRole.role
        const roleVars = typeof currentRole === 'string' ? undefined : currentRole.vars
        const currentEnabled = typeof currentRole === 'string' ? true : ((currentRole as { enabled?: boolean }).enabled !== false)

        // Toggle enabled state - always use object format when toggling
        currentRoles[index] = {
          role: roleName,
          ...(roleVars && Object.keys(roleVars).length > 0 && { vars: roleVars }),
          enabled: !currentEnabled
        } as { role: string; vars?: Record<string, any>; enabled?: boolean }

        updatedPlays[activePlayIndex] = {
          ...updatedPlays[activePlayIndex],
          attributes: {
            ...updatedPlays[activePlayIndex].attributes,
            roles: currentRoles
          }
        }
      }
      return updatedPlays
    })
  }

  const handleRoleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedRoleIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleRoleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleRoleDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault()

    if (draggedRoleIndex === null || draggedRoleIndex === targetIndex) {
      setDraggedRoleIndex(null)
      return
    }

    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const currentRoles = [...(updatedPlays[activePlayIndex].attributes?.roles || [])]
      const [draggedRole] = currentRoles.splice(draggedRoleIndex, 1)
      currentRoles.splice(targetIndex, 0, draggedRole)

      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        attributes: {
          ...updatedPlays[activePlayIndex].attributes,
          roles: currentRoles
        }
      }
      return updatedPlays
    })
    setDraggedRoleIndex(null)
  }

  const handleRoleDragEnd = () => {
    setDraggedRoleIndex(null)
  }

  // Handle role drop from RolesTreeView
  const handleRoleDropFromPalette = (e: React.DragEvent) => {
    e.preventDefault()
    const roleData = e.dataTransfer.getData('role')
    if (!roleData) return

    try {
      const parsed = JSON.parse(roleData)
      let roleName = ''

      // Handle standalone roles (Galaxy v1 API)
      if (parsed.type === 'standalone-role' && parsed.fqrn) {
        // Standalone role: author.role_name (e.g., geerlingguy.docker)
        roleName = parsed.fqrn
      }
      // Handle collection roles (Galaxy v3 API)
      else if (parsed.type === 'collection-role' && parsed.fqcn) {
        // Collection role: namespace.collection.role_name
        roleName = parsed.fqcn
      }
      // Legacy format support
      else if (parsed.type === 'role' && parsed.collection && parsed.role) {
        roleName = `${parsed.collection}.${parsed.role}`
      }

      if (roleName) {
        setPlays(prevPlays => {
          const updatedPlays = [...prevPlays]
          const currentRoles = updatedPlays[activePlayIndex].attributes?.roles || []
          // Allow duplicates - same role can be added multiple times
          updatedPlays[activePlayIndex] = {
            ...updatedPlays[activePlayIndex],
            attributes: {
              ...updatedPlays[activePlayIndex].attributes,
              roles: [...currentRoles, roleName]
            }
          }
          return updatedPlays
        })
      }
    } catch (error) {
      console.error('Failed to parse role data:', error)
    }
  }

  // Handle drag over for role drop zone
  const handleRoleDropZoneDragOver = (e: React.DragEvent) => {
    const roleData = e.dataTransfer.types.includes('role')
    if (roleData) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  // Mettre à jour le nom du PLAY et synchroniser avec la tâche PLAY
  const updatePlayName = (index: number, newName: string) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[index] = {
        ...updatedPlays[index],
        name: newName,
        // Synchroniser le nom de la tâche PLAY
        modules: updatedPlays[index].modules.map(m =>
          m.isPlay ? { ...m, taskName: newName } : m
        )
      }
      return updatedPlays
    })
  }

  // Calculer quelles sections sont ouvertes
  const playModule = modules.find(m => m.isPlay)
  const isVariablesOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'variables') : false
  const isRolesOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'roles') : false
  const isPreTasksOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'pre_tasks') : false
  const isTasksOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'tasks') : true
  const isPostTasksOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'post_tasks') : false
  const isHandlersOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'handlers') : false

  // Guard: ensure currentPlay exists
  if (!currentPlay) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Onglets PLAYs */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #ddd', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
          <Tabs
            value={activePlayIndex}
            onChange={(_, newValue) => {
              setActivePlayIndex(newValue)
              onSelectModule(null) // Clear selected module to show PLAY config
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {plays.map((play, index) => (
              <Tab
                key={play.id}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, py: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PlayArrowIcon sx={{ fontSize: 16 }} />
                      {editingTabIndex === index ? (
                        <TextField
                          autoFocus
                          variant="standard"
                          value={play.name}
                          onChange={(e) => updatePlayName(index, e.target.value)}
                          onBlur={() => setEditingTabIndex(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingTabIndex(null)
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            '& .MuiInput-input': {
                              fontSize: '0.875rem',
                              padding: '2px 4px',
                              minWidth: '80px',
                            },
                          }}
                        />
                      ) : (
                        <Typography
                          variant="body2"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setEditingTabIndex(index)
                          }}
                          sx={{ cursor: 'text', userSelect: 'none' }}
                        >
                          {play.name}
                        </Typography>
                      )}
                      {plays.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePlay(index)
                          }}
                          sx={{ ml: 0.5, p: 0.25 }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      )}
                    </Box>
                    {/* Icônes d'attributs PLAY */}
                    <PlayAttributeIcons
                      attributes={play.attributes || {}}
                      size="small"
                    />
                  </Box>
                }
              />
            ))}
          </Tabs>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={addPlay}
            variant="outlined"
            sx={{ ml: 2 }}
          >
            Add Play
          </Button>
        </Box>
      </Box>

      {/* PLAY Sections - Workspace Level */}
      <Box ref={playSectionsContainerRef} sx={{ display: 'flex', flexDirection: 'column', flex: 1, bgcolor: 'background.paper', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Section 1: Variables (Accordion - always visible) */}
        <Box sx={{ borderBottom: '1px solid #ddd', flexShrink: 0 }}>
          <Box
            onClick={() => {
              const playModule = modules.find(m => m.isPlay)
              if (playModule) {
                togglePlaySection(playModule.id, 'variables')
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              bgcolor: `${getPlaySectionColor('variables')}15`,
              cursor: 'pointer',
              '&:hover': { bgcolor: `${getPlaySectionColor('variables')}25` },
              position: 'relative',
              zIndex: 3
            }}
          >
            {(() => {
              const playModule = modules.find(m => m.isPlay)
              const collapsed = playModule ? isPlaySectionCollapsed(playModule.id, 'variables') : false
              return collapsed ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ExpandLessIcon sx={{ fontSize: 18 }} />
            })()}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: getPlaySectionColor('variables') }}>
              Variables ({currentPlay.variables.length})
            </Typography>
          </Box>
          {isVariablesOpen && (
            <Box ref={variablesSectionRef} sx={{ px: 3, py: 1.5, bgcolor: `${getPlaySectionColor('variables')}08` }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {currentPlay.variables.map((variable, index) => {
                  // Helper to get type icon
                  const getTypeIcon = (type: VariableType) => {
                    switch (type) {
                      case 'int': return <NumbersIcon fontSize="small" />
                      case 'bool': return <ToggleOnIcon fontSize="small" />
                      case 'list': return <DataArrayIcon fontSize="small" />
                      case 'dict': return <DataObjectIcon fontSize="small" />
                      default: return <TextFieldsIcon fontSize="small" />
                    }
                  }
                  // Helper to get type color
                  const getTypeColor = (type: VariableType): 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
                    switch (type) {
                      case 'int': return 'secondary'
                      case 'bool': return 'success'
                      case 'list': return 'warning'
                      case 'dict': return 'info'
                      default: return 'primary'
                    }
                  }
                  // Build tooltip
                  const tooltipParts = [
                    `Type: ${variable.type || 'string'}`,
                    `Required: ${variable.required ? 'Yes' : 'No'}`
                  ]
                  if (!variable.required && variable.defaultValue) {
                    tooltipParts.push(`Default: ${variable.defaultValue}`)
                  }
                  if (variable.regexp) {
                    tooltipParts.push(`Pattern: ${variable.regexp}`)
                  }

                  return (
                    <Tooltip key={index} title={tooltipParts.join(' | ')} placement="top">
                      <Chip
                        icon={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 0.5 }}>
                            {getTypeIcon(variable.type || 'string')}
                            {variable.required ? (
                              <CheckCircleIcon sx={{ fontSize: 12, color: 'success.main' }} />
                            ) : (
                              <RadioButtonUncheckedIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                            )}
                          </Box>
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                              {variable.key}
                            </Typography>
                            {variable.value && (
                              <>
                                <Typography variant="body2" component="span" color="text.secondary">:</Typography>
                                <Typography variant="body2" component="span" sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {variable.value}
                                </Typography>
                              </>
                            )}
                          </Box>
                        }
                        onClick={() => editVariable(index)}
                        onDelete={() => deleteVariable(index)}
                        color={getTypeColor(variable.type || 'string')}
                        variant="outlined"
                        size="small"
                        sx={{
                          cursor: 'pointer',
                          '& .MuiChip-icon': {
                            marginLeft: '4px',
                            marginRight: '-4px'
                          }
                        }}
                      />
                    </Tooltip>
                  )
                })}
                <Chip
                  label="Add Variable"
                  onClick={addVariable}
                  icon={<AddIcon />}
                  color="primary"
                  variant="filled"
                  sx={{ cursor: 'pointer' }}
                />
              </Box>
            </Box>
          )}
        </Box>

        {/* Tabs Navigation Bar for Roles and Task Sections */}
        <Box sx={{ borderBottom: 2, borderColor: 'divider', bgcolor: '#fafafa' }}>
          <Tabs
            value={activeSectionTab}
            onChange={(e, newValue) => setActiveSectionTab(newValue)}
            variant="fullWidth"
            sx={{
              minHeight: 56,
              '& .MuiTabs-indicator': {
                height: 3,
              }
            }}
          >
            {/* Roles Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<ExtensionIcon sx={{ fontSize: 20, color: activeSectionTab === 'roles' ? '#4caf50' : 'rgba(76, 175, 80, 0.65)' }} />}
                  count={currentPlay.attributes?.roles?.length || 0}
                  color="#4caf50"
                  isActive={activeSectionTab === 'roles'}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'roles' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                  Roles
                </Typography>
              }
              iconPosition="start"
              value="roles"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                px: 2.5,
                color: activeSectionTab === 'roles' ? '#4caf50' : 'rgba(76, 175, 80, 0.65)',
                bgcolor: activeSectionTab === 'roles' ? 'rgba(76, 175, 80, 0.12)' : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'roles' ? '3px solid #4caf50' : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'roles' ? 'rgba(76, 175, 80, 0.18)' : 'rgba(76, 175, 80, 0.08)',
                  color: '#4caf50'
                }
              }}
            />

            {/* Pre-Tasks Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<SkipPreviousIcon sx={{ fontSize: 20, color: activeSectionTab === 'pre_tasks' ? getPlaySectionColor('pre_tasks') : `${getPlaySectionColor('pre_tasks')}a6` }} />}
                  count={getTaskChainCount('pre_tasks')}
                  color={getPlaySectionColor('pre_tasks')}
                  isActive={activeSectionTab === 'pre_tasks'}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'pre_tasks' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                  Pre-Tasks
                </Typography>
              }
              iconPosition="start"
              value="pre_tasks"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                px: 2.5,
                color: activeSectionTab === 'pre_tasks' ? getPlaySectionColor('pre_tasks') : `${getPlaySectionColor('pre_tasks')}a6`,
                bgcolor: activeSectionTab === 'pre_tasks' ? `${getPlaySectionColor('pre_tasks')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'pre_tasks' ? `3px solid ${getPlaySectionColor('pre_tasks')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'pre_tasks' ? `${getPlaySectionColor('pre_tasks')}20` : `${getPlaySectionColor('pre_tasks')}08`,
                  color: getPlaySectionColor('pre_tasks')
                }
              }}
            />

            {/* Tasks Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<PlaylistPlayIcon sx={{ fontSize: 20, color: activeSectionTab === 'tasks' ? getPlaySectionColor('tasks') : `${getPlaySectionColor('tasks')}a6` }} />}
                  count={getTaskChainCount('tasks')}
                  color={getPlaySectionColor('tasks')}
                  isActive={activeSectionTab === 'tasks'}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'tasks' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                  Tasks
                </Typography>
              }
              iconPosition="start"
              value="tasks"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                px: 2.5,
                color: activeSectionTab === 'tasks' ? getPlaySectionColor('tasks') : `${getPlaySectionColor('tasks')}a6`,
                bgcolor: activeSectionTab === 'tasks' ? `${getPlaySectionColor('tasks')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'tasks' ? `3px solid ${getPlaySectionColor('tasks')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'tasks' ? `${getPlaySectionColor('tasks')}20` : `${getPlaySectionColor('tasks')}08`,
                  color: getPlaySectionColor('tasks')
                }
              }}
            />

            {/* Post-Tasks Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<SkipNextIcon sx={{ fontSize: 20, color: activeSectionTab === 'post_tasks' ? getPlaySectionColor('post_tasks') : `${getPlaySectionColor('post_tasks')}a6` }} />}
                  count={getTaskChainCount('post_tasks')}
                  color={getPlaySectionColor('post_tasks')}
                  isActive={activeSectionTab === 'post_tasks'}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'post_tasks' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                  Post-Tasks
                </Typography>
              }
              iconPosition="start"
              value="post_tasks"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                px: 2.5,
                color: activeSectionTab === 'post_tasks' ? getPlaySectionColor('post_tasks') : `${getPlaySectionColor('post_tasks')}a6`,
                bgcolor: activeSectionTab === 'post_tasks' ? `${getPlaySectionColor('post_tasks')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'post_tasks' ? `3px solid ${getPlaySectionColor('post_tasks')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'post_tasks' ? `${getPlaySectionColor('post_tasks')}20` : `${getPlaySectionColor('post_tasks')}08`,
                  color: getPlaySectionColor('post_tasks')
                }
              }}
            />

            {/* Handlers Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<NotificationsActiveIcon sx={{ fontSize: 20, color: activeSectionTab === 'handlers' ? getPlaySectionColor('handlers') : `${getPlaySectionColor('handlers')}a6` }} />}
                  count={getTaskChainCount('handlers')}
                  color={getPlaySectionColor('handlers')}
                  isActive={activeSectionTab === 'handlers'}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'handlers' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                  Handlers
                </Typography>
              }
              iconPosition="start"
              value="handlers"
              sx={{
                minHeight: 56,
                textTransform: 'none',
                px: 2.5,
                color: activeSectionTab === 'handlers' ? getPlaySectionColor('handlers') : `${getPlaySectionColor('handlers')}a6`,
                bgcolor: activeSectionTab === 'handlers' ? `${getPlaySectionColor('handlers')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'handlers' ? `3px solid ${getPlaySectionColor('handlers')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'handlers' ? `${getPlaySectionColor('handlers')}20` : `${getPlaySectionColor('handlers')}08`,
                  color: getPlaySectionColor('handlers')
                }
              }}
            />
          </Tabs>
        </Box>

        {/* Tab Content: Roles */}
        {activeSectionTab === 'roles' && (
          <Box
            sx={{
              flex: 1,
              px: 3,
              py: 2,
              bgcolor: '#4caf5008',
              overflow: 'auto',
              border: '2px dashed transparent',
              transition: 'border-color 0.2s',
              '&:hover': { borderColor: 'rgba(76, 175, 80, 0.3)' }
            }}
            onDrop={handleRoleDropFromPalette}
            onDragOver={handleRoleDropZoneDragOver}
          >
            {(currentPlay.attributes?.roles || []).length === 0 && (
              <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Drag roles from the Roles panel to add them here
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
              {(currentPlay.attributes?.roles || []).map((role, index) => {
                const roleLabel = typeof role === 'string' ? role : role.role
                const roleVars = typeof role === 'string' ? undefined : role.vars
                const isEnabled = typeof role === 'string' ? true : ((role as { enabled?: boolean }).enabled !== false)
                const isSelected = selectedRoleIndex === index
                return (
                  <Chip
                    key={`${roleLabel}-${index}`}
                    avatar={
                      <Tooltip title={isEnabled ? 'Désactiver ce rôle' : 'Activer ce rôle'}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRoleEnabled(index)
                          }}
                          sx={{
                            p: 0,
                            ml: 0.5,
                            width: 20,
                            height: 20,
                            minWidth: 20,
                            color: isEnabled ? '#4caf50' : '#bdbdbd',
                            '&:hover': {
                              bgcolor: 'transparent',
                              color: isEnabled ? '#388e3c' : '#9e9e9e'
                            }
                          }}
                        >
                          {isEnabled ? <VisibilityIcon sx={{ fontSize: 16 }} /> : <VisibilityOffIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Tooltip>
                    }
                    label={roleLabel}
                    size="small"
                    onClick={() => {
                      if (onSelectRole) {
                        onSelectRole(isSelected ? null : { index, role: roleLabel, vars: roleVars })
                      }
                    }}
                    onDelete={() => {
                      deleteRole(index)
                      // Deselect if this role was selected
                      if (isSelected && onSelectRole) {
                        onSelectRole(null)
                      }
                    }}
                    color={isSelected ? 'primary' : (isEnabled ? 'success' : 'default')}
                    variant={isSelected ? 'filled' : 'outlined'}
                    draggable
                    onDragStart={(e) => handleRoleDragStart(index, e)}
                    onDragOver={(e) => handleRoleDragOver(index, e)}
                    onDrop={(e) => handleRoleDrop(index, e)}
                    onDragEnd={handleRoleDragEnd}
                    sx={{
                      cursor: 'pointer',
                      opacity: draggedRoleIndex === index ? 0.5 : (isEnabled ? 1 : 0.6),
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: 2 },
                      maxWidth: 300,
                      '& .MuiChip-label': {
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textDecoration: isEnabled ? 'none' : 'line-through',
                        color: isEnabled ? 'inherit' : '#9e9e9e'
                      },
                      '& .MuiChip-avatar': {
                        ml: 0,
                        mr: -0.5
                      },
                      ...(isSelected && {
                        boxShadow: 3,
                        transform: 'scale(1.05)'
                      }),
                      ...(!isEnabled && {
                        borderColor: '#bdbdbd',
                        bgcolor: 'rgba(0,0,0,0.04)'
                      })
                    }}
                  />
                )
              })}
            </Box>
          </Box>
        )}

        {/* Tab Content: Pre-Tasks */}
        {activeSectionTab === 'pre_tasks' && (
          <Box
            ref={preTasksSectionRef}
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              bgcolor: `${getPlaySectionColor('pre_tasks')}08`,
              overflow: 'auto',
              p: 2
            }}
            onDrop={(e) => handlePlaySectionDrop('pre_tasks', e)}
            onDragOver={handleDragOver}
            onClick={(e) => {
              // Deselect module when clicking on empty space in section
              if (e.target === e.currentTarget) {
                onSelectModule(null)
              }
            }}
          >
            {/* Render START task and other tasks/blocks in pre_tasks section */}
            <PlaySectionContent
              sectionName="pre_tasks"
              modules={modules}
              selectedModuleId={selectedModuleId}
              draggedModuleId={draggedModuleId}
              collapsedBlocks={collapsedBlocks}
              collapsedBlockSections={collapsedBlockSections}
              resizingBlock={resizingBlock}
              getStartChainCount={getStartChainCount}
              onSelectModule={onSelectModule}
              updateTaskName={updateTaskName}
              toggleBlockCollapse={toggleBlockCollapse}
              toggleBlockSection={toggleBlockSection}
              isSectionCollapsed={isSectionCollapsed}
              handleModuleDragStart={handleModuleDragStart}
              handleModuleDragOver={handleModuleDragOver}
              handleModuleDropOnModule={handleModuleDropOnModule}
              handleBlockSectionDrop={handleBlockSectionDrop}
              handleResizeStart={handleResizeStart}
              getBlockTheme={getBlockTheme}
              getBlockDimensions={getBlockDimensions}
              getSectionColor={getSectionColor}
              getPlaySectionColor={getPlaySectionColor}
              links={links}
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
              highlightedElements={highlightedElements}
            />

            {/* Render links for this section */}
            <SectionLinks
              links={links}
              modules={modules}
              sectionType="play"
              sectionName="pre_tasks"
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />
          </Box>
        )}

        {/* Tab Content: Tasks */}
        {activeSectionTab === 'tasks' && (
          <Box
            ref={tasksSectionRef}
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              bgcolor: `${getPlaySectionColor('tasks')}08`,
              overflow: 'auto',
              p: 2
            }}
            onDrop={(e) => handlePlaySectionDrop('tasks', e)}
            onDragOver={handleDragOver}
            onClick={(e) => {
              // Deselect module when clicking on empty space in section
              if (e.target === e.currentTarget) {
                onSelectModule(null)
              }
            }}
          >
            {/* Render START task and other tasks/blocks in tasks section */}
            <PlaySectionContent
              sectionName="tasks"
              modules={modules}
              selectedModuleId={selectedModuleId}
              draggedModuleId={draggedModuleId}
              collapsedBlocks={collapsedBlocks}
              collapsedBlockSections={collapsedBlockSections}
              resizingBlock={resizingBlock}
              getStartChainCount={getStartChainCount}
              onSelectModule={onSelectModule}
              updateTaskName={updateTaskName}
              toggleBlockCollapse={toggleBlockCollapse}
              toggleBlockSection={toggleBlockSection}
              isSectionCollapsed={isSectionCollapsed}
              handleModuleDragStart={handleModuleDragStart}
              handleModuleDragOver={handleModuleDragOver}
              handleModuleDropOnModule={handleModuleDropOnModule}
              handleBlockSectionDrop={handleBlockSectionDrop}
              handleResizeStart={handleResizeStart}
              getBlockTheme={getBlockTheme}
              getBlockDimensions={getBlockDimensions}
              getSectionColor={getSectionColor}
              getPlaySectionColor={getPlaySectionColor}
              links={links}
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
              highlightedElements={highlightedElements}
            />

            {/* Render links for this section */}
            <SectionLinks
              links={links}
              modules={modules}
              sectionType="play"
              sectionName="tasks"
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />
          </Box>
        )}

        {/* Tab Content: Post-Tasks */}
        {activeSectionTab === 'post_tasks' && (
          <Box
            ref={postTasksSectionRef}
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              bgcolor: `${getPlaySectionColor('post_tasks')}08`,
              overflow: 'auto',
              p: 2
            }}
            onDrop={(e) => handlePlaySectionDrop('post_tasks', e)}
            onDragOver={handleDragOver}
            onClick={(e) => {
              // Deselect module when clicking on empty space in section
              if (e.target === e.currentTarget) {
                onSelectModule(null)
              }
            }}
          >
            {/* Render START task and other tasks in post_tasks section */}
            <PlaySectionContent
              sectionName="post_tasks"
              modules={modules}
              selectedModuleId={selectedModuleId}
              draggedModuleId={draggedModuleId}
              collapsedBlocks={collapsedBlocks}
              collapsedBlockSections={collapsedBlockSections}
              resizingBlock={resizingBlock}
              getStartChainCount={getStartChainCount}
              onSelectModule={onSelectModule}
              updateTaskName={updateTaskName}
              toggleBlockCollapse={toggleBlockCollapse}
              toggleBlockSection={toggleBlockSection}
              isSectionCollapsed={isSectionCollapsed}
              handleModuleDragStart={handleModuleDragStart}
              handleModuleDragOver={handleModuleDragOver}
              handleModuleDropOnModule={handleModuleDropOnModule}
              handleBlockSectionDrop={handleBlockSectionDrop}
              handleResizeStart={handleResizeStart}
              getBlockTheme={getBlockTheme}
              getBlockDimensions={getBlockDimensions}
              getSectionColor={getSectionColor}
              getPlaySectionColor={getPlaySectionColor}
              links={links}
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
              highlightedElements={highlightedElements}
            />

            {/* Render links for this section */}
            <SectionLinks
              links={links}
              modules={modules}
              sectionType="play"
              sectionName="post_tasks"
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />
          </Box>
        )}

        {/* Tab Content: Handlers */}
        {activeSectionTab === 'handlers' && (
          <Box
            ref={handlersSectionRef}
            sx={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              bgcolor: `${getPlaySectionColor('handlers')}08`,
              overflow: 'auto',
              p: 2
            }}
            onDrop={(e) => handlePlaySectionDrop('handlers', e)}
            onDragOver={handleDragOver}
            onClick={(e) => {
              // Deselect module when clicking on empty space in section
              if (e.target === e.currentTarget) {
                onSelectModule(null)
              }
            }}
          >
            {/* Render START task and other tasks in handlers section */}
            <PlaySectionContent
              sectionName="handlers"
              modules={modules}
              selectedModuleId={selectedModuleId}
              draggedModuleId={draggedModuleId}
              collapsedBlocks={collapsedBlocks}
              collapsedBlockSections={collapsedBlockSections}
              resizingBlock={resizingBlock}
              getStartChainCount={getStartChainCount}
              onSelectModule={onSelectModule}
              updateTaskName={updateTaskName}
              toggleBlockCollapse={toggleBlockCollapse}
              toggleBlockSection={toggleBlockSection}
              isSectionCollapsed={isSectionCollapsed}
              handleModuleDragStart={handleModuleDragStart}
              handleModuleDragOver={handleModuleDragOver}
              handleModuleDropOnModule={handleModuleDropOnModule}
              handleBlockSectionDrop={handleBlockSectionDrop}
              handleResizeStart={handleResizeStart}
              getBlockTheme={getBlockTheme}
              getBlockDimensions={getBlockDimensions}
              getSectionColor={getSectionColor}
              getPlaySectionColor={getPlaySectionColor}
              links={links}
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
              highlightedElements={highlightedElements}
            />

            {/* Render links for this section */}
            <SectionLinks
              links={links}
              modules={modules}
              sectionType="play"
              sectionName="handlers"
              getLinkStyle={getLinkStyle}
              deleteLink={deleteLink}
              hoveredLinkId={hoveredLinkId}
              setHoveredLinkId={setHoveredLinkId}
              getModuleOrVirtual={getModuleOrVirtual}
              getModuleDimensions={getModuleDimensions}
            />
          </Box>
        )}
      </Box>

      {/* Drop Zone - Canvas libre */}
      <Box
        ref={canvasRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={(e) => {
          // Désélectionner si on clique directement sur le canvas (pas sur un module)
          if (e.target === e.currentTarget) {
            onSelectModule(null)
          }
        }}
        sx={{
          display: 'none', // Hidden - all modules are now in PLAY sections
        }}
      >
        {modules.length === 0 ? (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              p: 4,
              border: '2px dashed #ccc',
              borderRadius: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Drop modules or blocks here to start building your playbook
            </Typography>
          </Box>
        ) : (
          <>
            {modules.filter(m => !m.parentId && !m.parentSection).map((module, index) => {
              const isBlock = module.isBlock || module.isPlay
              const dimensions = isBlock ? getBlockDimensions(module) : { width: 140, height: 60 }

              if (isBlock) {
                // Rendu d'un Block ou PLAY
                const isSystem = isSystemBlock(module)
                const blockTheme = module.isPlay ? getPlayTheme() : module.isSystem ? {
                  // System block theme (locked, gray)
                  bgColor: 'rgba(158, 158, 158, 0.15)',
                  borderColor: '#9e9e9e',
                  iconColor: '#757575',
                  headerBgColor: 'rgba(158, 158, 158, 0.2)',
                } : getBlockTheme(module.id)

                return (
                  <Paper
                    key={module.id}
                    className="module-block"
                    data-block-id={module.id}
                    elevation={selectedModuleId === module.id ? 6 : (module.isSystem ? 1 : 3)}
                    onClick={() => onSelectModule({
                      id: module.id,
                      name: module.name,
                      collection: module.collection,
                      taskName: module.taskName,
                      when: module.when,
                      ignoreErrors: module.ignoreErrors,
                      become: module.become,
                      loop: module.loop,
                      delegateTo: module.delegateTo,
                      tags: module.tags,
                      isBlock: module.isBlock,
                      isPlay: module.isPlay,
                      moduleParameters: module.moduleParameters,
                      moduleSchema: module.moduleSchema,
                      validationState: module.validationState,
                      isSystem: isSystem,
                      description: module.description
                    })}
                    draggable
                    onDragStart={(e) => handleModuleDragStart(module.id, e)}
                    onDragOver={(e) => handleModuleDragOver(module.id, e)}
                    onDrop={(e) => !module.isSystem && handleModuleDropOnModule(module.id, e)}
                    sx={{
                      position: 'absolute',
                      left: module.x,
                      top: module.y,
                      width: dimensions.width,
                      height: dimensions.height,
                      p: 1,
                      cursor: 'move',
                      border: `2px solid ${blockTheme.borderColor}`,
                      borderRadius: module.isPlay ? '0 50% 50% 0' : 2,
                      bgcolor: blockTheme.bgColor,
                      zIndex: draggedModuleId === module.id ? 10 : 1,
                      opacity: module.isSystem ? 0.85 : (draggedModuleId === module.id ? 0.7 : 1),
                      overflow: 'visible',
                      // Highlight effect for synced elements (user's color)
                      ...(highlightedElements.has(module.id) && {
                        boxShadow: `0 0 25px 8px ${highlightedElements.get(module.id)}99, 0 0 50px 15px ${highlightedElements.get(module.id)}66`,
                        border: `3px solid ${highlightedElements.get(module.id)}`,
                        transition: 'box-shadow 0.3s ease-in, border 0.3s ease-in',
                      }),
                      '&:hover': {
                        boxShadow: highlightedElements.has(module.id)
                          ? `0 0 25px 8px ${highlightedElements.get(module.id)}99, 0 0 50px 15px ${highlightedElements.get(module.id)}66`
                          : (module.isSystem ? 2 : 6),
                      },
                    }}
                  >
                    {/* Header du block/play */}
                    <Box
                      className="block-header"
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={(e) => {
                        const sourceId = e.dataTransfer.getData('existingModule')
                        // Si on drop le block sur lui-même, laisser l'événement remonter pour le déplacement
                        if (sourceId === module.id) {
                          return
                        }
                        e.preventDefault()
                        e.stopPropagation()
                        handleModuleDropOnModule(module.id, e)
                      }}
                      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1, pb: 0.5, borderBottom: `1px solid ${blockTheme.borderColor}` }}
                    >
                      {/* Première ligne : Icône + Nom + Boutons */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {module.isPlay ? (
                            <PlayArrowIcon sx={{ fontSize: 20, color: blockTheme.iconColor }} />
                          ) : module.isSystem ? (
                            <Tooltip title="Bloc système - Généré automatiquement">
                              <LockIcon sx={{ fontSize: 18, color: blockTheme.iconColor }} />
                            </Tooltip>
                          ) : (
                            <AccountTreeIcon sx={{ fontSize: 18, color: blockTheme.iconColor }} />
                          )}
                          {module.isSystem ? (
                            <Typography
                              sx={{
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                color: blockTheme.iconColor,
                              }}
                            >
                              {module.taskName}
                            </Typography>
                          ) : (
                            <TextField
                              fullWidth
                              variant="standard"
                              value={module.taskName}
                              onChange={(e) => updateTaskName(module.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                '& .MuiInput-input': {
                                  fontWeight: 'bold',
                                  fontSize: '0.75rem',
                                  padding: '2px 0',
                                  color: blockTheme.iconColor,
                                },
                              }}
                            />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {/* Bouton collapse/expand pour tous les blocks (y compris système), pas les PLAY */}
                          {!module.isPlay && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleBlockCollapse(module.id)
                              }}
                              sx={{ p: 0.25 }}
                            >
                              {collapsedBlocks.has(module.id) ? (
                                <ExpandMoreIcon sx={{ fontSize: 16 }} />
                              ) : (
                                <ExpandLessIcon sx={{ fontSize: 16 }} />
                              )}
                            </IconButton>
                          )}
                        </Box>
                      </Box>

                      {/* Deuxième ligne : Inventory (SEULEMENT pour les PLAY) */}
                      {module.isPlay && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 3 }}>
                          <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'text.secondary', minWidth: 60 }}>
                            Inventory:
                          </Typography>
                          <TextField
                            fullWidth
                            variant="standard"
                            value={module.inventory || ''}
                            onChange={(e) => updateInventory(module.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="hosts"
                            sx={{
                              '& .MuiInput-input': {
                                fontSize: '0.75rem',
                                padding: '1px 0',
                                color: 'text.secondary',
                              },
                            }}
                          />
                        </Box>
                      )}

                      {/* Icônes d'attributs (SEULEMENT pour les blocks, pas les PLAY) */}
                      {!module.isPlay && (
                        <TaskAttributeIcons
                          attributes={{
                            when: module.when,
                            ignoreErrors: module.ignoreErrors,
                            become: module.become,
                            loop: module.loop,
                            delegateTo: module.delegateTo
                          }}
                          size="small"
                          sx={{ pl: 3, mt: 0.5 }}
                        />
                      )}
                    </Box>


                    {/* Contenu du block avec 3 sections - Pour tous les blocks (y compris système), pas les PLAY */}
                    {!module.isPlay && !collapsedBlocks.has(module.id) && (
                      <Box sx={{ position: 'absolute', top: 50, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
                        {/* Section Tasks - Header toujours visible */}
                        <Box
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleBlockSection(module.id, 'normal')
                          }}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            p: 0.5,
                            bgcolor: `${getSectionColor('normal')}15`,
                            cursor: 'pointer',
                            borderBottom: '1px solid #ddd',
                            flexShrink: 0,
                            '&:hover': { bgcolor: `${getSectionColor('normal')}25` }
                          }}
                        >
                          {isSectionCollapsed(module.id, 'normal') ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor('normal'), fontSize: '0.7rem' }}>
                            Tasks
                          </Typography>
                        </Box>

                        {/* Contenu de la section Normal - affiché seulement si ouvert */}
                        {!isSectionCollapsed(module.id, 'normal') && (
                          <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                            <Box
                              className="section-container"
                              data-section="normal"
                              data-section-id={`${module.id}-normal`}
                              onDragOver={(e) => {
                                e.preventDefault()
                                // Ne pas bloquer la propagation pour permettre au canvas de recevoir l'événement
                              }}
                              onDrop={(e) => {
                                const sourceId = e.dataTransfer.getData('existingModule')
                                const moduleData = e.dataTransfer.getData('module')

                                // Si on drop le block parent sur sa propre section, laisser l'événement remonter pour le déplacement
                                if (sourceId === module.id) {
                                  return
                                }

                                // Bloquer les drops sur les blocs système (sauf repositionnement interne)
                                const sourceModule = sourceId ? modules.find(m => m.id === sourceId) : null
                                const isInternalReposition = sourceModule?.parentId === module.id && sourceModule?.parentSection === 'normal'
                                if (module.isSystem && !isInternalReposition) {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  return
                                }

                                // Calculer la position relative à la section
                                const sectionElem = e.currentTarget as HTMLElement
                                const sectionRect = sectionElem.getBoundingClientRect()
                                const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
                                const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')
                                const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : 75
                                const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : 60

                                let relativeX = e.clientX - sectionRect.left - offsetX
                                let relativeY = e.clientY - sectionRect.top - offsetY

                                // Contraindre dans les limites de la section
                                const taskWidth = 140
                                const taskHeight = 60
                                relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - taskWidth))
                                relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - taskHeight))

                                // Cas 1: Module existant déplacé
                                if (sourceId) {
                                  if (!sourceModule) return

                                  // Sous-cas 1.1: Même section - repositionnement
                                  if (isInternalReposition) {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setModules(prev => prev.map(m =>
                                      m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
                                    ))
                                    // Send collaboration update for module move (include parentId/parentSection to prevent removal)
                                    collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: module.id, parentSection: 'normal' })
                                    return
                                  }
                                  // Sous-cas 1.2: Tâche externe (zone de travail ou autre section)
                                  else {
                                    // Vérifier si la tâche a des liens
                                    const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

                                    if (!hasLinks) {
                                      // Pas de liens: déplacer la tâche dans cette section
                                      e.preventDefault()
                                      e.stopPropagation()
                                      // Retirer de l'ancienne section si elle était dans une
                                      if (sourceModule.parentId && sourceModule.parentSection) {
                                        setModules(prev => prev.map(m => {
                                          if (m.id === sourceModule.parentId) {
                                            const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                            const oldSection = sourceModule.parentSection!
                                            return {
                                              ...m,
                                              blockSections: {
                                                ...sections,
                                                [oldSection]: sections[oldSection].filter(id => id !== sourceId)
                                              }
                                            }
                                          }
                                          return m
                                        }))
                                      }

                                      // Ajouter à cette section
                                      addTaskToBlockSection(sourceId, module.id, 'normal', relativeX, relativeY)
                                      // Send collaboration update for module move into block section
                                      collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: module.id, parentSection: 'normal' })
                                      return
                                    } else {
                                      // A des liens: créer un lien avec le block
                                      e.preventDefault()
                                      e.stopPropagation()
                                      createLink(getLinkTypeFromSource(sourceId), sourceId, module.id)
                                      return
                                    }
                                  }
                                }
                                // Cas 2: Nouveau module depuis la palette
                                else if (moduleData) {
                                  const parsedData = JSON.parse(moduleData)
                                  // Ne pas permettre de déposer un PLAY dans une section
                                  if (parsedData.name !== 'play') {
                                    e.preventDefault()
                                    e.stopPropagation()

                                    const isBlock = parsedData.name === 'block'

                                    // Calculer la position relative à la section
                                    const sectionElem = e.currentTarget as HTMLElement
                                    const sectionRect = sectionElem.getBoundingClientRect()

                                    // Ajuster l'offset selon le type (block ou tâche)
                                    const dropOffsetX = isBlock ? 200 : 75
                                    const dropOffsetY = isBlock ? 150 : 60

                                    let relativeX = e.clientX - sectionRect.left - dropOffsetX
                                    let relativeY = e.clientY - sectionRect.top - dropOffsetY

                                    // Contraindre dans les limites de la section
                                    const itemWidth = isBlock ? 400 : 140
                                    const itemHeight = isBlock ? 300 : 60
                                    relativeX = Math.max(0, Math.min(relativeX, sectionRect.width - itemWidth))
                                    relativeY = Math.max(0, Math.min(relativeY, sectionRect.height - itemHeight))

                                    const newModuleId = `module-${Date.now()}-${Math.random().toString(36).substring(7)}`
                                    const newModule: ModuleBlock = {
                                      id: newModuleId,
                                      collection: parsedData.collection,
                                      name: parsedData.name,
                                      description: parsedData.description,
                                      taskName: isBlock ? 'Error Handling Block' : `Task with ${parsedData.name}`,
                                      x: relativeX,
                                      y: relativeY,
                                      parentId: module.id,
                                      parentSection: 'normal',
                                      isBlock: isBlock,
                                      blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined
                                    }
                                    setModules(prev => [...prev, newModule])

                                    // Ajouter à la section
                                    setModules(prev => prev.map(m => {
                                      if (m.id === module.id) {
                                        const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                        return {
                                          ...m,
                                          blockSections: {
                                            ...sections,
                                            normal: [...sections.normal, newModule.id]
                                          }
                                        }
                                      }
                                      return m
                                    }))

                                    // Send collaboration update
                                    collaborationCallbacks?.sendModuleAdd?.({
                                      moduleId: newModuleId,
                                      module: newModule,
                                      position: { x: relativeX, y: relativeY }
                                    })
                                  }
                                }
                              }}
                              sx={{ position: 'relative', height: '100%', minHeight: 200, p: 0.5, bgcolor: 'rgba(25, 118, 210, 0.08)' }}
                            >
                              <BlockSectionContent
                                blockId={module.id}
                                section="normal"
                                modules={modules}
                                selectedModuleId={selectedModuleId}
                                draggedModuleId={draggedModuleId}
                                collapsedBlocks={collapsedBlocks}
                                collapsedBlockSections={collapsedBlockSections}
                                resizingBlock={resizingBlock}
                                getStartChainCount={getStartChainCount}
                                onSelectModule={onSelectModule}
                                updateTaskName={updateTaskName}
                                toggleBlockCollapse={toggleBlockCollapse}
                                toggleBlockSection={toggleBlockSection}
                                isSectionCollapsed={isSectionCollapsed}
                                handleModuleDragStart={handleModuleDragStart}
                                handleModuleDragOver={handleModuleDragOver}
                                handleModuleDropOnModule={handleModuleDropOnModule}
                                handleBlockSectionDrop={handleBlockSectionDrop}
                                handleResizeStart={handleResizeStart}
                                getBlockTheme={getBlockTheme}
                                getBlockDimensions={getBlockDimensions}
                                getSectionColor={getSectionColor}
                                links={links}
                                getLinkStyle={getLinkStyle}
                                deleteLink={deleteLink}
                                hoveredLinkId={hoveredLinkId}
                                setHoveredLinkId={setHoveredLinkId}
                                getModuleOrVirtual={getModuleOrVirtual}
                                getModuleDimensions={getModuleDimensions}
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Sections Rescue et Always - uniquement pour les blocks non-système */}
                        {!module.isSystem && (
                          <>
                            {/* Section Rescue - Header toujours visible */}
                            <Box
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleBlockSection(module.id, 'rescue')
                              }}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            p: 0.5,
                            bgcolor: `${getSectionColor('rescue')}15`,
                            cursor: 'pointer',
                            borderBottom: '1px solid #ddd',
                            flexShrink: 0,
                            '&:hover': { bgcolor: `${getSectionColor('rescue')}25` }
                          }}
                        >
                          {isSectionCollapsed(module.id, 'rescue') ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor('rescue'), fontSize: '0.7rem' }}>
                            Rescue
                          </Typography>
                        </Box>

                        {/* Contenu de la section Rescue - affiché seulement si ouvert */}
                        {!isSectionCollapsed(module.id, 'rescue') && (
                          <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                            <Box
                              className="section-container"
                              data-section="rescue"
                              data-section-id={`${module.id}-rescue`}
                              onDragOver={(e) => {
                                e.preventDefault()
                                // Ne pas bloquer la propagation pour permettre au canvas de recevoir l'événement
                              }}
                              onDrop={(e) => {
                                const sourceId = e.dataTransfer.getData('existingModule')
                                const moduleData = e.dataTransfer.getData('module')

                                // Si on drop le block parent sur sa propre section, laisser l'événement remonter pour le déplacement
                                if (sourceId === module.id) {
                                  return
                                }

                                // Calculer la position relative à la section
                                const sectionElem = e.currentTarget as HTMLElement
                                const sectionRect = sectionElem.getBoundingClientRect()

                                // Récupérer l'offset du drag
                                const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
                                const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')
                                const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : 75
                                const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : 60

                                let relativeX = e.clientX - sectionRect.left - offsetX
                                let relativeY = e.clientY - sectionRect.top - offsetY

                                // Contraindre dans les limites de la section
                                const taskWidth = 140
                                const taskHeight = 60
                                const sectionWidth = sectionRect.width
                                const sectionHeight = sectionRect.height

                                relativeX = Math.max(0, Math.min(relativeX, sectionWidth - taskWidth))
                                relativeY = Math.max(0, Math.min(relativeY, sectionHeight - taskHeight))

                                // Cas 1: Module existant déplacé
                                if (sourceId) {
                                  const sourceModule = modules.find(m => m.id === sourceId)
                                  if (!sourceModule) return

                                  // Sous-cas 1.1: Même section - repositionnement
                                  if (sourceModule.parentId === module.id && sourceModule.parentSection === 'rescue') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setModules(prev => prev.map(m =>
                                      m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
                                    ))
                                    // Send collaboration update for module move (include parentId/parentSection to prevent removal)
                                    collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: module.id, parentSection: 'rescue' })
                                    return
                                  }
                                  // Sous-cas 1.2: Tâche externe (zone de travail ou autre section)
                                  else {
                                    // Vérifier si la tâche a des liens
                                    const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

                                    if (!hasLinks) {
                                      // Pas de liens: déplacer la tâche dans cette section
                                      e.preventDefault()
                                      e.stopPropagation()
                                      // Retirer de l'ancienne section si elle était dans une
                                      if (sourceModule.parentId && sourceModule.parentSection) {
                                        setModules(prev => prev.map(m => {
                                          if (m.id === sourceModule.parentId) {
                                            const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                            const oldSection = sourceModule.parentSection!
                                            return {
                                              ...m,
                                              blockSections: {
                                                ...sections,
                                                [oldSection]: sections[oldSection].filter(id => id !== sourceId)
                                              }
                                            }
                                          }
                                          return m
                                        }))
                                      }

                                      // Ajouter à cette section
                                      addTaskToBlockSection(sourceId, module.id, 'rescue', relativeX, relativeY)
                                      // Send collaboration update for module move into block section
                                      collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: module.id, parentSection: 'rescue' })
                                      return
                                    } else {
                                      // A des liens: créer un lien avec le block
                                      e.preventDefault()
                                      e.stopPropagation()
                                      createLink(getLinkTypeFromSource(sourceId), sourceId, module.id)
                                      return
                                    }
                                  }
                                }
                                // Cas 2: Nouveau module depuis la palette
                                else if (moduleData) {
                                  const parsedData = JSON.parse(moduleData)
                                  // Ne pas permettre de déposer un PLAY dans une section
                                  if (parsedData.name !== 'play') {
                                    e.preventDefault()
                                    e.stopPropagation()

                                    const isBlock = parsedData.name === 'block'

                                    // Ajuster l'offset et contraintes selon le type (block ou tâche)
                                    const dropOffsetX = isBlock ? 200 : offsetX
                                    const dropOffsetY = isBlock ? 150 : offsetY
                                    const itemWidth = isBlock ? 400 : taskWidth
                                    const itemHeight = isBlock ? 300 : taskHeight

                                    let adjustedX = e.clientX - sectionRect.left - dropOffsetX
                                    let adjustedY = e.clientY - sectionRect.top - dropOffsetY
                                    adjustedX = Math.max(0, Math.min(adjustedX, sectionRect.width - itemWidth))
                                    adjustedY = Math.max(0, Math.min(adjustedY, sectionRect.height - itemHeight))

                                    const newModuleId = `module-${Date.now()}-${Math.random().toString(36).substring(7)}`
                                    const newModule: ModuleBlock = {
                                      id: newModuleId,
                                      collection: parsedData.collection,
                                      name: parsedData.name,
                                      description: parsedData.description,
                                      taskName: isBlock ? 'Error Handling Block' : `Task with ${parsedData.name}`,
                                      x: adjustedX,
                                      y: adjustedY,
                                      parentId: module.id,
                                      parentSection: 'rescue',
                                      isBlock: isBlock,
                                      blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined
                                    }
                                    setModules(prev => [...prev, newModule])

                                    // Ajouter à la section
                                    setModules(prev => prev.map(m => {
                                      if (m.id === module.id) {
                                        const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                        return {
                                          ...m,
                                          blockSections: {
                                            ...sections,
                                            rescue: [...sections.rescue, newModule.id]
                                          }
                                        }
                                      }
                                      return m
                                    }))

                                    // Send collaboration update
                                    collaborationCallbacks?.sendModuleAdd?.({
                                      moduleId: newModuleId,
                                      module: newModule,
                                      position: { x: adjustedX, y: adjustedY }
                                    })
                                  }
                                }
                              }}
                              sx={{ position: 'relative', height: '100%', minHeight: 200, p: 0.5, bgcolor: 'rgba(255, 152, 0, 0.08)' }}
                            >
                              <BlockSectionContent
                                blockId={module.id}
                                section="rescue"
                                modules={modules}
                                selectedModuleId={selectedModuleId}
                                draggedModuleId={draggedModuleId}
                                collapsedBlocks={collapsedBlocks}
                                collapsedBlockSections={collapsedBlockSections}
                                resizingBlock={resizingBlock}
                                getStartChainCount={getStartChainCount}
                                onSelectModule={onSelectModule}
                                updateTaskName={updateTaskName}
                                toggleBlockCollapse={toggleBlockCollapse}
                                toggleBlockSection={toggleBlockSection}
                                isSectionCollapsed={isSectionCollapsed}
                                handleModuleDragStart={handleModuleDragStart}
                                handleModuleDragOver={handleModuleDragOver}
                                handleModuleDropOnModule={handleModuleDropOnModule}
                                handleBlockSectionDrop={handleBlockSectionDrop}
                                handleResizeStart={handleResizeStart}
                                getBlockTheme={getBlockTheme}
                                getBlockDimensions={getBlockDimensions}
                                getSectionColor={getSectionColor}
                                links={links}
                                getLinkStyle={getLinkStyle}
                                deleteLink={deleteLink}
                                hoveredLinkId={hoveredLinkId}
                                setHoveredLinkId={setHoveredLinkId}
                                getModuleOrVirtual={getModuleOrVirtual}
                                getModuleDimensions={getModuleDimensions}
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Section Always - Header toujours visible */}
                        <Box
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleBlockSection(module.id, 'always')
                          }}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            p: 0.5,
                            bgcolor: `${getSectionColor('always')}15`,
                            cursor: 'pointer',
                            borderBottom: '1px solid #ddd',
                            flexShrink: 0,
                            '&:hover': { bgcolor: `${getSectionColor('always')}25` }
                          }}
                        >
                          {isSectionCollapsed(module.id, 'always') ? <ExpandMoreIcon sx={{ fontSize: 14 }} /> : <ExpandLessIcon sx={{ fontSize: 14 }} />}
                          <Typography variant="caption" sx={{ fontWeight: 'bold', color: getSectionColor('always'), fontSize: '0.7rem' }}>
                            Always
                          </Typography>
                        </Box>

                        {/* Contenu de la section Always - affiché seulement si ouvert */}
                        {!isSectionCollapsed(module.id, 'always') && (
                          <Box sx={{ flex: 1, minHeight: 0, position: 'relative' }}>
                            <Box
                              className="section-container"
                              data-section="always"
                              data-section-id={`${module.id}-always`}
                              onDragOver={(e) => {
                                e.preventDefault()
                                // Ne pas bloquer la propagation pour permettre au canvas de recevoir l'événement
                              }}
                              onDrop={(e) => {
                                const sourceId = e.dataTransfer.getData('existingModule')
                                const moduleData = e.dataTransfer.getData('module')

                                // Si on drop le block parent sur sa propre section, laisser l'événement remonter pour le déplacement
                                if (sourceId === module.id) {
                                  return
                                }

                                // Calculer la position relative à la section
                                const sectionElem = e.currentTarget as HTMLElement
                                const sectionRect = sectionElem.getBoundingClientRect()

                                // Récupérer l'offset du drag
                                const dragOffsetXStr = e.dataTransfer.getData('dragOffsetX')
                                const dragOffsetYStr = e.dataTransfer.getData('dragOffsetY')
                                const offsetX = dragOffsetXStr ? parseFloat(dragOffsetXStr) : 75
                                const offsetY = dragOffsetYStr ? parseFloat(dragOffsetYStr) : 60

                                let relativeX = e.clientX - sectionRect.left - offsetX
                                let relativeY = e.clientY - sectionRect.top - offsetY

                                // Contraindre dans les limites de la section
                                const taskWidth = 140
                                const taskHeight = 60
                                const sectionWidth = sectionRect.width
                                const sectionHeight = sectionRect.height

                                relativeX = Math.max(0, Math.min(relativeX, sectionWidth - taskWidth))
                                relativeY = Math.max(0, Math.min(relativeY, sectionHeight - taskHeight))

                                // Cas 1: Module existant déplacé
                                if (sourceId) {
                                  const sourceModule = modules.find(m => m.id === sourceId)
                                  if (!sourceModule) return

                                  // Sous-cas 1.1: Même section - repositionnement
                                  if (sourceModule.parentId === module.id && sourceModule.parentSection === 'always') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setModules(prev => prev.map(m =>
                                      m.id === sourceId ? { ...m, x: relativeX, y: relativeY } : m
                                    ))
                                    // Send collaboration update for module move (include parentId/parentSection to prevent removal)
                                    collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: module.id, parentSection: 'always' })
                                    return
                                  }
                                  // Sous-cas 1.2: Tâche externe (zone de travail ou autre section)
                                  else {
                                    // Vérifier si la tâche a des liens
                                    const hasLinks = links.some(l => l.from === sourceId || l.to === sourceId)

                                    if (!hasLinks) {
                                      // Pas de liens: déplacer la tâche dans cette section
                                      e.preventDefault()
                                      e.stopPropagation()
                                      // Retirer de l'ancienne section si elle était dans une
                                      if (sourceModule.parentId && sourceModule.parentSection) {
                                        setModules(prev => prev.map(m => {
                                          if (m.id === sourceModule.parentId) {
                                            const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                            const oldSection = sourceModule.parentSection!
                                            return {
                                              ...m,
                                              blockSections: {
                                                ...sections,
                                                [oldSection]: sections[oldSection].filter(id => id !== sourceId)
                                              }
                                            }
                                          }
                                          return m
                                        }))
                                      }

                                      // Ajouter à cette section
                                      addTaskToBlockSection(sourceId, module.id, 'always', relativeX, relativeY)
                                      // Send collaboration update for module move into block section
                                      collaborationCallbacks?.sendModuleMove?.({ moduleId: sourceId, x: relativeX, y: relativeY, parentId: module.id, parentSection: 'always' })
                                      return
                                    } else {
                                      // A des liens: créer un lien avec le block
                                      e.preventDefault()
                                      e.stopPropagation()
                                      createLink(getLinkTypeFromSource(sourceId), sourceId, module.id)
                                      return
                                    }
                                  }
                                }
                                // Cas 2: Nouveau module depuis la palette
                                else if (moduleData) {
                                  const parsedData = JSON.parse(moduleData)
                                  // Ne pas permettre de déposer un PLAY dans une section
                                  if (parsedData.name !== 'play') {
                                    e.preventDefault()
                                    e.stopPropagation()

                                    const isBlock = parsedData.name === 'block'

                                    // Ajuster l'offset et contraintes selon le type (block ou tâche)
                                    const dropOffsetX = isBlock ? 200 : offsetX
                                    const dropOffsetY = isBlock ? 150 : offsetY
                                    const itemWidth = isBlock ? 400 : taskWidth
                                    const itemHeight = isBlock ? 300 : taskHeight

                                    let adjustedX = e.clientX - sectionRect.left - dropOffsetX
                                    let adjustedY = e.clientY - sectionRect.top - dropOffsetY
                                    adjustedX = Math.max(0, Math.min(adjustedX, sectionRect.width - itemWidth))
                                    adjustedY = Math.max(0, Math.min(adjustedY, sectionRect.height - itemHeight))

                                    const newModuleId = `module-${Date.now()}-${Math.random().toString(36).substring(7)}`
                                    const newModule: ModuleBlock = {
                                      id: newModuleId,
                                      collection: parsedData.collection,
                                      name: parsedData.name,
                                      description: parsedData.description,
                                      taskName: isBlock ? 'Error Handling Block' : `Task with ${parsedData.name}`,
                                      x: adjustedX,
                                      y: adjustedY,
                                      parentId: module.id,
                                      parentSection: 'always',
                                      isBlock: isBlock,
                                      blockSections: isBlock ? { normal: [], rescue: [], always: [] } : undefined
                                    }
                                    setModules(prev => [...prev, newModule])

                                    // Ajouter à la section
                                    setModules(prev => prev.map(m => {
                                      if (m.id === module.id) {
                                        const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                                        return {
                                          ...m,
                                          blockSections: {
                                            ...sections,
                                            always: [...sections.always, newModule.id]
                                          }
                                        }
                                      }
                                      return m
                                    }))

                                    // Send collaboration update
                                    collaborationCallbacks?.sendModuleAdd?.({
                                      moduleId: newModuleId,
                                      module: newModule,
                                      position: { x: adjustedX, y: adjustedY }
                                    })
                                  }
                                }
                              }}
                              sx={{ position: 'relative', height: '100%', minHeight: 200, p: 0.5, bgcolor: 'rgba(76, 175, 80, 0.08)' }}
                            >
                              <BlockSectionContent
                                blockId={module.id}
                                section="always"
                                modules={modules}
                                selectedModuleId={selectedModuleId}
                                draggedModuleId={draggedModuleId}
                                collapsedBlocks={collapsedBlocks}
                                collapsedBlockSections={collapsedBlockSections}
                                resizingBlock={resizingBlock}
                                getStartChainCount={getStartChainCount}
                                onSelectModule={onSelectModule}
                                updateTaskName={updateTaskName}
                                toggleBlockCollapse={toggleBlockCollapse}
                                toggleBlockSection={toggleBlockSection}
                                isSectionCollapsed={isSectionCollapsed}
                                handleModuleDragStart={handleModuleDragStart}
                                handleModuleDragOver={handleModuleDragOver}
                                handleModuleDropOnModule={handleModuleDropOnModule}
                                handleBlockSectionDrop={handleBlockSectionDrop}
                                handleResizeStart={handleResizeStart}
                                getBlockTheme={getBlockTheme}
                                getBlockDimensions={getBlockDimensions}
                                getSectionColor={getSectionColor}
                                links={links}
                                getLinkStyle={getLinkStyle}
                                deleteLink={deleteLink}
                                hoveredLinkId={hoveredLinkId}
                                setHoveredLinkId={setHoveredLinkId}
                                getModuleOrVirtual={getModuleOrVirtual}
                                getModuleDimensions={getModuleDimensions}
                              />
                            </Box>
                          </Box>
                        )}
                          </>
                        )}
                      </Box>
                    )}

                    {/* Poignées de redimensionnement - 8 directions - seulement pour les blocks non collapsed */}
                    {!module.isPlay && !collapsedBlocks.has(module.id) && (
                      <ResizeHandles
                        blockId={module.id}
                        color="#1976d2"
                        resizingBlock={resizingBlock}
                        onResizeStart={handleResizeStart}
                      />
                    )}
                  </Paper>
                )
              } else {
                // Rendu d'une tâche normale
                const taskTheme = getTaskTheme(module.id)

                return (
                  <Paper
                    key={module.id}
                    className="module-block"
                    elevation={selectedModuleId === module.id ? 6 : 3}
                    onClick={() => onSelectModule({
                      id: module.id,
                      name: module.name,
                      collection: module.collection,
                      taskName: module.taskName,
                      when: module.when,
                      ignoreErrors: module.ignoreErrors,
                      become: module.become,
                      loop: module.loop,
                      delegateTo: module.delegateTo,
                      tags: module.tags,
                      isBlock: module.isBlock,
                      isPlay: module.isPlay,
                      moduleParameters: module.moduleParameters,
                      moduleSchema: module.moduleSchema,
                      validationState: module.validationState,
                      isSystem: module.isSystem,
                      description: module.description
                    })}
                    draggable
                    onDragStart={(e) => handleModuleDragStart(module.id, e)}
                    onDragOver={(e) => handleModuleDragOver(module.id, e)}
                    onDrop={(e) => !module.isSystem && handleModuleDropOnModule(module.id, e)}
                    sx={{
                      position: 'absolute',
                      left: module.x,
                      top: module.y,
                      width: 140,
                      minHeight: 60,
                      p: 0.75,
                      cursor: 'move',
                      border: selectedModuleId === module.id ? `2px solid ${taskTheme.borderColor}` : 'none',
                      zIndex: draggedModuleId === module.id ? 10 : 1,
                      opacity: draggedModuleId === module.id ? 0.7 : 1,
                      // Highlight effect for synced elements (user's color)
                      ...(highlightedElements.has(module.id) && {
                        boxShadow: `0 0 25px 8px ${highlightedElements.get(module.id)}99, 0 0 50px 15px ${highlightedElements.get(module.id)}66`,
                        border: `3px solid ${highlightedElements.get(module.id)}`,
                        transition: 'box-shadow 0.3s ease-in, border 0.3s ease-in',
                      }),
                      '&:hover': {
                        boxShadow: highlightedElements.has(module.id)
                          ? `0 0 25px 8px ${highlightedElements.get(module.id)}99, 0 0 50px 15px ${highlightedElements.get(module.id)}66`
                          : 6,
                      },
                    }}
                  >
                    {/* ID et nom de la tâche sur la même ligne */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Box
                        sx={{
                          minWidth: 18,
                          height: 18,
                          px: 0.5,
                          borderRadius: '4px',
                          bgcolor: taskTheme.numberBgColor,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '0.6rem',
                          flexShrink: 0,
                        }}
                      >
                        {modules.filter(m => !m.parentId && !m.parentSection).indexOf(module) + 1}
                      </Box>
                      <TextField
                        fullWidth
                        variant="standard"
                        value={module.taskName}
                        onChange={(e) => updateTaskName(module.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          '& .MuiInput-input': {
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            padding: '0',
                          },
                          '& .MuiInput-root:before': {
                            borderBottom: 'none',
                          },
                          '& .MuiInput-root:hover:not(.Mui-disabled):before': {
                            borderBottom: '1px solid rgba(0, 0, 0, 0.42)',
                          },
                        }}
                      />
                    </Box>

                    {/* Nom du module */}
                    <Typography variant="caption" sx={{ fontWeight: 'medium', color: taskTheme.moduleNameColor, display: 'block', fontSize: '0.55rem' }}>
                      {module.collection}.{module.name}
                    </Typography>

                    {/* Icônes d'attributs de tâche */}
                    <TaskAttributeIcons
                      attributes={{
                        when: module.when,
                        ignoreErrors: module.ignoreErrors,
                        become: module.become,
                        loop: module.loop,
                        delegateTo: module.delegateTo
                      }}
                      size="small"
                      sx={{ mt: 0.25, minHeight: 14 }}
                    />
                  </Paper>
                )
              }
            })}
          </>
        )}
      </Box>

      {/* Add/Edit Variable Dialog */}
      <AddVariableDialog
        open={addVariableDialogOpen}
        onClose={() => {
          setAddVariableDialogOpen(false)
          setEditingVariableIndex(null)
        }}
        onAdd={handleAddVariableFromDialog}
        existingKeys={currentPlay.variables.map(v => v.key)}
        editVariable={editingVariableIndex !== null ? currentPlay.variables[editingVariableIndex] : undefined}
      />
    </Box>
  )
}

export default WorkZone
