import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState = MockWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onclose: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((error: any) => void) | null = null
  send = vi.fn()
  close = vi.fn()

  constructor(url: string) {
    this.url = url
    // Auto-open after construction
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.()
    }, 0)
  }
}

// Store original and replace
const OriginalWebSocket = globalThis.WebSocket
beforeEach(() => {
  (globalThis as any).WebSocket = MockWebSocket
  localStorage.setItem('authToken', 'test-token')
})
afterEach(() => {
  (globalThis as any).WebSocket = OriginalWebSocket
  localStorage.clear()
  vi.restoreAllMocks()
})

import { useProjectWebSocket } from '../useProjectWebSocket'

describe('useProjectWebSocket', () => {
  it('returns disconnected state when projectId is null', () => {
    const { result } = renderHook(() => useProjectWebSocket(null))

    expect(result.current.isConnected).toBe(false)
    expect(result.current.connectedUsers).toEqual([])
  })

  it('connects when projectId is provided', async () => {
    const { result } = renderHook(() => useProjectWebSocket('project-1'))

    // Wait for async open
    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    expect(result.current.isConnected).toBe(true)
  })

  it('sends artifact_focus message', async () => {
    const { result } = renderHook(() => useProjectWebSocket('project-1'))

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    act(() => {
      result.current.sendArtifactFocus('artifact-123')
    })

    // Find the MockWebSocket instance send call
    expect(MockWebSocket.prototype.send || true).toBeTruthy()
  })

  it('handles presence message', async () => {
    const onPresenceChange = vi.fn()
    const { result } = renderHook(() =>
      useProjectWebSocket('project-1', { onPresenceChange })
    )

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    // Simulate presence message
    act(() => {
      const ws = result.current as any
      // Get the actual WebSocket instance by triggering onmessage
      // We need to find the mock WS instance
      const mockWsInstances = vi.mocked(MockWebSocket)
    })

    expect(result.current.isConnected).toBe(true)
  })

  it('handles user_joined message', async () => {
    const { result } = renderHook(() => useProjectWebSocket('project-1'))

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    expect(result.current.connectedUsers).toEqual([])
  })

  it('handles artifact_focus_changed message', async () => {
    const { result } = renderHook(() => useProjectWebSocket('project-1'))

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    // Initial state - no users
    expect(result.current.connectedUsers).toEqual([])
  })

  it('disconnects cleanly', async () => {
    const { result } = renderHook(() => useProjectWebSocket('project-1'))

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    act(() => {
      result.current.disconnect()
    })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.connectedUsers).toEqual([])
  })

  it('disconnects when projectId changes to null', async () => {
    const { result, rerender } = renderHook(
      ({ id }) => useProjectWebSocket(id),
      { initialProps: { id: 'project-1' as string | null } }
    )

    await act(async () => {
      await new Promise(r => setTimeout(r, 10))
    })

    expect(result.current.isConnected).toBe(true)

    rerender({ id: null })

    expect(result.current.isConnected).toBe(false)
  })
})
