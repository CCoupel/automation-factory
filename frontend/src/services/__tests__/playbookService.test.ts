import { describe, it, expect, vi, beforeEach } from 'vitest'
import { playbookService } from '../playbookService'

vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => mockAxios),
}))

const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('playbookService', () => {
  describe('listPlaybooks', () => {
    it('calls GET /playbooks and returns list', async () => {
      const playbooks = [{ id: '1', name: 'PB1' }]
      mockAxios.get.mockResolvedValue({ data: playbooks })

      const result = await playbookService.listPlaybooks()

      expect(mockAxios.get).toHaveBeenCalledWith('/playbooks')
      expect(result).toEqual(playbooks)
    })
  })

  describe('getPlaybook', () => {
    it('calls GET /playbooks/:id and returns detail', async () => {
      const pb = { id: '1', name: 'PB1', content: {} }
      mockAxios.get.mockResolvedValue({ data: pb })

      const result = await playbookService.getPlaybook('1')

      expect(mockAxios.get).toHaveBeenCalledWith('/playbooks/1')
      expect(result).toEqual(pb)
    })
  })

  describe('createPlaybook', () => {
    it('calls POST /playbooks with data', async () => {
      const input = { name: 'New', content: { plays: [] } }
      const created = { id: '2', ...input }
      mockAxios.post.mockResolvedValue({ data: created })

      const result = await playbookService.createPlaybook(input as any)

      expect(mockAxios.post).toHaveBeenCalledWith('/playbooks', input)
      expect(result.id).toBe('2')
    })
  })

  describe('updatePlaybook', () => {
    it('calls PUT /playbooks/:id with updates', async () => {
      const updates = { name: 'Updated' }
      mockAxios.put.mockResolvedValue({ data: { id: '1', name: 'Updated' } })

      const result = await playbookService.updatePlaybook('1', updates)

      expect(mockAxios.put).toHaveBeenCalledWith('/playbooks/1', updates)
      expect(result.name).toBe('Updated')
    })
  })

  describe('deletePlaybook', () => {
    it('calls DELETE /playbooks/:id', async () => {
      mockAxios.delete.mockResolvedValue({})

      await playbookService.deletePlaybook('1')

      expect(mockAxios.delete).toHaveBeenCalledWith('/playbooks/1')
    })

    it('throws on error with detail', async () => {
      mockAxios.delete.mockRejectedValue({ response: { data: { detail: 'Forbidden' } } })

      await expect(playbookService.deletePlaybook('1')).rejects.toThrow('Forbidden')
    })
  })

  describe('transferOwnership', () => {
    it('calls POST /playbooks/:id/transfer-ownership', async () => {
      const req = { new_owner_username: 'other', keep_access: true }
      mockAxios.post.mockResolvedValue({ data: { success: true, new_owner_username: 'other', old_owner_kept_access: true } })

      const result = await playbookService.transferOwnership('1', req)

      expect(mockAxios.post).toHaveBeenCalledWith('/playbooks/1/transfer-ownership', req)
      expect(result.success).toBe(true)
    })
  })
})
