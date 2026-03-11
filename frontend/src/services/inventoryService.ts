import { getHttpClient } from '../utils/httpClient'

export interface InventoryHost {
  name: string
  variables: Record<string, any>
}

export interface InventoryGroup {
  name: string
  hosts: string[]
  children: string[]
  variables: Record<string, any>
}

export interface InventoryData {
  hosts: InventoryHost[]
  groups: InventoryGroup[]
}

export interface InventoryParseResponse {
  data: InventoryData
  warnings: string[]
  format: string
}

export interface InventoryGenerateResponse {
  yaml_content: string
}

export const inventoryService = {
  async parseInventory(projectId: string, rawContent: string): Promise<InventoryParseResponse> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/inventory/parse`, {
        raw_content: rawContent,
      })
      return response.data
    } catch (error: any) {
      console.error('Parse inventory API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to parse inventory')
    }
  },

  async generateYaml(projectId: string, data: InventoryData): Promise<string> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/inventory/generate`, data)
      return response.data.yaml_content
    } catch (error: any) {
      console.error('Generate inventory API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to generate inventory')
    }
  },

  async updateArtifact(
    projectId: string,
    artifactId: string,
    rawContent: string,
    content?: Record<string, any>,
  ): Promise<void> {
    try {
      const client = getHttpClient()
      await client.put(`/projects/${projectId}/artifacts/${artifactId}`, {
        raw_content: rawContent,
        content,
      })
    } catch (error: any) {
      console.error('Update artifact API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to update artifact')
    }
  },
}
