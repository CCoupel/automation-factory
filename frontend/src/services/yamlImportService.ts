/**
 * YAML Import Service
 * Handles import of Ansible YAML files via the backend parse API
 */

import { Play } from '../types/playbook'
import { ValidationResult, ValidationError } from '../types/diagram-export'
import { ImportResult } from './diagramImportService'
import { getHttpClient } from '../utils/httpClient'

interface YamlParseResponse {
  plays: Play[]
  warnings: string[]
  errors: string[]
}

/**
 * Import an Ansible YAML file by sending its content to the backend parser.
 * Returns an ImportResult compatible with diagramImportService.
 */
export async function importYamlDiagram(
  yamlContent: string,
  filename: string
): Promise<ImportResult> {
  const defaultUiState = {
    collapsedBlocks: [] as string[],
    collapsedBlockSections: [] as string[],
    collapsedPlaySections: [] as string[],
    activePlayIndex: 0,
  }

  try {
    const client = getHttpClient()
    const response = await client.post<YamlParseResponse>('/yaml/parse', {
      yaml_content: yamlContent,
    })

    const { plays, warnings, errors } = response.data

    const validationWarnings: ValidationError[] = warnings.map((msg) => ({
      code: 'YAML_WARNING',
      message: msg,
      severity: 'warning' as const,
    }))

    const validationErrors: ValidationError[] = errors.map((msg) => ({
      code: 'YAML_ERROR',
      message: msg,
      severity: 'error' as const,
    }))

    const hasErrors = validationErrors.length > 0
    const validation: ValidationResult = {
      valid: !hasErrors,
      canImport: !hasErrors,
      needsMigration: false,
      errors: validationErrors,
      warnings: validationWarnings,
      info: [],
    }

    const name = filename.replace(/\.(ya?ml)$/i, '')

    return {
      success: !hasErrors && plays.length > 0,
      plays,
      uiState: defaultUiState,
      metadata: { name },
      validation,
    }
  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message : 'Unknown error'
    const apiDetail =
      (error as { response?: { data?: { detail?: string | string[] } } })
        ?.response?.data?.detail

    const errorMessage = Array.isArray(apiDetail)
      ? apiDetail.join('; ')
      : apiDetail || detail

    return {
      success: false,
      plays: [],
      uiState: defaultUiState,
      metadata: { name: filename },
      validation: {
        valid: false,
        canImport: false,
        needsMigration: false,
        errors: [
          {
            code: 'YAML_PARSE_ERROR',
            message: `Failed to parse YAML: ${errorMessage}`,
            severity: 'error',
          },
        ],
        warnings: [],
        info: [],
      },
    }
  }
}
