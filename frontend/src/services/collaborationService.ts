/**
 * Collaboration Service
 *
 * Handles API calls for playbook sharing and collaboration features.
 */

import { getHttpClient } from '../utils/httpClient'

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
   *
   * @param playbookId - Playbook ID to share
   * @param username - Username to share with
   * @param role - Role to assign (editor or viewer)
   * @returns Created share
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
    } catch (error: any) {
      console.error('Share playbook error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to share playbook')
    }
  },

  /**
   * Get list of shares for a playbook
   *
   * @param playbookId - Playbook ID
   * @returns List of shares
   */
  async getShares(playbookId: string): Promise<ShareListResponse> {
    try {
      console.log('📋 Getting shares for playbook:', playbookId)

      // Validate playbookId before making request
      if (!playbookId || playbookId === 'null' || playbookId === 'undefined') {
        console.error('❌ Invalid playbookId:', playbookId)
        throw new Error('Invalid playbook ID')
      }

      const http = getHttpClient()
      const response = await http.get(`/playbooks/${playbookId}/shares`)
      console.log('✅ Shares loaded:', response.data)
      return response.data
    } catch (error: any) {
      console.error('❌ Get shares error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        dataType: typeof error.response?.data,
        detail: error.response?.data?.detail,
        playbookId: playbookId,
        isAxiosError: error.isAxiosError,
        code: error.code
      })

      // Try to extract error message from response
      if (error.response?.data) {
        const data = error.response.data
        // Handle case where data is already an object with detail
        if (typeof data === 'object' && data.detail) {
          throw new Error(data.detail)
        }
        // Handle case where data is a string (might be stringified JSON)
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data)
            if (parsed.detail) {
              throw new Error(parsed.detail)
            }
          } catch {
            // Not JSON, use as-is if it looks like an error message
            if (data.length < 200) {
              throw new Error(data)
            }
          }
        }
      }

      // Use specific error message based on status code
      if (error.response?.status === 403) {
        throw new Error('Only the playbook owner can view shares')
      }
      if (error.response?.status === 404) {
        throw new Error('Playbook not found')
      }
      if (error.response?.status === 401) {
        throw new Error('Authentication required')
      }

      throw new Error('Failed to get shares')
    }
  },

  /**
   * Update a share's role
   *
   * @param playbookId - Playbook ID
   * @param shareId - Share ID
   * @param role - New role
   * @returns Updated share
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
    } catch (error: any) {
      console.error('Update share error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to update share')
    }
  },

  /**
   * Remove a share (unshare playbook)
   *
   * @param playbookId - Playbook ID
   * @param shareId - Share ID
   */
  async removeShare(playbookId: string, shareId: string): Promise<void> {
    try {
      const http = getHttpClient()
      await http.delete(`/playbooks/${playbookId}/shares/${shareId}`)
    } catch (error: any) {
      console.error('Remove share error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to remove share')
    }
  },

  /**
   * Get playbooks shared with the current user
   *
   * @returns List of shared playbooks
   */
  async getSharedWithMe(): Promise<SharedPlaybooksListResponse> {
    try {
      const http = getHttpClient()
      const response = await http.get('/playbooks/shared-with-me')
      return response.data
    } catch (error: any) {
      console.error('Get shared-with-me error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to get shared playbooks')
    }
  },

  /**
   * Get audit log for a playbook
   *
   * @param playbookId - Playbook ID
   * @param limit - Maximum entries to return
   * @returns List of audit log entries
   */
  async getAuditLog(playbookId: string, limit = 50): Promise<AuditLogListResponse> {
    try {
      const http = getHttpClient()
      const response = await http.get(`/playbooks/${playbookId}/audit-log`, {
        params: { limit }
      })
      return response.data
    } catch (error: any) {
      console.error('Get audit log error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to get audit log')
    }
  },

  /**
   * Get current presence (connected users) for a playbook via REST
   * This is useful for getting presence without WebSocket connection.
   *
   * @param playbookId - Playbook ID
   * @returns Presence info
   */
  async getPresence(playbookId: string): Promise<PresenceResponse> {
    try {
      const http = getHttpClient()
      const response = await http.get(`/ws/playbook/${playbookId}/presence`)
      return response.data
    } catch (error: any) {
      console.error('Get presence error:', error)
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
