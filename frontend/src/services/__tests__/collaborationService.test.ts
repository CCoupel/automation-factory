import { describe, it, expect, vi, beforeEach } from 'vitest'
import { collaborationService } from '../collaborationService'

vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => mockAxios),
}))

vi.mock('../../utils/apiErrorHandler', () => ({
  handleApiError: vi.fn((error: any) => {
    throw error?.response?.data?.detail
      ? new Error(error.response.data.detail)
      : new Error('API error')
  }),
}))

const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('collaborationService', () => {
  describe('sharePlaybook', () => {
    it('calls POST /playbooks/:id/shares', async () => {
      const share = { id: 's1', playbook_id: 'p1', user_id: 'u1', role: 'viewer' }
      mockAxios.post.mockResolvedValue({ data: share })

      const result = await collaborationService.sharePlaybook('p1', 'alice', 'viewer')

      expect(mockAxios.post).toHaveBeenCalledWith('/playbooks/p1/shares', {
        username: 'alice',
        role: 'viewer',
      })
      expect(result.id).toBe('s1')
    })
  })

  describe('getShares', () => {
    it('calls GET /playbooks/:id/shares', async () => {
      mockAxios.get.mockResolvedValue({
        data: { playbook_id: 'p1', shares: [], total: 0 },
      })

      const result = await collaborationService.getShares('p1')

      expect(mockAxios.get).toHaveBeenCalledWith('/playbooks/p1/shares')
      expect(result.total).toBe(0)
    })

    it('rejects invalid playbook ID', async () => {
      await expect(collaborationService.getShares('')).rejects.toThrow('Invalid playbook ID')
    })

    it('rejects null string playbook ID', async () => {
      await expect(collaborationService.getShares('null')).rejects.toThrow('Invalid playbook ID')
    })
  })

  describe('updateShare', () => {
    it('calls PUT /playbooks/:id/shares/:shareId', async () => {
      const share = { id: 's1', role: 'editor' }
      mockAxios.put.mockResolvedValue({ data: share })

      const result = await collaborationService.updateShare('p1', 's1', 'editor')

      expect(mockAxios.put).toHaveBeenCalledWith('/playbooks/p1/shares/s1', { role: 'editor' })
      expect(result.role).toBe('editor')
    })
  })

  describe('removeShare', () => {
    it('calls DELETE /playbooks/:id/shares/:shareId', async () => {
      mockAxios.delete.mockResolvedValue({})

      await collaborationService.removeShare('p1', 's1')

      expect(mockAxios.delete).toHaveBeenCalledWith('/playbooks/p1/shares/s1')
    })
  })

  describe('getSharedWithMe', () => {
    it('calls GET /playbooks/shared-with-me', async () => {
      mockAxios.get.mockResolvedValue({
        data: { playbooks: [], total: 0 },
      })

      const result = await collaborationService.getSharedWithMe()

      expect(mockAxios.get).toHaveBeenCalledWith('/playbooks/shared-with-me')
      expect(result.total).toBe(0)
    })
  })

  describe('getAuditLog', () => {
    it('calls GET /playbooks/:id/audit-log with limit', async () => {
      mockAxios.get.mockResolvedValue({
        data: { playbook_id: 'p1', entries: [], total: 0 },
      })

      const result = await collaborationService.getAuditLog('p1', 25)

      expect(mockAxios.get).toHaveBeenCalledWith('/playbooks/p1/audit-log', { params: { limit: 25 } })
      expect(result.total).toBe(0)
    })
  })
})
