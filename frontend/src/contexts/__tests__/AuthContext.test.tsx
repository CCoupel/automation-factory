import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AuthProvider, useAuth } from '../AuthContext'

// Mock httpClient
const mockPost = vi.fn()
const mockGet = vi.fn()
vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => ({
    post: mockPost,
    get: mockGet,
  })),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('AuthContext', () => {
  it('starts with null user when no stored session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('restores user from localStorage', async () => {
    const user = { id: '1', email: 'a@b.com', username: 'u', role: 'user' }
    localStorage.setItem('authToken', 'tok')
    localStorage.setItem('authUser', JSON.stringify(user))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.user).toEqual(user)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('login stores user and token', async () => {
    mockPost.mockResolvedValue({
      data: {
        user: { id: '1', email: 'a@b.com', username: 'u', is_admin: false, created_at: '' },
        token: 'tok123',
      },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let success: boolean
    await act(async () => {
      success = await result.current.login('a@b.com', 'pass')
    })

    expect(success!).toBe(true)
    expect(result.current.user?.email).toBe('a@b.com')
    expect(result.current.isAuthenticated).toBe(true)
    expect(localStorage.getItem('authToken')).toBe('tok123')
  })

  it('login returns false on failure', async () => {
    mockPost.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let success: boolean
    await act(async () => {
      success = await result.current.login('a@b.com', 'wrong')
    })

    expect(success!).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logout clears state and localStorage', async () => {
    localStorage.setItem('authToken', 'tok')
    localStorage.setItem('authUser', JSON.stringify({ id: '1', email: 'a@b.com', username: 'u' }))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem('authToken')).toBeNull()
  })

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
  })
})
