import { getHttpClient } from '../utils/httpClient'

export interface FileSyncStatus {
  path: string
  artifact_type: string
  level: number
  auto_merged: boolean
  merged_content?: string | null
  base_content?: string | null
  local_content?: string | null
  remote_content?: string | null
  structural_diff?: Record<string, unknown> | null
}

export interface GitSyncResponse {
  status: 'up_to_date' | 'fast_forward' | 'auto_merged' | 'conflicts'
  auto_merged_files: FileSyncStatus[]
  conflicted_files: FileSyncStatus[]
  remote_ahead_by: number
  local_ahead_by: number
}

export interface FileResolution {
  path: string
  resolution: 'ours' | 'theirs' | 'custom'
  custom_content?: string | null
}

export interface ConflictResolveResponse {
  commit_sha: string
  files_resolved: number
  pushed: boolean
}

export const gitSyncService = {
  async sync(projectId: string): Promise<GitSyncResponse> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/git/sync`)
      return response.data
    } catch (error: any) {
      console.error('Git sync API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to sync with remote')
    }
  },

  async resolveConflicts(
    projectId: string,
    resolutions: FileResolution[],
    commitMessage: string,
    autoPush?: boolean,
  ): Promise<ConflictResolveResponse> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/git/conflicts/resolve`, {
        resolutions,
        commit_message: commitMessage,
        auto_push: autoPush ?? false,
      })
      return response.data
    } catch (error: any) {
      console.error('Conflict resolve API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to resolve conflicts')
    }
  },
}
