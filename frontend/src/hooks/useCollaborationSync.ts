/**
 * useCollaborationSync - Real-time synchronization hook for playbook collaboration
 *
 * Provides:
 * - Debounced update sending (300ms)
 * - Typed update handlers for different playbook elements
 * - Update application to local state
 *
 * Update Types:
 * - module_add: New module added
 * - module_move: Module position changed
 * - module_delete: Module removed
 * - module_config: Module configuration changed
 * - link_add: New link created
 * - link_delete: Link removed
 * - play_update: Play metadata changed
 * - variable_add: New variable added
 * - variable_update: Variable changed
 * - variable_delete: Variable removed
 * - role_add: New role added
 * - role_delete: Role removed
 * - role_update: Roles list changed (reorder, toggle enabled)
 */

import { useCallback, useRef, useEffect } from 'react'
import { useCollaboration } from '../contexts/CollaborationContext'
import { PlaybookUpdate } from './usePlaybookWebSocket'
import { ModuleBlock, Link, PlayVariable } from '../types/playbook'

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 300

// Update types for type safety
export type UpdateType =
  | 'module_add'
  | 'module_move'
  | 'module_delete'
  | 'module_config'
  | 'module_resize'
  | 'link_add'
  | 'link_delete'
  | 'play_update'
  | 'variable_add'
  | 'variable_update'
  | 'variable_delete'
  | 'role_add'
  | 'role_delete'
  | 'role_update'
  | 'block_collapse'
  | 'section_collapse'

// Data interfaces for each update type - using actual types from playbook.ts
export interface ModuleAddData {
  moduleId: string
  module: ModuleBlock
  position: { x: number; y: number }
}

export interface ModuleMoveData {
  moduleId: string
  x: number
  y: number
  parentId?: string  // Block ID if moved into a block
  parentSection?: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'  // Section within block or play
}

export interface ModuleDeleteData {
  moduleId: string
}

export interface ModuleConfigData {
  moduleId: string
  field: string
  value: unknown
  element_id?: string
}

export interface ModuleResizeData {
  moduleId: string
  width: number
  height: number
  x: number
  y: number
}

export interface LinkAddData {
  link: Link
}

export interface LinkDeleteData {
  linkId: string
}

export interface PlayUpdateData {
  playId: string
  field: string
  value: unknown
}

export interface VariableAddData {
  playId: string
  variable: PlayVariable
}

export interface VariableUpdateData {
  playId: string
  variableIndex: number
  variable: PlayVariable
}

export interface VariableDeleteData {
  playId: string
  variableIndex: number
}

export interface RoleAddData {
  playId: string
  role: string | { role: string; vars?: Record<string, unknown>; enabled?: boolean }
}

export interface RoleDeleteData {
  playId: string
  roleIndex: number
}

export interface RoleUpdateData {
  playId: string
  roles: Array<string | { role: string; vars?: Record<string, unknown>; enabled?: boolean }>
}

export interface BlockCollapseData {
  blockId: string
  collapsed: boolean
}

export interface SectionCollapseData {
  key: string  // Format: "blockId:section" or "*:section"
  collapsed: boolean
}

// Union type for all update data
export type UpdateData =
  | ModuleAddData
  | ModuleMoveData
  | ModuleDeleteData
  | ModuleConfigData
  | ModuleResizeData
  | LinkAddData
  | LinkDeleteData
  | PlayUpdateData
  | VariableAddData
  | VariableUpdateData
  | VariableDeleteData
  | RoleAddData
  | RoleDeleteData
  | RoleUpdateData
  | BlockCollapseData
  | SectionCollapseData

// Handler type for applying updates
export type UpdateHandler = (update: PlaybookUpdate) => void

interface UseCollaborationSyncReturn {
  // Debounced update senders
  sendModuleAdd: (data: ModuleAddData) => void
  sendModuleMove: (data: ModuleMoveData) => void
  sendModuleDelete: (data: ModuleDeleteData) => void
  sendModuleConfig: (data: ModuleConfigData) => void
  sendModuleResize: (data: ModuleResizeData) => void
  sendLinkAdd: (data: LinkAddData) => void
  sendLinkDelete: (data: LinkDeleteData) => void
  sendPlayUpdate: (data: PlayUpdateData) => void
  sendVariableAdd: (data: VariableAddData) => void
  sendVariableUpdate: (data: VariableUpdateData) => void
  sendVariableDelete: (data: VariableDeleteData) => void
  sendRoleAdd: (data: RoleAddData) => void
  sendRoleDelete: (data: RoleDeleteData) => void
  sendRoleUpdate: (data: RoleUpdateData) => void
  sendBlockCollapse: (data: BlockCollapseData) => void
  sendSectionCollapse: (data: SectionCollapseData) => void

