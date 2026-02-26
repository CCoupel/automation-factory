import { getHttpClient } from '../utils/httpClient'

export interface ReturnSpecEntry {
  type: string
  description: string
  scope: string
  always_set: boolean
  choices: string[] | null
  elements: string | null
  depends_on: string[] | null
}

export interface InferredReturnSpecResponse {
  inferred: Record<string, ReturnSpecEntry>
  warnings: string[]
}

export const returnSpecService = {
  async inferReturnSpecs(projectId: string, rolePath: string): Promise<InferredReturnSpecResponse> {
    try {
      const client = getHttpClient()
      const response = await client.post(`/projects/${projectId}/roles/${rolePath}/infer-return-specs`)
      return response.data
    } catch (error: any) {
      console.error('Infer return specs API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to infer return specs')
    }
  },
}
