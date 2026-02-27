import { getHttpClient } from '../utils/httpClient'

export interface GitFileChange {
  path: string
  status: string
}

export interface GitChangesResponse {
  changes: GitFileChange[]
  branch: string
  has_remote: boolean
}

export interface GitCommitResponse {
  commit_sha: string
  message: string
  files_changed: number
}

export interface GitPushResponse {
  pushed: boolean
  branch: string
  commit_sha: string
}

export interface GitBranchInfo {
  name: string
  is_current: boolean
  is_remote: boolean
}

export interface GitBranchListResponse {
  branches: GitBranchInfo[]
  current: string
}

export interface GitBranchSwitchResponse {
  branch: string
  artifacts_imported: number
  warnings: string[]
}

export const gitOperationsService = {
  async getChanges(projectId: string): Promise<GitChangesResponse> {
    try {
      const client = getHttpClient()
      const response = await client.get(`/projects/${projectId}/git/changes`)
      return response.data
    } catch (error: any) {
      console.error('Get git changes API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to get changes')
    }
  },

  async commit(projectId: string, message: string): Promise<GitCommitResponse> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/git/commit`, { message })
      return response.data
    } catch (error: any) {
      console.error('Git commit API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to commit changes')
    }
  },

  async push(projectId: string): Promise<GitPushResponse> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/git/push`)
      return response.data
    } catch (error: any) {
      console.error('Git push API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to push changes')
    }
  },

  async listBranches(projectId: string): Promise<GitBranchListResponse> {
    try {
      const client = getHttpClient()
      const response = await client.get(`/projects/${projectId}/git/branches`)
      return response.data
    } catch (error: any) {
      console.error('List branches API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to list branches')
    }
  },

  async createBranch(projectId: string, name: string): Promise<GitBranchInfo> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/git/branches`, { name })
      return response.data
    } catch (error: any) {
      console.error('Create branch API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to create branch')
    }
  },

  async switchBranch(projectId: string, name: string): Promise<GitBranchSwitchResponse> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/git/branches/switch`, { name })
      return response.data
    } catch (error: any) {
      console.error('Switch branch API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to switch branch')
    }
  },
}
