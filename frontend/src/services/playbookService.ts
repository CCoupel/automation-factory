import axios from 'axios'
import { getApiBaseUrl } from '../utils/apiConfig'

/**
 * Playbook content structure
 * This represents the complete state of the playbook editor
 */
export interface PlaybookContent {
  // Modules (tasks, blocks, etc.)
  modules: ModuleBlock[]

  // Links between modules
  links: Link[]

  // PLAY configurations
  plays: Play[]

  // Collapsed state
  collapsedBlocks: string[]
  collapsedBlockSections: string[]

  // Playbook metadata
  metadata: {
    playbookName?: string
    inventory?: string
    ansibleVersion?: string
  }

  // Variables
  variables: Variable[]
}

/**
 * System block type (for system-managed blocks)
 */
export type SystemBlockType = 'assertions'

/**
 * Module/Block/Task structure for API serialization
 * This is a flattened interface that can represent:
 * - UserBlock (regular user-editable blocks/tasks)
 * - SystemBlock (system-managed assertion blocks)
 * - SystemTask (tasks inside system blocks)
 */
export interface ModuleBlock {
  id: string
  collection: string
  name: string
  description?: string
  taskName?: string
  x: number
  y: number
  width?: number
  height?: number
  isBlock?: boolean
  isPlay?: boolean
  isSystem?: boolean         // System-managed block (non-editable, e.g. assertions)
  parentId?: string
  parentSection?: 'normal' | 'rescue' | 'always' | 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
  playId?: string // ID of the play this module belongs to
  blockSections?: {
    normal: string[]
    rescue: string[]
    always: string[]
  }
  // Task-level attributes (Ansible task keywords)
  when?: string              // Conditional execution
  loop?: string              // Loop over items
  ignoreErrors?: boolean     // Continue on error (ignore_errors)
  become?: boolean           // Privilege escalation
  delegateTo?: string        // Delegate to another host
  tags?: string[]            // Task tags for selective execution
  register?: string          // Store task result in a variable
  // Module parameters from Galaxy schema
  moduleParameters?: Record<string, any>
  // SystemBlock specific properties
  systemType?: SystemBlockType  // Type of system block (e.g. 'assertions')
  sourceVariable?: string       // Source variable for assertion blocks
}

export interface Link {
  id: string
  from: string
  to: string
  type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
}

/**
 * Role definition - can be a simple string or object with vars and enabled state
 * Note: enabled defaults to true if not specified
 */
export type RoleDefinition = string | { role: string; vars?: Record<string, any>; enabled?: boolean }

/**
 * Play attributes (stored in play.attributes)
 */
export interface PlayAttributes {
  hosts?: string
  remoteUser?: string
  connection?: string
  gatherFacts?: boolean
  become?: boolean
  roles?: RoleDefinition[]
}

export interface Play {
  id: string
  name: string
  hosts?: string
  gatherFacts?: boolean
  become?: boolean
  remoteUser?: string     // SSH user (remote_user in YAML)
  connection?: string     // Connection type (ssh, local, docker, etc.)
  attributes?: PlayAttributes  // Extended attributes including roles
}

export interface Variable {
  name: string
  value: string
  description?: string
  type?: string              // Variable type (string, int, bool, list, dict, or custom)
  required?: boolean         // Whether the variable is required
  defaultValue?: string      // Default value if not required
  regexp?: string            // Validation pattern (regexp or filter like | from_json)
}

/**
 * Playbook metadata (without full content)
 */
export interface Playbook {
  id: string
  name: string
  description?: string
  owner_id: string
  created_at: string
  updated_at: string
  // Additional fields for collaboration
  owner_username?: string
  user_role?: 'owner' | 'editor' | 'viewer'
  is_shared?: boolean
  // For owned playbooks: sharing info
  shared_with_count?: number
  shared_with_users?: string[]
}

/**
 * Detailed playbook (with full content)
 */
