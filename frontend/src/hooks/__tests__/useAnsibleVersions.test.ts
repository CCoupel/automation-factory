import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'

// Mock ansibleApiService
vi.mock('../../services/ansibleApiService', () => ({
  ansibleApiService: {
    getVersions: vi.fn().mockResolvedValue(['latest', '13', '12']),
    setVersion: vi.fn(),
  },
}))

// Mock AnsibleVersionContext
const mockSetAnsibleVersion = vi.fn()
vi.mock('../../contexts/AnsibleVersionContext', () => ({
  useAnsibleVersion: vi.fn(() => ({
    ansibleVersion: 'latest',
    setAnsibleVersion: mockSetAnsibleVersion,
  })),
}))

import { useAnsibleVersions } from '../useAnsibleVersions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useAnsibleVersions', () => {
  it('fetches versions and sets default', async () => {
    const { result } = renderHook(() => useAnsibleVersions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.versions).toEqual(['latest', '13', '12'])
  })

  it('provides selectVersion callback', async () => {
    const { result } = renderHook(() => useAnsibleVersions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(typeof result.current.selectVersion).toBe('function')
  })

  it('returns selected version from context', async () => {
    const { result } = renderHook(() => useAnsibleVersions())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.selectedVersion).toBe('latest')
  })
})
