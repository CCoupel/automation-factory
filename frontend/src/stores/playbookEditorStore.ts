import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { ModuleBlock, Link, PlayVariable, Play, PlayAttributes, ModuleSchema, VariableType, PlaySectionName } from '../types/playbook'
import { PlaybookContent } from '../services/playbookService'
import { PlaybookUpdate } from '../hooks/usePlaybookWebSocket'
import { CustomTypeInfo } from '../utils/assertionsGenerator'

// =====================================================
// Types
// =====================================================

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type SectionTab = 'roles' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'

export interface SelectedRole {
  index: number
  role: string
  vars?: Record<string, any>
}

// Module update fields used by ConfigZone
export interface ModuleUpdates {
  taskName?: string
  when?: string
  ignoreErrors?: boolean
  become?: boolean
  loop?: string
  delegateTo?: string
  tags?: string[]
  moduleParameters?: Record<string, any>
  moduleSchema?: ModuleSchema
  validationState?: { isValid: boolean; errors: string[]; warnings: string[]; lastValidated?: Date }
}

// =====================================================
// Helper to create START modules for a play
// =====================================================

export const createStartModulesForPlay = (playId: string): ModuleBlock[] => {
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

// Default initial play
const createDefaultPlay = (): Play => ({
  id: 'play-1',
  name: 'Play 1',
  modules: createStartModulesForPlay('play-1'),
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
})

// =====================================================
// Store State & Actions Interface
// =====================================================

interface PlaybookEditorState {
  // Core playbook data
  plays: Play[]
  activePlayIndex: number

  // Selection state
  selectedModuleId: string | null
  selectedRole: SelectedRole | null

  // Playbook metadata & persistence
  currentPlaybookId: string | null
  playbookName: string
  saveStatus: SaveStatus
  lastSavedAt: Date | null

  // UI state
  activeSectionTab: SectionTab
  gridEnabled: boolean
  draggedModuleId: string | null
  hoveredLinkId: string | null
  editingTabIndex: number | null
  collapsedBlocks: Set<string>
  collapsedBlockSections: Set<string>
  collapsedPlaySections: Set<string>
  highlightedElements: Map<string, string>
  resizingBlock: { id: string; startX: number; startY: number; startWidth: number; startHeight: number; startBlockX: number; startBlockY: number; direction: string } | null
  customTypes: CustomTypeInfo[]
}

interface PlaybookEditorActions {
  // Play management
  setPlays: (plays: Play[] | ((prev: Play[]) => Play[])) => void
  setActivePlayIndex: (index: number) => void
  addPlay: () => void
  removePlay: (index: number) => void
  renamePlay: (index: number, name: string) => void

  // Module/Link helpers for active play
  setModulesForActivePlay: (modules: ModuleBlock[] | ((prev: ModuleBlock[]) => ModuleBlock[])) => void
  setLinksForActivePlay: (links: Link[] | ((prev: Link[]) => Link[])) => void

  // Selection
  selectModule: (moduleId: string | null) => void
  selectRole: (role: SelectedRole | null) => void

  // Module operations
  updateModuleAttributes: (moduleId: string, updates: Partial<ModuleUpdates>) => void
  deleteModule: (moduleId: string) => void

  // Play attributes
  getPlayAttributes: () => PlayAttributes
  updatePlayAttributes: (updates: Partial<PlayAttributes>) => void

  // Roles
  getRoles: () => (string | { role: string; vars?: Record<string, any> })[]
  updateRole: (index: number, updates: { role?: string; vars?: Record<string, any> }) => void

  // Playbook metadata
  setCurrentPlaybookId: (id: string | null) => void
  setPlaybookName: (name: string) => void
  setSaveStatus: (status: SaveStatus) => void
  setLastSavedAt: (date: Date | null) => void

  // UI state setters
  setActiveSectionTab: (tab: SectionTab) => void
  setGridEnabled: (enabled: boolean) => void
  setDraggedModuleId: (id: string | null) => void
  setHoveredLinkId: (id: string | null) => void
  setEditingTabIndex: (index: number | null) => void
  setCollapsedBlocks: (blocks: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setCollapsedBlockSections: (sections: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setCollapsedPlaySections: (sections: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  setResizingBlock: (block: PlaybookEditorState['resizingBlock']) => void
  setCustomTypes: (types: CustomTypeInfo[]) => void
  setHighlightedElements: (elements: Map<string, string> | ((prev: Map<string, string>) => Map<string, string>)) => void

  // Toggle helpers (used by canvas components directly)
  toggleBlockCollapse: (blockId: string) => void
  toggleBlockSection: (blockId: string, section: 'normal' | 'rescue' | 'always') => void
  togglePlaySection: (playId: string, section: PlaySectionName) => void
  isSectionCollapsed: (blockId: string, section: 'normal' | 'rescue' | 'always') => boolean
  isPlaySectionCollapsed: (playId: string, section: PlaySectionName) => boolean

  // Highlight helper
  highlightElement: (elementId: string, userId: string, durationMs: number) => void

  // Serialization
  serializePlaybookContent: () => PlaybookContent

  // Bulk state loading (for loadPlaybook / cache restore)
  loadPlaybookState: (state: {
    plays: Play[]
    currentPlaybookId: string | null
    playbookName: string
    collapsedBlocks?: string[]
    collapsedBlockSections?: string[]
  }) => void

  // Collaboration
  applyCollaborationUpdate: (update: PlaybookUpdate) => void

  // Reset
  resetStore: () => void
}

export type PlaybookEditorStore = PlaybookEditorState & PlaybookEditorActions

// =====================================================
// User color helper (same as WorkZone)
// =====================================================

const getUserColor = (userId: string): string => {
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
}

// =====================================================
// Initial state
// =====================================================

const initialState: PlaybookEditorState = {
  plays: [createDefaultPlay()],
  activePlayIndex: 0,
  selectedModuleId: null,
  selectedRole: null,
  currentPlaybookId: null,
  playbookName: 'Untitled Playbook',
  saveStatus: 'idle',
  lastSavedAt: null,
  activeSectionTab: 'tasks',
  gridEnabled: false,
  draggedModuleId: null,
  hoveredLinkId: null,
  editingTabIndex: null,
  collapsedBlocks: new Set(),
  collapsedBlockSections: new Set(['*:rescue', '*:always']),
  collapsedPlaySections: new Set(['*:pre_tasks', '*:post_tasks', '*:handlers']),
  highlightedElements: new Map(),
  resizingBlock: null,
  customTypes: [],
}

// =====================================================
// Store
// =====================================================

export const usePlaybookEditorStore = create<PlaybookEditorStore>((set, get) => ({
  ...initialState,

  // --------------------------------------------------
  // Play management
  // --------------------------------------------------

  setPlays: (playsOrFn) => {
    set(state => ({
      plays: typeof playsOrFn === 'function' ? playsOrFn(state.plays) : playsOrFn,
    }))
  },

  setActivePlayIndex: (index) => set({ activePlayIndex: index }),

  addPlay: () => {
    set(state => {
      const newIndex = state.plays.length + 1
      const playId = `play-${Date.now()}`
      const newPlay: Play = {
        id: playId,
        name: `Play ${newIndex}`,
        modules: createStartModulesForPlay(playId),
        links: [],
        variables: [],
        attributes: {
          hosts: 'all',
          gatherFacts: true,
          become: false,
          connection: 'ssh',
          roles: [],
        },
      }
      return {
        plays: [...state.plays, newPlay],
        activePlayIndex: state.plays.length,
      }
    })
  },

  removePlay: (index) => {
    set(state => {
      if (state.plays.length <= 1) return state
      const newPlays = state.plays.filter((_, i) => i !== index)
      const newIndex = state.activePlayIndex >= newPlays.length
        ? newPlays.length - 1
        : state.activePlayIndex > index
          ? state.activePlayIndex - 1
          : state.activePlayIndex
      return { plays: newPlays, activePlayIndex: newIndex }
    })
  },

  renamePlay: (index, name) => {
    set(state => {
      const newPlays = [...state.plays]
      newPlays[index] = { ...newPlays[index], name }
      return { plays: newPlays }
    })
  },

  // --------------------------------------------------
  // Module/Link helpers for active play
  // --------------------------------------------------

  setModulesForActivePlay: (modulesOrFn) => {
    set(state => {
      const idx = state.activePlayIndex
      const newPlays = [...state.plays]
      newPlays[idx] = {
        ...newPlays[idx],
        modules: typeof modulesOrFn === 'function'
          ? modulesOrFn(newPlays[idx].modules)
          : modulesOrFn,
      }
      return { plays: newPlays }
    })
  },

  setLinksForActivePlay: (linksOrFn) => {
    set(state => {
      const idx = state.activePlayIndex
      const newPlays = [...state.plays]
      newPlays[idx] = {
        ...newPlays[idx],
        links: typeof linksOrFn === 'function'
          ? linksOrFn(newPlays[idx].links)
          : linksOrFn,
      }
      return { plays: newPlays }
    })
  },

  // --------------------------------------------------
  // Selection (mutual exclusion)
  // --------------------------------------------------

  selectModule: (moduleId) => {
    set({
      selectedModuleId: moduleId,
      selectedRole: moduleId ? null : get().selectedRole,
    })
  },

  selectRole: (role) => {
    set({
      selectedRole: role,
      selectedModuleId: role ? null : get().selectedModuleId,
    })
  },

  // --------------------------------------------------
  // Module operations
  // --------------------------------------------------

  updateModuleAttributes: (moduleId, updates) => {
    set(state => {
      const idx = state.activePlayIndex
      const newPlays = [...state.plays]
      newPlays[idx] = {
        ...newPlays[idx],
        modules: newPlays[idx].modules.map(m =>
          m.id === moduleId ? { ...m, ...updates } : m
        ),
      }
      return { plays: newPlays }
    })
  },

  deleteModule: (moduleId) => {
    set(state => {
      const idx = state.activePlayIndex
      const newPlays = [...state.plays]
      const play = newPlays[idx]

      // Remove module and clean up parent blockSections references
      const updatedModules = play.modules
        .filter(m => m.id !== moduleId)
        .map(m => {
          if (m.isBlock && m.blockSections) {
            return {
              ...m,
              blockSections: {
                normal: m.blockSections.normal.filter(id => id !== moduleId),
                rescue: m.blockSections.rescue.filter(id => id !== moduleId),
                always: m.blockSections.always.filter(id => id !== moduleId),
              }
            }
          }
          return m
        })

      // Remove associated links
      const updatedLinks = play.links.filter(l => l.from !== moduleId && l.to !== moduleId)

      newPlays[idx] = { ...play, modules: updatedModules, links: updatedLinks }

      // Deselect if this was the selected module
      const newSelectedModuleId = state.selectedModuleId === moduleId ? null : state.selectedModuleId

      return { plays: newPlays, selectedModuleId: newSelectedModuleId }
    })
  },

  // --------------------------------------------------
  // Play attributes
  // --------------------------------------------------

  getPlayAttributes: () => {
    const state = get()
    const play = state.plays[state.activePlayIndex]
    return play?.attributes || {}
  },

  updatePlayAttributes: (updates) => {
    set(state => {
      const idx = state.activePlayIndex
      const newPlays = [...state.plays]
      newPlays[idx] = {
        ...newPlays[idx],
        attributes: { ...newPlays[idx].attributes, ...updates },
      }
      return { plays: newPlays }
    })
  },

  // --------------------------------------------------
  // Roles
  // --------------------------------------------------

  getRoles: () => {
    const state = get()
    const play = state.plays[state.activePlayIndex]
    return (play?.attributes?.roles || []) as (string | { role: string; vars?: Record<string, any> })[]
  },

  updateRole: (index, updates) => {
    set(state => {
      const idx = state.activePlayIndex
      const play = state.plays[idx]
      const roles = [...(play.attributes?.roles || [])]

      if (index >= 0 && index < roles.length) {
        const current = roles[index]
        if (typeof current === 'string') {
          roles[index] = { role: updates.role || current, vars: updates.vars }
        } else {
          roles[index] = { ...current, ...updates }
        }
      }

      const newPlays = [...state.plays]
      newPlays[idx] = {
        ...play,
        attributes: { ...play.attributes, roles },
      }
      return { plays: newPlays }
    })
  },

  // --------------------------------------------------
  // Playbook metadata
  // --------------------------------------------------

  setCurrentPlaybookId: (id) => set({ currentPlaybookId: id }),
  setPlaybookName: (name) => set({ playbookName: name }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setLastSavedAt: (date) => set({ lastSavedAt: date }),

  // --------------------------------------------------
  // UI state setters
  // --------------------------------------------------

  setActiveSectionTab: (tab) => set({ activeSectionTab: tab }),
  setGridEnabled: (enabled) => set({ gridEnabled: enabled }),
  setDraggedModuleId: (id) => set({ draggedModuleId: id }),
  setHoveredLinkId: (id) => set({ hoveredLinkId: id }),
  setEditingTabIndex: (index) => set({ editingTabIndex: index }),

  setCollapsedBlocks: (blocksOrFn) => {
    set(state => ({
      collapsedBlocks: typeof blocksOrFn === 'function' ? blocksOrFn(state.collapsedBlocks) : blocksOrFn,
    }))
  },

  setCollapsedBlockSections: (sectionsOrFn) => {
    set(state => ({
      collapsedBlockSections: typeof sectionsOrFn === 'function' ? sectionsOrFn(state.collapsedBlockSections) : sectionsOrFn,
    }))
  },

  setCollapsedPlaySections: (sectionsOrFn) => {
    set(state => ({
      collapsedPlaySections: typeof sectionsOrFn === 'function' ? sectionsOrFn(state.collapsedPlaySections) : sectionsOrFn,
    }))
  },

  setResizingBlock: (block) => set({ resizingBlock: block }),
  setCustomTypes: (types) => set({ customTypes: types }),

  setHighlightedElements: (elementsOrFn) => {
    set(state => ({
      highlightedElements: typeof elementsOrFn === 'function' ? elementsOrFn(state.highlightedElements) : elementsOrFn,
    }))
  },

  // --------------------------------------------------
  // Toggle helpers
  // --------------------------------------------------

  toggleBlockCollapse: (blockId) => {
    set(state => {
      const newSet = new Set(state.collapsedBlocks)
      if (newSet.has(blockId)) {
        newSet.delete(blockId)
      } else {
        newSet.add(blockId)
      }
      return { collapsedBlocks: newSet }
    })
  },

  toggleBlockSection: (blockId, section) => {
    set(state => {
      const newSet = new Set(state.collapsedBlockSections)
      const key = `${blockId}:${section}`
      const wildcardKey = `*:${section}`
      const isCurrentlyCollapsed = newSet.has(key) || newSet.has(wildcardKey)

      if (isCurrentlyCollapsed) {
        const otherSections: Array<'normal' | 'rescue' | 'always'> = ['normal', 'rescue', 'always']
        otherSections.forEach(s => {
          newSet.delete(`*:${s}`)
          newSet.add(`${blockId}:${s}`)
        })
        newSet.delete(wildcardKey)
        newSet.delete(key)
      } else {
        newSet.add(key)
      }

      return { collapsedBlockSections: newSet }
    })
  },

  togglePlaySection: (playId, section) => {
    set(state => {
      const newSet = new Set(state.collapsedPlaySections)
      const key = `${playId}:${section}`
      const wildcardKey = `*:${section}`

      if (section === 'variables' || section === 'roles') {
        newSet.delete(wildcardKey)
        if (newSet.has(key)) {
          newSet.delete(key)
        } else {
          newSet.add(key)
        }
        return { collapsedPlaySections: newSet }
      }

      const isCurrentlyCollapsed = newSet.has(key) || newSet.has(wildcardKey)

      if (isCurrentlyCollapsed) {
        const taskSections: Array<'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'> = ['pre_tasks', 'tasks', 'post_tasks', 'handlers']
        taskSections.forEach(s => {
          newSet.delete(`*:${s}`)
          newSet.add(`${playId}:${s}`)
        })
        newSet.delete(wildcardKey)
        newSet.delete(key)
      }

      return { collapsedPlaySections: newSet }
    })
  },

  isSectionCollapsed: (blockId, section) => {
    const state = get()
    const key = `${blockId}:${section}`
    const wildcardKey = `*:${section}`
    return state.collapsedBlockSections.has(key) || state.collapsedBlockSections.has(wildcardKey)
  },

  isPlaySectionCollapsed: (playId, section) => {
    const state = get()
    const key = `${playId}:${section}`
    const wildcardKey = `*:${section}`
    return state.collapsedPlaySections.has(key) || state.collapsedPlaySections.has(wildcardKey)
  },

  // --------------------------------------------------
  // Highlight helper
  // --------------------------------------------------

  highlightElement: (elementId, userId, durationMs) => {
    const color = getUserColor(userId)
    set(state => {
      const newMap = new Map(state.highlightedElements)
      newMap.set(elementId, color)
      return { highlightedElements: newMap }
    })
    setTimeout(() => {
      set(state => {
        const newMap = new Map(state.highlightedElements)
        newMap.delete(elementId)
        return { highlightedElements: newMap }
      })
    }, durationMs)
  },

  // --------------------------------------------------
  // Serialization
  // --------------------------------------------------

  serializePlaybookContent: (): PlaybookContent => {
    const state = get()
    const { plays, collapsedBlocks, collapsedBlockSections, playbookName } = state

    const allModules: ModuleBlock[] = plays.flatMap(play =>
      play.modules.map(m => ({ ...m, playId: play.id }))
    )
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
        attributes: play.attributes,
      })),
      collapsedBlocks: Array.from(collapsedBlocks),
      collapsedBlockSections: Array.from(collapsedBlockSections),
      metadata: {
        playbookName,
      },
      variables: plays.flatMap(play =>
        play.variables.map(v => ({
          name: v.key,
          value: v.value,
          type: v.type,
          required: v.required,
          defaultValue: v.defaultValue,
          regexp: v.regexp,
        }))
      ),
    }
  },

  // --------------------------------------------------
  // Bulk state loading
  // --------------------------------------------------

  loadPlaybookState: (loaded) => {
    set({
      plays: loaded.plays.length > 0 ? loaded.plays : initialState.plays,
      currentPlaybookId: loaded.currentPlaybookId,
      playbookName: loaded.playbookName,
      activePlayIndex: 0,
      selectedModuleId: null,
      selectedRole: null,
      collapsedBlocks: new Set(loaded.collapsedBlocks || []),
      collapsedBlockSections: new Set(loaded.collapsedBlockSections || ['*:rescue', '*:always']),
    })
  },

  // --------------------------------------------------
  // Collaboration update handler
  // --------------------------------------------------

  applyCollaborationUpdate: (update: PlaybookUpdate) => {
    const { update_type, data, user_id } = update

    switch (update_type) {
      case 'module_add': {
        const { module } = data as { module: ModuleBlock }

        if (module.isBlock) {
          set(state => {
            const newSet = new Set(state.collapsedBlockSections)
            newSet.add(`${module.id}:rescue`)
            newSet.add(`${module.id}:always`)
            return { collapsedBlockSections: newSet }
          })
        }

        const isBlockSection = (s?: string): s is 'normal' | 'rescue' | 'always' =>
          s === 'normal' || s === 'rescue' || s === 'always'

        if (module.parentId && module.parentSection && isBlockSection(module.parentSection)) {
          const section = module.parentSection
          get().setModulesForActivePlay(prev => {
            const withNewModule = [...prev, module]
            return withNewModule.map(m => {
              if (m.id === module.parentId && m.isBlock) {
                const sections = m.blockSections || { normal: [], rescue: [], always: [] }
                if (!sections[section]?.includes(module.id)) {
                  return {
                    ...m,
                    blockSections: {
                      ...sections,
                      [section]: [...(sections[section] || []), module.id],
                    },
                  }
                }
              }
              return m
            })
          })
        } else {
          get().setModulesForActivePlay(prev => [...prev, module])
        }
        get().highlightElement(module.id, user_id, 3000)
        break
      }

      case 'module_move': {
        type BlockSectionType = 'normal' | 'rescue' | 'always'
        type ParentSectionType = 'normal' | 'rescue' | 'always' | 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
        const { moduleId, x, y, parentId, parentSection } = data as {
          moduleId: string; x: number; y: number
          parentId?: string; parentSection?: ParentSectionType
        }

        const isBlockSection = (section?: string): section is BlockSectionType =>
          section === 'normal' || section === 'rescue' || section === 'always'

        get().setModulesForActivePlay(prev => {
          const movedModule = prev.find(m => m.id === moduleId)
          if (!movedModule) return prev

          const oldParentId = movedModule.parentId
          const oldSection = movedModule.parentSection as BlockSectionType | undefined

          return prev.map(m => {
            let updated = { ...m }
            let hasChanges = false

            if (oldParentId && m.id === oldParentId && oldSection && isBlockSection(oldSection)) {
              const sections = m.blockSections || { normal: [], rescue: [], always: [] }
              if (sections[oldSection]?.includes(moduleId)) {
                updated = {
                  ...updated,
                  blockSections: {
                    ...sections,
                    [oldSection]: sections[oldSection].filter((id: string) => id !== moduleId),
                  },
                }
                hasChanges = true
              }
            }

            if (parentId && m.id === parentId && m.isBlock && parentSection && isBlockSection(parentSection)) {
              const sections = updated.blockSections || { normal: [], rescue: [], always: [] }
              if (!sections[parentSection]?.includes(moduleId)) {
                updated = {
                  ...updated,
                  blockSections: {
                    ...sections,
                    [parentSection]: [...(sections[parentSection] || []), moduleId],
                  },
                }
                hasChanges = true
              }
            }

            if (m.id === moduleId) {
              updated = {
                ...updated,
                x,
                y,
                ...(parentId !== undefined && { parentId }),
                ...(parentSection !== undefined && { parentSection }),
              }
              hasChanges = true
            }

            return hasChanges ? updated : m
          })
        })
        get().highlightElement(moduleId, user_id, 3000)
        break
      }

      case 'module_delete': {
        const { moduleId } = data as { moduleId: string }
        get().setModulesForActivePlay(prev => prev.filter(m => m.id !== moduleId))
        get().setLinksForActivePlay(prev => prev.filter(l => l.from !== moduleId && l.to !== moduleId))
        break
      }

      case 'module_config': {
        const { moduleId, field, value } = data as { moduleId: string; field: string; value: unknown }
        const directFields = ['taskName', 'when', 'loop', 'tags', 'delegateTo', 'ignoreErrors', 'become']

        get().setModulesForActivePlay(prev =>
          prev.map(m => {
            if (m.id === moduleId) {
              if (directFields.includes(field)) {
                return { ...m, [field]: value }
              } else {
                return { ...m, moduleParameters: { ...(m.moduleParameters || {}), [field]: value } }
              }
            }
            return m
          })
        )
        get().highlightElement(moduleId, user_id, 3000)
        break
      }

      case 'module_resize': {
        const { moduleId, width, height, x, y } = data as { moduleId: string; width: number; height: number; x: number; y: number }
        get().setModulesForActivePlay(prev =>
          prev.map(m => m.id === moduleId ? { ...m, width, height, x, y } : m)
        )
        get().highlightElement(moduleId, user_id, 3000)
        break
      }

      case 'link_add': {
        const { link } = data as { link: Link }
        get().setLinksForActivePlay(prev => [...prev, link])
        get().highlightElement(link.from, user_id, 3000)
        get().highlightElement(link.to, user_id, 3000)
        break
      }

      case 'link_delete': {
        const { linkId } = data as { linkId: string }
        get().setLinksForActivePlay(prev => prev.filter(l => l.id !== linkId))
        break
      }

      case 'play_update': {
        const { playId, field, value } = data as { playId: string; field: string; value: unknown }
        const attributeFields = ['hosts', 'remoteUser', 'connection', 'gatherFacts', 'become', 'roles']
        set(state => ({
          plays: state.plays.map(p => {
            if (p.id === playId) {
              if (attributeFields.includes(field)) {
                return { ...p, attributes: { ...(p.attributes || {}), [field]: value } }
              } else {
                return { ...p, [field]: value }
              }
            }
            return p
          }),
        }))
        break
      }

      case 'variable_add': {
        const { playId, variable } = data as { playId: string; variable: PlayVariable }
        set(state => ({
          plays: state.plays.map(p =>
            p.id === playId ? { ...p, variables: [...p.variables, variable] } : p
          ),
        }))
        break
      }

      case 'variable_update': {
        const { playId, variableIndex, variable } = data as { playId: string; variableIndex: number; variable: PlayVariable }
        set(state => ({
          plays: state.plays.map(p => {
            if (p.id === playId && variableIndex >= 0 && variableIndex < p.variables.length) {
              const newVars = [...p.variables]
              newVars[variableIndex] = variable
              return { ...p, variables: newVars }
            }
            return p
          }),
        }))
        break
      }

      case 'variable_delete': {
        const { playId, variableIndex } = data as { playId: string; variableIndex: number }
        set(state => ({
          plays: state.plays.map(p =>
            p.id === playId ? { ...p, variables: p.variables.filter((_, i) => i !== variableIndex) } : p
          ),
        }))
        break
      }

      case 'role_add': {
        const { playId, role } = data as { playId: string; role: string | { role: string; vars?: Record<string, unknown>; enabled?: boolean } }
        set(state => ({
          plays: state.plays.map(p => {
            if (p.id === playId) {
              const currentRoles = p.attributes?.roles || []
              return { ...p, attributes: { ...p.attributes, roles: [...currentRoles, role] } }
            }
            return p
          }),
        }))
        break
      }

      case 'role_delete': {
        const { playId, roleIndex } = data as { playId: string; roleIndex: number }
        set(state => ({
          plays: state.plays.map(p => {
            if (p.id === playId) {
              const currentRoles = p.attributes?.roles || []
              return { ...p, attributes: { ...p.attributes, roles: currentRoles.filter((_, i) => i !== roleIndex) } }
            }
            return p
          }),
        }))
        break
      }

      case 'role_update': {
        const { playId, roles } = data as { playId: string; roles: Array<string | { role: string; vars?: Record<string, unknown>; enabled?: boolean }> }
        set(state => ({
          plays: state.plays.map(p =>
            p.id === playId ? { ...p, attributes: { ...p.attributes, roles } } : p
          ),
        }))
        break
      }

      case 'block_collapse': {
        const { blockId, collapsed } = data as { blockId: string; collapsed: boolean }
        set(state => {
          const newSet = new Set(state.collapsedBlocks)
          if (collapsed) {
            newSet.add(blockId)
          } else {
            newSet.delete(blockId)
          }
          return { collapsedBlocks: newSet }
        })
        get().highlightElement(blockId, user_id, 3000)
        break
      }

      default:
        console.warn(`[PlaybookEditorStore] Unknown update type: ${update_type}`)
    }
  },

  // --------------------------------------------------
  // Reset
  // --------------------------------------------------

  resetStore: () => set({ ...initialState }),
}))

// =====================================================
// Selectors (hook-style for granular subscriptions)
// =====================================================

export const useCurrentPlay = () =>
  usePlaybookEditorStore(useShallow(state => state.plays[state.activePlayIndex] || state.plays[0]))

export const useSelectedModuleData = () =>
  usePlaybookEditorStore(useShallow(state => {
    if (!state.selectedModuleId) return null
    const play = state.plays[state.activePlayIndex] || state.plays[0]
    return play?.modules.find(m => m.id === state.selectedModuleId) || null
  }))

export const usePlayAttributes = () =>
  usePlaybookEditorStore(useShallow(state => {
    const play = state.plays[state.activePlayIndex]
    return play?.attributes || {}
  }))

export const useSaveInfo = () =>
  usePlaybookEditorStore(useShallow(state => ({
    saveStatus: state.saveStatus,
    playbookName: state.playbookName,
    playbookId: state.currentPlaybookId,
  })))

export const useActivePlayId = () =>
  usePlaybookEditorStore(state => {
    const play = state.plays[state.activePlayIndex]
    return play?.id || null
  })
