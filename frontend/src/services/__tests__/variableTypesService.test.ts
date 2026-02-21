import { describe, it, expect, vi, beforeEach } from 'vitest'
import { variableTypesService } from '../variableTypesService'

vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => mockAxios),
}))

const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('variableTypesService', () => {
  describe('getVariableTypes', () => {
    it('fetches types from API', async () => {
      const data = {
        builtin: [{ name: 'string', label: 'String' }],
        custom: [{ name: 'ip', label: 'IP Address', pattern: '.*' }],
      }
      mockAxios.get.mockResolvedValue({ data })

      const result = await variableTypesService.getVariableTypes(true)

      expect(mockAxios.get).toHaveBeenCalledWith('/variable-types')
      expect(result.builtin.length).toBe(1)
      expect(result.custom.length).toBe(1)
    })

    it('returns empty defaults on error', async () => {
      mockAxios.get.mockRejectedValue(new Error('fail'))

      const result = await variableTypesService.getVariableTypes(true)

      expect(result.builtin).toEqual([])
      expect(result.custom).toEqual([])
    })
  })

  describe('getVariableTypesFlat', () => {
    it('returns flat list with is_builtin flag', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          builtin: [{ name: 'string', label: 'String' }],
          custom: [{ name: 'ip', label: 'IP', pattern: '.*', is_active: true }],
        },
      })

      const result = await variableTypesService.getVariableTypesFlat(true)

      expect(result.length).toBe(2)
      expect(result[0].is_builtin).toBe(true)
    })
  })

  describe('validateValue', () => {
    it('calls POST /variable-types/validate', async () => {
      mockAxios.post.mockResolvedValue({
        data: { is_valid: true, message: 'Valid', parsed_value: '42' },
      })

      const result = await variableTypesService.validateValue('int', '42')

      expect(mockAxios.post).toHaveBeenCalledWith('/variable-types/validate', {
        type_name: 'int',
        value: '42',
      })
      expect(result.is_valid).toBe(true)
    })

    it('returns invalid on error', async () => {
      mockAxios.post.mockRejectedValue(new Error('fail'))

      const result = await variableTypesService.validateValue('int', 'abc')

      expect(result.is_valid).toBe(false)
    })
  })
})
