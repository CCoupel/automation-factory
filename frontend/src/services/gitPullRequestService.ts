import { getHttpClient } from '../utils/httpClient'

export interface CreatePullRequestRequest {
  title: string
  description?: string
  target_branch?: string
  draft?: boolean
}

export interface PullRequestInfo {
  number: number
  title: string
  description: string | null
  url: string
  status: string
  source_branch: string
  target_branch: string
  created_at: string
  provider: string
}

export interface PullRequestListResponse {
  pull_requests: PullRequestInfo[]
}

export const gitPullRequestService = {
  async createPullRequest(projectId: string, request: CreatePullRequestRequest): Promise<PullRequestInfo> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/git/pull-request`, request)
      return response.data
    } catch (error: any) {
      console.error('Create PR API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to create pull request')
    }
  },

  async getPullRequest(projectId: string, prNumber: number): Promise<PullRequestInfo> {
    try {
      const client = getHttpClient()
      const response = await client.get(`/projects/${projectId}/git/pull-request/${prNumber}`)
      return response.data
    } catch (error: any) {
      console.error('Get PR API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to get pull request')
    }
  },

  async listPullRequests(projectId: string, state?: string): Promise<PullRequestListResponse> {
    try {
      const client = getHttpClient()
      const params = state ? { state } : {}
      const response = await client.get(`/projects/${projectId}/git/pull-requests`, { params })
      return response.data
    } catch (error: any) {
      console.error('List PRs API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to list pull requests')
    }
  },
}
