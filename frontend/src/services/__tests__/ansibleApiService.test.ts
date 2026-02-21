import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()

// Mock httpClient — the factory returns the mock object.
// Must be hoisted, so we cannot reference local variables declared after vi.mock.
vi.mock('../../utils/httpClient', () => {
  const mock = {
    get: (...args: any[]) => (mockGet as any)(...args),
    post: (...args: any[]) => (mockPost as any)(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  }
  return {
    getHttpClient: vi.fn(() => mock),
  }
})

// Import after mock is installed
import { ansibleApiService } from '../ansibleApiService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ansibleApiService', () => {
  describe('getVersions', () => {
    it('returns versions from API', async () => {
      mockGet.mockResolvedValue({ data: { versions: ['latest', '13', '12'] } })

      const result = await ansibleApiService.getVersions()

      expect(result).toEqual(['latest', '13', '12'])
    })

    it('returns fallback versions on error', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      const result = await ansibleApiService.getVersions()

      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('setVersion / getSelectedVersion', () => {
    it('updates and retrieves the selected version', () => {
      ansibleApiService.setVersion('12')
      expect(ansibleApiService.getSelectedVersion()).toBe('12')
    })
  })

  describe('getAllNamespaces', () => {
    it('returns namespaces from API', async () => {
      const namespaces = [
        { name: 'community', collections: ['general'], collections_count: 1 },
      ]
      mockGet.mockResolvedValue({ data: { namespaces } })

      const result = await ansibleApiService.getAllNamespaces()

      expect(result.length).toBeGreaterThan(0)
    })
  })
})
