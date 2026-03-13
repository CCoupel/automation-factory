import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPost = vi.fn()

vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => ({
    post: mockPost,
  })),
}))

// Mock URL.createObjectURL / revokeObjectURL
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn(() => 'blob:mock'),
  revokeObjectURL: vi.fn(),
})

import { exportABD, exportMermaid, exportSVG } from '../diagramExportApiService'

beforeEach(() => {
  vi.clearAllMocks()
  // Spy on link click without actually creating download
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

const samplePlays = [{ id: 'p1', name: 'Test Play', hosts: 'all' }] as any[]

describe('diagramExportApiService', () => {
  describe('exportABD', () => {
    it('calls POST /export/abd', async () => {
      mockPost.mockResolvedValue({
        data: { content: { format: 'abd' }, filename: 'test.abd' },
      })

      await exportABD(samplePlays, 'Test', {
        includeUIState: true,
        includeIntegrity: true,
        prettyPrint: false,
        collapsedBlocks: [],
        collapsedBlockSections: [],
        collapsedPlaySections: [],
        activePlayIndex: 0,
      })

      expect(mockPost).toHaveBeenCalledWith('/export/abd', expect.objectContaining({
        plays: samplePlays,
        playbook_name: 'Test',
      }))
    })
  })

  describe('exportMermaid', () => {
    it('calls POST /export/mermaid', async () => {
      mockPost.mockResolvedValue({
        data: { content: '```mermaid\ngraph TB\n```', filename: 'test.md' },
      })

      await exportMermaid(samplePlays, 'Test')

      expect(mockPost).toHaveBeenCalledWith('/export/mermaid', expect.objectContaining({
        plays: samplePlays,
        playbook_name: 'Test',
      }))
    })
  })

  describe('exportSVG', () => {
    it('calls POST /export/svg', async () => {
      mockPost.mockResolvedValue({
        data: { content: '<svg></svg>', filename: 'test.svg' },
      })

      await exportSVG(samplePlays, 'Test')

      expect(mockPost).toHaveBeenCalledWith('/export/svg', expect.objectContaining({
        plays: samplePlays,
        playbook_name: 'Test',
      }))
    })
  })
})
