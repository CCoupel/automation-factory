import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../authService'

// Mock the httpClient module
vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => mockAxios),
}))

const mockAxios = {
  post: vi.fn(),
  get: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authService', () => {
  describe('login', () => {
    it('calls POST /auth/login with credentials', async () => {
      const mockResponse = { data: { user: { id: '1', email: 'a@b.com', username: 'u' }, token: 'tok' } }
      mockAxios.post.mockResolvedValue(mockResponse)

      const result = await authService.login('a@b.com', 'pass')

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pass' })
      expect(result.token).toBe('tok')
    })

    it('throws on API error with detail message', async () => {
      mockAxios.post.mockRejectedValue({ response: { data: { detail: 'Bad creds' } } })

      await expect(authService.login('a@b.com', 'wrong')).rejects.toThrow('Bad creds')
    })

    it('throws generic message on network error', async () => {
      mockAxios.post.mockRejectedValue(new Error('Network Error'))

      await expect(authService.login('a@b.com', 'pass')).rejects.toThrow('Login failed')
    })
  })

  describe('register', () => {
    it('calls POST /auth/register with user data', async () => {
      const mockResponse = { data: { user: { id: '2', email: 'b@c.com', username: 'v' }, token: 'tok2' } }
      mockAxios.post.mockResolvedValue(mockResponse)

      const result = await authService.register('b@c.com', 'v', 'password')

      expect(mockAxios.post).toHaveBeenCalledWith('/auth/register', {
        email: 'b@c.com',
        username: 'v',
        password: 'password',
      })
      expect(result.token).toBe('tok2')
    })

    it('throws on duplicate email', async () => {
      mockAxios.post.mockRejectedValue({ response: { data: { detail: 'Email already registered' } } })

      await expect(authService.register('dup@b.com', 'u', 'p')).rejects.toThrow('Email already registered')
    })
  })

  describe('logout', () => {
    it('calls POST /auth/logout without throwing on error', async () => {
      mockAxios.post.mockRejectedValue(new Error('fail'))

      // Should not throw
      await authService.logout('tok')
      expect(mockAxios.post).toHaveBeenCalledWith('/auth/logout', {}, expect.any(Object))
    })
  })

  describe('verifyToken', () => {
    it('calls GET /auth/verify and returns user', async () => {
      const user = { id: '1', email: 'a@b.com', username: 'u' }
      mockAxios.get.mockResolvedValue({ data: user })

      const result = await authService.verifyToken('tok')

      expect(mockAxios.get).toHaveBeenCalledWith('/auth/verify', expect.objectContaining({
        headers: { Authorization: 'Bearer tok' },
      }))
      expect(result).toEqual(user)
    })

    it('throws on invalid token', async () => {
      mockAxios.get.mockRejectedValue(new Error('401'))

      await expect(authService.verifyToken('bad')).rejects.toThrow('Token verification failed')
    })
  })
})
