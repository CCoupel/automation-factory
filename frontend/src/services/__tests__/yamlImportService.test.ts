import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPost = vi.fn()

vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => ({
    post: mockPost,
  })),
}))

import { importYamlDiagram } from '../yamlImportService'

beforeEach(() => {
  vi.clearAllMocks()
})

const samplePlays = [
  {
    id: 'play-1',
    name: 'Install packages',
    hosts: 'all',
    modules: [{ id: 'm1', type: 'ansible.builtin.apt', label: 'apt' }],
    links: [],
    variables: [],
  },
]

describe('yamlImportService', () => {
  describe('importYamlDiagram — success', () => {
    it('calls POST /yaml/parse and returns ImportResult with plays', async () => {
      mockPost.mockResolvedValue({
        data: { plays: samplePlays, warnings: [], errors: [] },
      })

      const result = await importYamlDiagram('---\n- hosts: all\n', 'site.yml')

      expect(mockPost).toHaveBeenCalledWith('/yaml/parse', {
        yaml_content: '---\n- hosts: all\n',
      })
      expect(result.success).toBe(true)
      expect(result.plays).toEqual(samplePlays)
      expect(result.validation.valid).toBe(true)
      expect(result.validation.canImport).toBe(true)
    })

    it('strips .yml extension from filename in metadata', async () => {
      mockPost.mockResolvedValue({
        data: { plays: samplePlays, warnings: [], errors: [] },
      })

      const result = await importYamlDiagram('content', 'my-playbook.yml')

      expect(result.metadata.name).toBe('my-playbook')
    })

    it('strips .yaml extension from filename in metadata', async () => {
      mockPost.mockResolvedValue({
        data: { plays: samplePlays, warnings: [], errors: [] },
      })

      const result = await importYamlDiagram('content', 'deploy.yaml')

      expect(result.metadata.name).toBe('deploy')
    })

    it('returns default empty uiState', async () => {
      mockPost.mockResolvedValue({
        data: { plays: samplePlays, warnings: [], errors: [] },
      })

      const result = await importYamlDiagram('content', 'test.yml')

      expect(result.uiState).toEqual({
        collapsedBlocks: [],
        collapsedBlockSections: [],
        collapsedPlaySections: [],
        activePlayIndex: 0,
      })
    })

    it('maps API warnings to validation warnings', async () => {
      mockPost.mockResolvedValue({
        data: {
          plays: samplePlays,
          warnings: ['Deprecated module used', 'Unknown attribute ignored'],
          errors: [],
        },
      })

      const result = await importYamlDiagram('content', 'test.yml')

      expect(result.success).toBe(true)
      expect(result.validation.warnings).toHaveLength(2)
      expect(result.validation.warnings[0]).toEqual({
        code: 'YAML_WARNING',
        message: 'Deprecated module used',
        severity: 'warning',
      })
      expect(result.validation.warnings[1]).toEqual({
        code: 'YAML_WARNING',
        message: 'Unknown attribute ignored',
        severity: 'warning',
      })
    })

    it('maps API errors to validation errors and sets success false', async () => {
      mockPost.mockResolvedValue({
        data: {
          plays: [],
          warnings: [],
          errors: ['Invalid YAML syntax at line 5'],
        },
      })

      const result = await importYamlDiagram('bad content', 'broken.yml')

      expect(result.success).toBe(false)
      expect(result.validation.valid).toBe(false)
      expect(result.validation.canImport).toBe(false)
      expect(result.validation.errors).toHaveLength(1)
      expect(result.validation.errors[0]).toEqual({
        code: 'YAML_ERROR',
        message: 'Invalid YAML syntax at line 5',
        severity: 'error',
      })
    })

    it('returns success false when plays array is empty (no errors)', async () => {
      mockPost.mockResolvedValue({
        data: { plays: [], warnings: [], errors: [] },
      })

      const result = await importYamlDiagram('---\n', 'empty.yml')

      expect(result.success).toBe(false)
      expect(result.plays).toEqual([])
    })
  })

  describe('importYamlDiagram — API error (400 response)', () => {
    it('handles 400 response with string detail', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { detail: 'Failed to parse YAML: invalid syntax' },
        },
      })

      const result = await importYamlDiagram('bad yaml', 'bad.yml')

      expect(result.success).toBe(false)
      expect(result.validation.valid).toBe(false)
      expect(result.validation.canImport).toBe(false)
      expect(result.validation.errors).toHaveLength(1)
      expect(result.validation.errors[0].code).toBe('YAML_PARSE_ERROR')
      expect(result.validation.errors[0].message).toContain('Failed to parse YAML')
      expect(result.validation.errors[0].message).toContain('invalid syntax')
    })

    it('handles 400 response with array detail', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: { detail: ['Error at line 1', 'Error at line 5'] },
        },
      })

      const result = await importYamlDiagram('bad yaml', 'bad.yml')

      expect(result.success).toBe(false)
      expect(result.validation.errors[0].message).toContain('Error at line 1; Error at line 5')
    })
  })

  describe('importYamlDiagram — network error', () => {
    it('handles network failure', async () => {
      mockPost.mockRejectedValue(new Error('Network Error'))

      const result = await importYamlDiagram('content', 'test.yml')

      expect(result.success).toBe(false)
      expect(result.validation.valid).toBe(false)
      expect(result.validation.canImport).toBe(false)
      expect(result.validation.errors).toHaveLength(1)
      expect(result.validation.errors[0].code).toBe('YAML_PARSE_ERROR')
      expect(result.validation.errors[0].message).toContain('Network Error')
    })

    it('handles unknown error type', async () => {
      mockPost.mockRejectedValue('string error')

      const result = await importYamlDiagram('content', 'test.yml')

      expect(result.success).toBe(false)
      expect(result.validation.errors[0].message).toContain('Unknown error')
    })
  })

  describe('importYamlDiagram — metadata', () => {
    it('preserves filename without extension change when no yml/yaml suffix', async () => {
      mockPost.mockResolvedValue({
        data: { plays: samplePlays, warnings: [], errors: [] },
      })

      const result = await importYamlDiagram('content', 'noext')

      expect(result.metadata.name).toBe('noext')
    })

    it('uses raw filename in error metadata', async () => {
      mockPost.mockRejectedValue(new Error('fail'))

      const result = await importYamlDiagram('content', 'my-file.yml')

      expect(result.metadata.name).toBe('my-file.yml')
    })

    it('sets needsMigration to false', async () => {
      mockPost.mockResolvedValue({
        data: { plays: samplePlays, warnings: [], errors: [] },
      })

      const result = await importYamlDiagram('content', 'test.yml')

      expect(result.validation.needsMigration).toBe(false)
    })
  })
})
