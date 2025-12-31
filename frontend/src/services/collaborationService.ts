/**
 * Collaboration Service
 *
 * Handles API calls for playbook sharing and collaboration features.
 */

import { getHttpClient } from '../utils/httpClient'
import { handleApiError } from '../utils/apiErrorHandler'

// === Types ===

export interface ShareUserInfo {
  id: string
  username: string
  email?: string
}

export interface PlaybookShare {
  id: string
  playbook_id: string
  user_id: string
  role: 'editor' | 'viewer'
  created_at: string
  created_by?: string
  user?: ShareUserInfo
}

export interface ShareListResponse {
  playbook_id: string
  shares: PlaybookShare[]
  total: number
}

export interface SharedPlaybook {
  id: string
  name: string
  description?: string
  owner_id: string
  owner_username: string
  role: 'editor' | 'viewer'
  version: number
  created_at: string
  updated_at: string
}

export interface SharedPlaybooksListResponse {
  playbooks: SharedPlaybook[]
  total: number
}

export interface AuditLogEntry {
  id: string
  playbook_id: string
  user_id?: string
  action: string
  details?: Record<string, unknown>
  created_at: string
  user?: {
    id: string
    username: string
  }
}

export interface AuditLogListResponse {
  playbook_id: string
  entries: AuditLogEntry[]
  total: number
}

export interface ConnectedUser {
  user_id: string
  username: string
  connected_at: string
}

export interface PresenceResponse {
  playbook_id: string
  users: ConnectedUser[]
  count: number
}

// === Service ===

export const collaborationService = {
  /**
   * Share a playbook with another user
   */
  async sharePlaybook(
    playbookId: string,
    username: string,
    role: 'editor' | 'viewer' = 'viewer'
  ): Promise<PlaybookShare> {
    try {
      const http = getHttpClient()
      const response = await http.post(`/playbooks/${playbookId}/shares`, {
        username,
        role
      })
      return response.data
    } catch (error) {
      handleApiError(error, 'Failed to share playbook', 'sharePlaybook')
    }
  },

  /**
   * Get list of shares for a playbook
   */
  async getShares(playbookId: string): Promise<ShareListResponse> {
    // Validate playbookId before making request
    if (!playbookId || playbookId === 'null' || playbookId === 'undefined') {
      throw new Error('Invalid playbook ID')
    }

    try {
      const http = getHttpClient()
      const response = await http.get(`/playbooks/${playbookId}/shares`)
      return response.data
    } catch (error) {
      handleApiError(error, 'Failed to get shares', 'getShares')
    }
  },

  /**
   * Update a share's role
   */
  async updateShare(
    playbookId: string,
    shareId: string,
    role: 'editor' | 'viewer'
  ): Promise<PlaybookShare> {
    try {
      const http = getHttpClient()
      const response = await http.put(`/playbooks/${playbookId}/shares/${shareId}`, {
        role
      })
      return response.data
    } catch (error) {
      handleApiError(error, 'Failed to update share', 'updateShare')
    }
  },

  /**
   * Remove a share (unshare playbook)
   */
  async removeShare(playbookId: string, shareId: string): Promise<void> {
    try {
      const http = getHttpClient()
      await http.delete(`/playbooks/${playbookId}/shares/${shareId}`)
    } catch (error) {
      handleApiError(error, 'Failed to remove share', 'removeShare')
    }
  },

  /**
   * Get playbooks shared with the current user
   */
  async getSharedWithMe(): Promise<SharedPlaybooksListResponse> {
    try {
      const http = getHttpClient()
      const response = await http.get('/playbooks/shared-with-me')
      return response.data
    } catch (error) {
      handleApiError(error, 'Failed to get shared playbooks', 'getSharedWithMe')
    }
  },

  /**
   * Get audit log for a playbook
   */
  async getAuditLog(playbookId: string, limit = 50): Promise<AuditLogListResponse> {
    try {
      const http = getHttpClient()
      const response = await http.get(`/playbooks/${playbookId}/audit-log`, {
        params: { limit }
      })
      return response.data
    } catch (error) {
      handleApiError(error, 'Failed to get audit log', 'getAuditLog')
    }
  },

  /**
   * Get current presence (connected users) for a playbook via REST
   * This is useful for getting presence without WebSocket connection.
   */
  async getPresence(playbookId: string): Promise<PresenceResponse> {
    try {
      const http = getHttpClient()
      const response = await http.get(`/ws/playbook/${playbookId}/presence`)
      return response.data
    } catch {
      // Don't throw for presence errors - just return empty
      return {
        playbook_id: playbookId,
        users: [],
        count: 0
      }
    }
  }
}

export default collaborationService
