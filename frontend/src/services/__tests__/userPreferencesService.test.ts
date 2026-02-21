import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPatch = vi.fn()
const mockDelete = vi.fn()

vi.mock('../../utils/httpClient', () => {
  const mock = {
    get: (...args: any[]) => (mockGet as any)(...args),
    post: (...args: any[]) => (mockPost as any)(...args),
    patch: (...args: any[]) => (mockPatch as any)(...args),
    delete: (...args: any[]) => (mockDelete as any)(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  }
  return { getHttpClient: vi.fn(() => mock) }
})

const { userPreferencesService } = await import('../userPreferencesService')

beforeEach(() => vi.clearAllMocks())

describe('userPreferencesService', () => {
  describe('getUserPreferences', () => {
    it('throws on error when cache is empty', async () => {
      mockGet.mockRejectedValue(new Error('fail'))

      await expect(userPreferencesService.getUserPreferences()).rejects.toThrow()
    })

    it('fetches from API', async () => {
      const prefs = { id: '1', favorite_namespaces: ['community'] }
      mockGet.mockResolvedValue({ data: prefs })

      const result = await userPreferencesService.getUserPreferences()

      expect(mockGet).toHaveBeenCalledWith('/user/preferences')
      expect(result.favorite_namespaces).toContain('community')
    })
  })

  describe('addFavoriteNamespace', () => {
    it('posts to favorites endpoint', async () => {
      mockPost.mockResolvedValue({
        data: { success: true, favorite_namespaces: ['community'] },
      })

      const result = await userPreferencesService.addFavoriteNamespace('community')

      expect(mockPost).toHaveBeenCalledWith('/user/favorites/namespaces', {
        namespace: 'community',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('removeFavoriteNamespace', () => {
    it('deletes from favorites endpoint', async () => {
      mockDelete.mockResolvedValue({
        data: { success: true, favorite_namespaces: [] },
      })

      const result = await userPreferencesService.removeFavoriteNamespace('community')

      expect(mockDelete).toHaveBeenCalledWith('/user/favorites/namespaces/community')
      expect(result.success).toBe(true)
    })
  })

  describe('getFavoriteNamespaces', () => {
    it('returns namespace list', async () => {
      mockGet.mockResolvedValue({
        data: { favorite_namespaces: ['ansible', 'community'] },
      })

      const result = await userPreferencesService.getFavoriteNamespaces()

      expect(result).toEqual(['ansible', 'community'])
    })

    it('returns empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('fail'))

      const result = await userPreferencesService.getFavoriteNamespaces()

      expect(result).toEqual([])
    })
  })
})