  // Generic sender with type
  sendUpdate: (updateType: UpdateType, data: UpdateData) => void

  // Connection state
  isConnected: boolean
}

export function useCollaborationSync(): UseCollaborationSyncReturn {
  const { sendUpdate: rawSendUpdate, isConnected } = useCollaboration()

  // Refs for debounce timers, keyed by update type + element id
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      debounceTimersRef.current.forEach(timer => clearTimeout(timer))
      debounceTimersRef.current.clear()
    }
  }, [])

  // Create debounced send function
  const debouncedSend = useCallback((
    updateType: UpdateType,
    data: UpdateData,
    debounceKey?: string
  ) => {
    const key = debounceKey || updateType

    // Clear existing timer for this key
    const existingTimer = debounceTimersRef.current.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      rawSendUpdate(updateType, data as unknown as Record<string, unknown>)
      debounceTimersRef.current.delete(key)
    }, DEBOUNCE_DELAY)

    debounceTimersRef.current.set(key, timer)
  }, [rawSendUpdate])

  // Immediate send (no debounce) for discrete actions
  const immediateSend = useCallback((updateType: UpdateType, data: UpdateData) => {
    console.log('[CollabSync] immediateSend:', updateType, 'isConnected:', isConnected)
    rawSendUpdate(updateType, data as unknown as Record<string, unknown>)
  }, [rawSendUpdate, isConnected])

  // Typed send functions
  const sendModuleAdd = useCallback((data: ModuleAddData) => {
    console.log('[CollabSync] sendModuleAdd called:', data.moduleId)
    // Module add is immediate (discrete action)
    immediateSend('module_add', data)
  }, [immediateSend])

  const sendModuleMove = useCallback((data: ModuleMoveData) => {
    console.log('[CollabSync] sendModuleMove called:', data.moduleId, data.x, data.y)
    // Module move is debounced (frequent during drag)
    debouncedSend('module_move', data, `module_move_${data.moduleId}`)
  }, [debouncedSend])

  const sendModuleDelete = useCallback((data: ModuleDeleteData) => {
    console.log('[CollabSync] sendModuleDelete called:', data.moduleId)
    // Module delete is immediate
    immediateSend('module_delete', data)
  }, [immediateSend])

  const sendModuleConfig = useCallback((data: ModuleConfigData) => {
    // Module config is debounced (typing)
    debouncedSend('module_config', data, `module_config_${data.moduleId}_${data.field}`)
  }, [debouncedSend])

  const sendModuleResize = useCallback((data: ModuleResizeData) => {
    console.log('[CollabSync] sendModuleResize called:', data.moduleId, data.width, data.height)
    // Module resize is immediate (sent at end of resize)
    immediateSend('module_resize', data)
  }, [immediateSend])

  const sendLinkAdd = useCallback((data: LinkAddData) => {
    // Link add is immediate
    immediateSend('link_add', data)
  }, [immediateSend])

  const sendLinkDelete = useCallback((data: LinkDeleteData) => {
    // Link delete is immediate
    immediateSend('link_delete', data)
  }, [immediateSend])

  const sendPlayUpdate = useCallback((data: PlayUpdateData) => {
    // Play update is debounced (typing)
    debouncedSend('play_update', data, `play_update_${data.playId}_${data.field}`)
  }, [debouncedSend])

  const sendVariableAdd = useCallback((data: VariableAddData) => {
    // Variable add is immediate (discrete action)
    immediateSend('variable_add', data)
  }, [immediateSend])

  const sendVariableUpdate = useCallback((data: VariableUpdateData) => {
    // Variable update is debounced
    debouncedSend('variable_update', data, `variable_update_${data.playId}_${data.variableIndex}`)
  }, [debouncedSend])

  const sendVariableDelete = useCallback((data: VariableDeleteData) => {
    // Variable delete is immediate
    immediateSend('variable_delete', data)
  }, [immediateSend])

  const sendRoleAdd = useCallback((data: RoleAddData) => {
    // Role add is immediate (discrete action)
    immediateSend('role_add', data)
  }, [immediateSend])

  const sendRoleDelete = useCallback((data: RoleDeleteData) => {
    // Role delete is immediate
    immediateSend('role_delete', data)
  }, [immediateSend])

  const sendRoleUpdate = useCallback((data: RoleUpdateData) => {
    // Role update (reorder, toggle enabled) is immediate
    immediateSend('role_update', data)
  }, [immediateSend])

  const sendBlockCollapse = useCallback((data: BlockCollapseData) => {
    // Block collapse is immediate
    immediateSend('block_collapse', data)
  }, [immediateSend])

  const sendSectionCollapse = useCallback((data: SectionCollapseData) => {
    // Section collapse is immediate
    immediateSend('section_collapse', data)
  }, [immediateSend])

  // Generic sender
  const sendUpdate = useCallback((updateType: UpdateType, data: UpdateData) => {
    // Determine if this type should be debounced
    const discreteTypes: UpdateType[] = [
      'module_add', 'module_delete', 'module_resize',
      'link_add', 'link_delete',
      'variable_add', 'variable_delete',
      'role_add', 'role_delete', 'role_update',
      'block_collapse', 'section_collapse'
    ]
    if (discreteTypes.includes(updateType)) {
      immediateSend(updateType, data)
    } else {
      debouncedSend(updateType, data)
    }
  }, [immediateSend, debouncedSend])

  return {
    sendModuleAdd,
    sendModuleMove,
    sendModuleDelete,
    sendModuleConfig,
    sendModuleResize,
    sendLinkAdd,
    sendLinkDelete,
    sendPlayUpdate,
    sendVariableAdd,
    sendVariableUpdate,
    sendVariableDelete,
    sendRoleAdd,
    sendRoleDelete,
    sendRoleUpdate,
    sendBlockCollapse,
    sendSectionCollapse,
    sendUpdate,
    isConnected
  }
}

