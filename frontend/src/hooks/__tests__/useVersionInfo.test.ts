import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock httpClient
const mockGet = vi.fn()
vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => ({ get: mockGet })),
}))

// Mock package.json
vi.mock('../../../package.json', () => ({
  default: { version: '2.3.0-rc.1' },
}))

import { useVersionInfo } from '../useVersionInfo'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useVersionInfo', () => {
  it('fetches backend version on mount', async () => {
    mockGet.mockResolvedValue({
      data: {
        version: '2.3.0',
        base_version: '2.3.0',
        internal_version: '2.3.0-rc.1',
        environment: 'STAGING',
        is_rc: true,
      },
    })

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.backendVersion).toBe('2.3.0')
    expect(result.current.isReleaseCandidate).toBe(true)
  })

  it('strips RC suffix in production', async () => {
    mockGet.mockResolvedValue({
      data: {
        version: '2.3.0',
        base_version: '2.3.0',
        internal_version: '2.3.0',
        environment: 'PROD',
        is_rc: false,
      },
    })

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.frontendVersion).toBe('2.3.0')
    expect(result.current.isProduction).toBe(true)
  })

  it('shows full version in staging', async () => {
    mockGet.mockResolvedValue({
      data: {
        version: '2.3.0-rc.1',
        base_version: '2.3.0',
        internal_version: '2.3.0-rc.1',
        environment: 'STAGING',
        is_rc: true,
      },
    })

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.frontendVersion).toBe('2.3.0-rc.1')
  })

  it('handles fetch error', async () => {
    mockGet.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.backendVersion).toBe('...')
  })
})
