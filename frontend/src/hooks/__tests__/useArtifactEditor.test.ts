import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock projectStore
const mockFetchArtifacts = vi.fn()
const mockArtifacts = [
  { id: 'art-1', raw_content: 'initial content', artifact_type: 'template', path: 'test.j2' },
]
const mockState = {
  artifacts: mockArtifacts,
  fetchArtifacts: mockFetchArtifacts,
}
vi.mock('../../stores/projectStore', () => ({
  useProjectStore: vi.fn((selector: any) => selector(mockState)),
}))

// Mock collectionService
const mockUpdateArtifact = vi.fn()
vi.mock('../../services/collectionService', () => ({
  collectionService: {
    updateArtifact: (...args: any[]) => mockUpdateArtifact(...args),
  },
}))

import { useArtifactEditor } from '../useArtifactEditor'

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateArtifact.mockResolvedValue(undefined)
  mockFetchArtifacts.mockResolvedValue(undefined)
})

describe('useArtifactEditor', () => {
  it('loads content from artifact store', () => {
    const { result } = renderHook(() =>
      useArtifactEditor({ artifactId: 'art-1', projectId: 'proj-1' })
    )
    expect(result.current.content).toBe('initial content')
    expect(result.current.loading).toBe(false)
  })

  it('detects dirty state on content change', () => {
    const { result } = renderHook(() =>
      useArtifactEditor({ artifactId: 'art-1', projectId: 'proj-1' })
    )
    expect(result.current.isDirty).toBe(false)

    act(() => {
      result.current.setContent('modified content')
    })
    expect(result.current.isDirty).toBe(true)
  })

  it('is never dirty in readOnly mode', () => {
    const { result } = renderHook(() =>
      useArtifactEditor({ artifactId: 'art-1', projectId: 'proj-1', readOnly: true })
    )

    act(() => {
      result.current.setContent('modified')
    })
    expect(result.current.isDirty).toBe(false)
  })

  it('saves content via API and refreshes artifacts', async () => {
    const { result } = renderHook(() =>
      useArtifactEditor({ artifactId: 'art-1', projectId: 'proj-1' })
    )

    act(() => {
      result.current.setContent('new content')
    })

    await act(async () => {
      await result.current.save()
    })

    expect(mockUpdateArtifact).toHaveBeenCalledWith('proj-1', 'art-1', 'new content')
    expect(mockFetchArtifacts).toHaveBeenCalledWith('proj-1')
    expect(result.current.snackbar.severity).toBe('success')
  })

  it('handles save errors', async () => {
    mockUpdateArtifact.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() =>
      useArtifactEditor({ artifactId: 'art-1', projectId: 'proj-1' })
    )

    act(() => {
      result.current.setContent('new content')
    })

    await act(async () => {
      await result.current.save()
    })

    expect(result.current.snackbar.severity).toBe('error')
    expect(result.current.snackbar.open).toBe(true)
  })

  it('does not save in readOnly mode', async () => {
    const { result } = renderHook(() =>
      useArtifactEditor({ artifactId: 'art-1', projectId: 'proj-1', readOnly: true })
    )

    await act(async () => {
      await result.current.save()
    })

    expect(mockUpdateArtifact).not.toHaveBeenCalled()
  })
})