/**
 * Utility function to apply an update to playbook state
 * This should be called in the component that manages playbook state
 *
 * Note: This is a generic helper - the actual application of updates
 * is done in WorkZone's applyCollaborationUpdate function which has
 * access to the proper types and state setters.
 */
export function applyPlaybookUpdate(
  update: PlaybookUpdate,
  currentState: {
    modules: ModuleBlock[]
    links: Link[]
    plays?: Array<{ id: string; [key: string]: unknown }>
    variables?: Array<{ id: string; [key: string]: unknown }>
  }
): {
  modules: ModuleBlock[]
  links: Link[]
  plays?: Array<{ id: string; [key: string]: unknown }>
  variables?: Array<{ id: string; [key: string]: unknown }>
} {
  const { update_type, data } = update
  const newState = { ...currentState }

  switch (update_type) {
    case 'module_add': {
      const addData = data as unknown as ModuleAddData
      newState.modules = [...currentState.modules, addData.module]
      break
    }

    case 'module_move': {
      const moveData = data as unknown as ModuleMoveData
      newState.modules = currentState.modules.map(m =>
        m.id === moveData.moduleId
          ? { ...m, x: moveData.x, y: moveData.y }
          : m
      )
      break
    }

    case 'module_delete': {
      const deleteData = data as unknown as ModuleDeleteData
      newState.modules = currentState.modules.filter(m => m.id !== deleteData.moduleId)
      // Also remove any links connected to this module
      newState.links = currentState.links.filter(
        l => l.from !== deleteData.moduleId && l.to !== deleteData.moduleId
      )
      break
    }

    case 'module_config': {
      const configData = data as unknown as ModuleConfigData
      newState.modules = currentState.modules.map(m => {
        if (m.id === configData.moduleId) {
          // Update the specific field in moduleParameters
          const updatedParams = { ...(m.moduleParameters || {}), [configData.field]: configData.value }
          return { ...m, moduleParameters: updatedParams }
        }
        return m
      })
      break
    }

    case 'link_add': {
      const linkData = data as unknown as LinkAddData
      newState.links = [...currentState.links, linkData.link]
      break
    }

    case 'link_delete': {
      const linkDeleteData = data as unknown as LinkDeleteData
      newState.links = currentState.links.filter(l => l.id !== linkDeleteData.linkId)
      break
    }

    case 'play_update': {
      const playData = data as unknown as PlayUpdateData
      if (currentState.plays) {
        newState.plays = currentState.plays.map(p =>
          p.id === playData.playId
            ? { ...p, [playData.field]: playData.value }
            : p
        )
      }
      break
    }

    case 'variable_add': {
      const varData = data as unknown as VariableAddData
      if (currentState.variables) {
        newState.variables = [...currentState.variables, varData.variable as unknown as typeof currentState.variables[0]]
      }
      break
    }

    case 'variable_update': {
      const varData = data as unknown as VariableUpdateData
      if (currentState.variables && varData.variableIndex >= 0 && varData.variableIndex < currentState.variables.length) {
        newState.variables = currentState.variables.map((v, i) =>
          i === varData.variableIndex ? { ...v, ...varData.variable } : v
        )
      }
      break
    }

    case 'variable_delete': {
      const varData = data as unknown as VariableDeleteData
      if (currentState.variables) {
        newState.variables = currentState.variables.filter((_, i) => i !== varData.variableIndex)
      }
      break
    }

    // Note: role_add, role_delete, role_update are handled by WorkZone directly via play_update
    // since roles are stored in play.attributes.roles

    default:
      console.warn(`Unknown update type: ${update_type}`)
  }

  return newState
}

export default useCollaborationSync
