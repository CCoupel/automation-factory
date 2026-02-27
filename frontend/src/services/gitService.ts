import { getHttpClient } from '../utils/httpClient'
import type { Project } from './projectService'

export interface GitImportRequest {
  name: string
  description?: string
  git_url: string
  git_branch?: string
  git_credentials_id?: string
}

export interface GitImportArtifactSummary {
  path: string
  artifact_type: string
}

export interface GitImportResponse {
  project: Project
  artifacts: GitImportArtifactSummary[]
  warnings: string[]
}

export interface GitCredential {
  id: string
  user_id: string
  name: string
  provider: string
  has_token: boolean
  token_masked: string | null
  created_at: string
  updated_at: string
}

export interface GitCredentialCreate {
  name: string
  provider: string
  token: string
}

export const gitService = {
  async importFromGit(data: GitImportRequest): Promise<GitImportResponse> {
    try {
      const client = getHttpClient()
      const response = await client.post('/projects/import-git', data)
      return response.data
    } catch (error: any) {
      console.error('Git import API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to import project from Git')
    }
  },

  async listCredentials(): Promise<GitCredential[]> {
    try {
      const client = getHttpClient()
      const response = await client.get('/git-credentials')
      return response.data.credentials
    } catch (error: any) {
      console.error('List credentials API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to list credentials')
    }
  },

  async createCredential(data: GitCredentialCreate): Promise<GitCredential> {
    try {
      const client = getHttpClient()
      const response = await client.post('/git-credentials', data)
      return response.data
    } catch (error: any) {
      console.error('Create credential API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to create credential')
    }
  },

  async deleteCredential(id: string): Promise<void> {
    try {
      const client = getHttpClient()
      await client.delete(`/git-credentials/${id}`)
    } catch (error: any) {
      console.error('Delete credential API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to delete credential')
    }
  },
}
