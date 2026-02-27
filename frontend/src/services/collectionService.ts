import { getHttpClient } from '../utils/httpClient'

export interface CollectionRequirement {
  name: string
  version: string | null
  source: string | null
}

export interface RoleRequirement {
  name: string
  version: string | null
  src: string | null
  scm: string | null
}

export interface RequirementsData {
  collections: CollectionRequirement[]
  roles: RoleRequirement[]
}

export interface RequirementsParseResponse {
  data: RequirementsData
  warnings: string[]
}

export interface CollectionSearchResult {
  namespace: string
  name: string
  fqcn: string
  version: string
  description: string
  download_count: number | null
}

export const collectionService = {
  async parseRequirements(projectId: string, rawContent: string): Promise<RequirementsParseResponse> {
    const client = getHttpClient()
    const response = await client.post(`/projects/${projectId}/collections/parse`, {
      raw_content: rawContent,
    })
    return response.data
  },

  async generateYaml(projectId: string, data: RequirementsData): Promise<string> {
    const client = getHttpClient()
    const response = await client.post(`/projects/${projectId}/collections/generate`, data)
    return response.data.yaml_content
  },

  async searchCollections(projectId: string, query: string, source: string = 'public'): Promise<CollectionSearchResult[]> {
    const client = getHttpClient()
    const response = await client.get(`/projects/${projectId}/collections/search`, {
      params: { query, source },
    })
    return response.data
  },

  async updateArtifact(
    projectId: string,
    artifactId: string,
    rawContent: string,
    content?: Record<string, any>,
  ): Promise<void> {
    const client = getHttpClient()
    await client.put(`/projects/${projectId}/artifacts/${artifactId}`, {
      raw_content: rawContent,
      ...(content ? { content } : {}),
    })
  },
}