export interface PlaybookDetail extends Playbook {
  content: PlaybookContent
}

/**
 * Create playbook request
 */
export interface PlaybookCreate {
  name: string
  description?: string
  content: PlaybookContent
}

/**
 * Update playbook request
 */
export interface PlaybookUpdate {
  name?: string
  description?: string
  content?: PlaybookContent
}

/**
 * Transfer ownership request
 */
export interface PlaybookTransferOwnershipRequest {
  new_owner_username: string
  keep_access: boolean
}

/**
 * Transfer ownership response
 */
export interface PlaybookTransferOwnershipResponse {
  success: boolean
  new_owner_username: string
  old_owner_kept_access: boolean
}

/**
 * Get authorization header with JWT token
 */
function getAuthHeader(): { Authorization: string } | {} {
  const token = localStorage.getItem('authToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Playbook Service
 *
 * Handles API calls for playbook operations (CRUD)
 */
export const playbookService = {
  /**
   * List all playbooks for the current user
   *
   * @returns Promise with list of playbooks (without content)
   */
  async listPlaybooks(): Promise<Playbook[]> {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/playbooks`, {
        headers: getAuthHeader()
      })
      return response.data
    } catch (error: any) {
      console.error('List playbooks API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to list playbooks')
    }
  },

  /**
   * Get a specific playbook with full content
   *
   * @param playbookId - Playbook ID
   * @returns Promise with playbook details including content
   */
  async getPlaybook(playbookId: string): Promise<PlaybookDetail> {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/playbooks/${playbookId}`, {
        headers: getAuthHeader()
      })
      return response.data
    } catch (error: any) {
      console.error('Get playbook API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to get playbook')
    }
  },

  /**
   * Create a new playbook
   *
   * @param playbook - Playbook creation data
   * @returns Promise with created playbook
   */
  async createPlaybook(playbook: PlaybookCreate): Promise<PlaybookDetail> {
    try {
      const response = await axios.post(
        `${getApiBaseUrl()}/playbooks`,
        playbook,
        {
          headers: getAuthHeader()
        }
      )
      return response.data
    } catch (error: any) {
      console.error('Create playbook API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to create playbook')
    }
  },

  /**
   * Update an existing playbook
   *
   * @param playbookId - Playbook ID
   * @param updates - Fields to update
   * @returns Promise with updated playbook
   */
  async updatePlaybook(playbookId: string, updates: PlaybookUpdate): Promise<PlaybookDetail> {
    try {
      const response = await axios.put(
        `${getApiBaseUrl()}/playbooks/${playbookId}`,
        updates,
        {
          headers: getAuthHeader()
        }
      )
      return response.data
    } catch (error: any) {
      console.error('Update playbook API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to update playbook')
    }
  },

  /**
   * Delete a playbook
   *
   * @param playbookId - Playbook ID
   * @returns Promise that resolves when playbook is deleted
   */
  async deletePlaybook(playbookId: string): Promise<void> {
    try {
      await axios.delete(`${getApiBaseUrl()}/playbooks/${playbookId}`, {
        headers: getAuthHeader()
      })
    } catch (error: any) {
      console.error('Delete playbook API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to delete playbook')
    }
  },

  /**
   * Transfer playbook ownership to another user
   *
   * @param playbookId - Playbook ID
   * @param request - Transfer ownership request (new owner username, keep access)
   * @returns Promise with transfer result
   */
  async transferOwnership(
    playbookId: string,
    request: PlaybookTransferOwnershipRequest
  ): Promise<PlaybookTransferOwnershipResponse> {
    try {
      const response = await axios.post(
        `${getApiBaseUrl()}/playbooks/${playbookId}/transfer-ownership`,
        request,
        {
          headers: getAuthHeader()
        }
      )
      return response.data
    } catch (error: any) {
      console.error('Transfer ownership API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to transfer ownership')
    }
  }
}
