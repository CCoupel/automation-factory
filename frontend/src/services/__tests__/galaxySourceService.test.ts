import { describe, it, expect, vi, beforeEach } from 'vitest'
import { galaxySourceService } from '../galaxySourceService'

vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => mockAxios),
}))

const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('galaxySourceService', () => {
  describe('adminGetAllSources', () => {
    it('fetches sources from API', async () => {
      const sources = [{ id: '1', name: 'public', source_type: 'public', url: 'https://galaxy.ansible.com' }]
      mockAxios.get.mockResolvedValue({ data: { sources, total: 1 } })

      const result = await galaxySourceService.adminGetAllSources(true)

      expect(mockAxios.get).toHaveBeenCalledWith('/galaxy-sources/admin')
      expect(result.length).toBe(1)
    })

    it('throws on error', async () => {
      mockAxios.get.mockRejectedValue(new Error('fail'))

      await expect(galaxySourceService.adminGetAllSources(true)).rejects.toThrow('fail')
    })
  })

  describe('adminCreateSource', () => {
    it('calls POST and returns created source', async () => {
      const data = { name: 'private', source_type: 'private' as const, url: 'https://private.example.com' }
      const created = { id: '2', ...data }
      mockAxios.post.mockResolvedValue({ data: created })

      const result = await galaxySourceService.adminCreateSource(data)

      expect(mockAxios.post).toHaveBeenCalledWith('/galaxy-sources/admin', data)
      expect(result.id).toBe('2')
    })
  })

  describe('adminUpdateSource', () => {
    it('calls PUT with source ID', async () => {
      mockAxios.put.mockResolvedValue({ data: { id: '1', name: 'updated' } })

      const result = await galaxySourceService.adminUpdateSource('1', { name: 'updated' })

      expect(mockAxios.put).toHaveBeenCalledWith('/galaxy-sources/admin/1', { name: 'updated' })
      expect(result.name).toBe('updated')
    })
  })

  describe('adminDeleteSource', () => {
    it('calls DELETE with source ID', async () => {
      mockAxios.delete.mockResolvedValue({})

      await galaxySourceService.adminDeleteSource('1')

      expect(mockAxios.delete).toHaveBeenCalledWith('/galaxy-sources/admin/1')
    })
  })

  describe('adminToggleSource', () => {
    it('calls PATCH with is_active param', async () => {
      mockAxios.patch.mockResolvedValue({ data: { id: '1', is_active: false } })

      const result = await galaxySourceService.adminToggleSource('1', false)

      expect(mockAxios.patch).toHaveBeenCalledWith(
        '/galaxy-sources/admin/1/toggle',
        null,
        { params: { is_active: false } }
      )
      expect(result.is_active).toBe(false)
    })
  })
})
