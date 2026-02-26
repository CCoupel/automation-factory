/**
 * Variable Chain Service
 *
 * API client for the variable chain validation endpoint.
 */

import { getHttpClient } from '../utils/httpClient'

export interface ValidationIssue {
  severity: 'error' | 'warning'
  message: string
  module_id: string | null
  var_name: string | null
  suggestion: string | null
}

export interface VariableChainValidationResponse {
  is_valid: boolean
  issues: ValidationIssue[]
  role_specs: Record<string, { args: Record<string, any>; returns: Record<string, any> }>
}

export const variableChainService = {
  async validateVariableChains(
    projectId: string,
    playbookYaml: string,
  ): Promise<VariableChainValidationResponse> {
    try {
      const client = getHttpClient()
      const response = await client.post(
        `/projects/${projectId}/validate-variable-chains`,
        { playbook_yaml: playbookYaml },
      )
      return response.data
    } catch (error: any) {
      console.error('Variable chain validation error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Failed to validate variable chains')
    }
  },
}
