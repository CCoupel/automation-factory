import axios from 'axios'

/**
 * API base URL
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

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

export interface ModuleBlock {
  id: string
  collection: string
  name: string
  description?: string
  taskName?: string
  x: number
  y: number
  isBlock?: boolean
  isPlay?: boolean
  parentId?: string
  parentSection?: 'normal' | 'rescue' | 'always' | 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
  blockSections?: {
    normal: string[]
    rescue: string[]
    always: string[]
  }
  config?: Record<string, any>
}

export interface Link {
  id: string
  from: string
  to: string
  type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
}

export interface Play {
  id: string
  name: string
  hosts?: string
  gatherFacts?: boolean
  become?: boolean
}

export interface Variable {
  name: string
  value: string
  description?: string
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
      const response = await axios.get(`${API_BASE_URL}/playbooks`, {
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
      const response = await axios.get(`${API_BASE_URL}/playbooks/${playbookId}`, {
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
        `${API_BASE_URL}/playbooks`,
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
        `${API_BASE_URL}/playbooks/${playbookId}`,
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
      await axios.delete(`${API_BASE_URL}/playbooks/${playbookId}`, {
        headers: getAuthHeader()
      })
    } catch (error: any) {
      console.error('Delete playbook API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to delete playbook')
    }
  }
}
