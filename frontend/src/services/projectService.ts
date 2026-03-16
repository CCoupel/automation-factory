import axios from 'axios'
import { getHttpClient } from '../utils/httpClient'

export interface Project {
  id: string
  name: string
  description: string | null
  owner_id: string
  git_url: string | null
  git_branch: string | null
  git_credentials_id: string | null
  settings: Record<string, unknown> | null
  created_at: string
  updated_at: string
  owner_username: string | null
  user_role: string | null
  is_shared: boolean
}

export interface ProjectArtifact {
  id: string
  project_id: string
  artifact_type: string
  path: string
  content: Record<string, unknown> | null
  raw_content: string | null
  version: number
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ProjectCreate {
  name: string
  description?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string
  git_url?: string | null
  git_branch?: string | null
  settings?: Record<string, unknown> | null
}

export interface ProjectArtifactCreate {
  artifact_type: string
  path: string
  content?: Record<string, unknown> | null
  raw_content?: string | null
  metadata?: Record<string, unknown> | null
}

export interface ProjectArtifactUpdate {
  artifact_type?: string
  path?: string
  content?: Record<string, unknown> | null
  raw_content?: string | null
  metadata?: Record<string, unknown> | null
}

export const projectService = {
  async listProjects(): Promise<Project[]> {
    try {
      const client = getHttpClient()
      const response = await client.get('/projects')
      return response.data.projects
    } catch (error: unknown) {
      console.error('List projects API error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to list projects')
    }
  },

  async createProject(data: ProjectCreate): Promise<Project> {
    try {
      const client = getHttpClient()
      const response = await client.post('/projects', data)
      return response.data
    } catch (error: unknown) {
      console.error('Create project API error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to create project')
    }
  },

  async getProject(id: string): Promise<Project> {
    try {
      const client = getHttpClient()
      const response = await client.get(`/projects/${id}`)
      return response.data
    } catch (error: unknown) {
      console.error('Get project API error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to get project')
    }
  },

  async updateProject(id: string, data: ProjectUpdate): Promise<Project> {
    try {
      const client = getHttpClient()
      const response = await client.put(`/projects/${id}`, data)
      return response.data
    } catch (error: unknown) {
      console.error('Update project API error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to update project')
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      const client = getHttpClient()
      await client.delete(`/projects/${id}`)
    } catch (error: unknown) {
      console.error('Delete project API error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to delete project')
    }
  },

  async listArtifacts(projectId: string): Promise<ProjectArtifact[]> {
    try {
      const client = getHttpClient()
      const response = await client.get(`/projects/${projectId}/artifacts`)
      return response.data.artifacts
    } catch (error: unknown) {
      console.error('List artifacts API error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to list artifacts')
    }
  },

  async getArtifact(projectId: string, artifactId: string): Promise<ProjectArtifact> {
    try {
      const client = getHttpClient()
      const response = await client.get(`/projects/${projectId}/artifacts/${artifactId}`)
      return response.data
    } catch (error: unknown) {
      console.error('Get artifact API error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to get artifact')
    }
  },

  async createArtifact(projectId: string, data: ProjectArtifactCreate): Promise<ProjectArtifact> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/artifacts`, data)
      return response.data
    } catch (error: unknown) {
      console.error('Create artifact API error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to create artifact')
    }
  },

  async updateArtifact(projectId: string, artifactId: string, data: ProjectArtifactUpdate): Promise<ProjectArtifact> {
    try {
      const client = getHttpClient()
      const response = await client.put(`/projects/${projectId}/artifacts/${artifactId}`, data)
      return response.data
    } catch (error: unknown) {
      console.error('Update artifact API error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to update artifact')
    }
  },

  async deleteArtifact(projectId: string, artifactId: string): Promise<void> {
    try {
      const client = getHttpClient()
      await client.delete(`/projects/${projectId}/artifacts/${artifactId}`)
    } catch (error: unknown) {
      console.error('Delete artifact API error:', error)
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to delete artifact')
    }
  },
}
