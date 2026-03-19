import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// --- Mock WebSocket ---

let mockWsInstances: MockWebSocket[] = []

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((ev: Event) => void) | null = null
  onclose: ((ev: CloseEvent) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  send = vi.fn()
  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: reason || '' } as CloseEvent)
    }
  })

  constructor(url: string) {
    this.url = url
    mockWsInstances.push(this)
  }

  // Test helper: simulate server opening connection
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN
    if (this.onopen) this.onopen(new Event('open'))
  }

  // Test helper: simulate incoming message
  simulateMessage(data: Record<string, unknown>) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent)
    }
  }

  // Test helper: simulate close from server
  simulateClose(code = 1006, reason = '') {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose({ code, reason } as CloseEvent)
    }
  }
}

// Install mock
vi.stubGlobal('WebSocket', MockWebSocket)

// Mock localStorage
const mockStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key] }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]) }),
})

import { useProjectWebSocket, ProjectUpdate, ConnectedUser, EventAck } from '../useProjectWebSocket'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  mockWsInstances = []
  mockStorage['authToken'] = 'test-token-12345678901234567890'
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useProjectWebSocket', () => {
  it('does not connect when projectId is null', () => {
    renderHook(() => useProjectWebSocket(null))

    expect(mockWsInstances).toHaveLength(0)
  })

  it('connects to /ws/project/{projectId} with auth token', () => {
    renderHook(() => useProjectWebSocket('proj-123'))

    expect(mockWsInstances).toHaveLength(1)
    expect(mockWsInstances[0].url).toContain('/ws/project/proj-123')
    expect(mockWsInstances[0].url).toContain('token=test-token-12345678901234567890')
  })

  it('does not connect when auth token is missing', () => {
    delete mockStorage['authToken']

    renderHook(() => useProjectWebSocket('proj-123'))

    expect(mockWsInstances).toHaveLength(0)
  })

  it('sets isConnected to true on open', () => {
    const { result } = renderHook(() => useProjectWebSocket('proj-123'))

    expect(result.current.isConnected).toBe(false)

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    expect(result.current.isConnected).toBe(true)
  })

  it('starts ping interval on open', () => {
    renderHook(() => useProjectWebSocket('proj-123'))

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    // Advance past one ping interval (25s)
    act(() => {
      vi.advanceTimersByTime(25000)
    })

    expect(mockWsInstances[0].send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ping"')
    )
  })

  it('parses presence message and updates connectedUsers', () => {
    const onPresenceChange = vi.fn()
    const { result } = renderHook(() =>
      useProjectWebSocket('proj-123', { onPresenceChange })
    )

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    const users: ConnectedUser[] = [
      { user_id: 'u1', username: 'alice', connected_at: '2026-01-01T00:00:00Z' },
      { user_id: 'u2', username: 'bob', connected_at: '2026-01-01T00:01:00Z' },
    ]

    act(() => {
      mockWsInstances[0].simulateMessage({ type: 'presence', users })
    })

    expect(result.current.connectedUsers).toHaveLength(2)
    expect(result.current.connectedUsers[0].username).toBe('alice')
    expect(onPresenceChange).toHaveBeenCalledWith(users)
  })

  it('handles user_joined message', () => {
    const { result } = renderHook(() => useProjectWebSocket('proj-123'))

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    act(() => {
      mockWsInstances[0].simulateMessage({
        type: 'user_joined',
        user_id: 'u1',
        username: 'alice',
        timestamp: '2026-01-01T00:00:00Z',
      })
    })

    expect(result.current.connectedUsers).toHaveLength(1)
    expect(result.current.connectedUsers[0].username).toBe('alice')
  })

  it('handles user_left message', () => {
    const { result } = renderHook(() => useProjectWebSocket('proj-123'))

    act(() => {
      mockWsInstances[0].simulateOpen()
      mockWsInstances[0].simulateMessage({
        type: 'presence',
        users: [
          { user_id: 'u1', username: 'alice', connected_at: '2026-01-01T00:00:00Z' },
          { user_id: 'u2', username: 'bob', connected_at: '2026-01-01T00:01:00Z' },
        ],
      })
    })

    expect(result.current.connectedUsers).toHaveLength(2)

    act(() => {
      mockWsInstances[0].simulateMessage({
        type: 'user_left',
        user_id: 'u1',
      })
    })

    expect(result.current.connectedUsers).toHaveLength(1)
    expect(result.current.connectedUsers[0].username).toBe('bob')
  })

  it('parses update message and calls onUpdate', () => {
    const onUpdate = vi.fn()
    renderHook(() => useProjectWebSocket('proj-123', { onUpdate }))

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    const updateMsg = {
      type: 'update',
      update_type: 'module_add',
      user_id: 'u1',
      username: 'alice',
      data: { moduleId: 'm1' },
      timestamp: '2026-01-01T00:00:00Z',
      artifact_id: 'art-1',
    }

    act(() => {
      mockWsInstances[0].simulateMessage(updateMsg)
    })

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const received = onUpdate.mock.calls[0][0] as ProjectUpdate
    expect(received.update_type).toBe('module_add')
    expect(received.artifact_id).toBe('art-1')
  })

  it('includes artifact_id in ProjectUpdate type', () => {
    // Type-level check: ProjectUpdate should accept artifact_id
    const update: ProjectUpdate = {
      type: 'update',
      update_type: 'module_move',
      user_id: 'u1',
      username: 'alice',
      data: {},
      timestamp: '2026-01-01T00:00:00Z',
      artifact_id: 'art-42',
    }
    expect(update.artifact_id).toBe('art-42')
  })

  it('sends update when WebSocket is open', () => {
    const { result } = renderHook(() => useProjectWebSocket('proj-123'))

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    act(() => {
      result.current.sendUpdate('module_move', { moduleId: 'm1', x: 100, y: 200 })
    })

    expect(mockWsInstances[0].send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'update',
        update_type: 'module_move',
        data: { moduleId: 'm1', x: 100, y: 200 },
      })
    )
  })

  it('does not send update when WebSocket is closed', () => {
    const { result } = renderHook(() => useProjectWebSocket('proj-123'))

    // Don't open the WebSocket
    act(() => {
      result.current.sendUpdate('module_move', { moduleId: 'm1' })
    })

    expect(mockWsInstances[0].send).not.toHaveBeenCalled()
  })

  it('attempts reconnection on non-clean close', () => {
    renderHook(() =>
      useProjectWebSocket('proj-123', { autoReconnect: true, reconnectInterval: 3000 })
    )

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    const initialCount = mockWsInstances.length

    // Simulate abnormal close (code 1006)
    act(() => {
      mockWsInstances[0].simulateClose(1006)
    })

    // Advance past reconnect interval
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    // A new WebSocket should have been created
    expect(mockWsInstances.length).toBeGreaterThan(initialCount)
  })

  it('does not reconnect on clean close (code 1000)', () => {
    renderHook(() =>
      useProjectWebSocket('proj-123', { autoReconnect: true })
    )

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    const countBefore = mockWsInstances.length

    // Simulate clean close
    act(() => {
      mockWsInstances[0].simulateClose(1000)
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(mockWsInstances.length).toBe(countBefore)
  })

  it('disconnects and cleans up on unmount', () => {
    const { unmount } = renderHook(() => useProjectWebSocket('proj-123'))

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    unmount()

    expect(mockWsInstances[0].close).toHaveBeenCalled()
  })

  it('disconnects when projectId changes to null', () => {
    const { rerender } = renderHook(
      ({ id }) => useProjectWebSocket(id),
      { initialProps: { id: 'proj-123' as string | null } }
    )

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    rerender({ id: null })

    expect(mockWsInstances[0].close).toHaveBeenCalled()
  })

  it('handles event_ack with sequence_number', () => {
    const onEventAck = vi.fn()
    const { result } = renderHook(() =>
      useProjectWebSocket('proj-123', { onEventAck })
    )

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    act(() => {
      mockWsInstances[0].simulateMessage({ type: 'event_ack', sequence_number: 5 })
    })

    expect(onEventAck).toHaveBeenCalledTimes(1)
    const received: EventAck = onEventAck.mock.calls[0][0]
    expect(received.type).toBe('event_ack')
    expect(received.sequence_number).toBe(5)
    expect(result.current.lastSequenceNumber).toBe(5)
  })

  it('handles event_ack without sequence_number', () => {
    const onEventAck = vi.fn()
    const { result } = renderHook(() =>
      useProjectWebSocket('proj-123', { onEventAck })
    )

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    act(() => {
      mockWsInstances[0].simulateMessage({ type: 'event_ack' })
    })

    expect(onEventAck).toHaveBeenCalledTimes(1)
    expect(result.current.lastSequenceNumber).toBeNull()
  })

  it('resets lastSequenceNumber on disconnect', () => {
    const { result } = renderHook(() => useProjectWebSocket('proj-123'))

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    // Set a sequence number via event_ack
    act(() => {
      mockWsInstances[0].simulateMessage({ type: 'event_ack', sequence_number: 3 })
    })

    expect(result.current.lastSequenceNumber).toBe(3)

    // Disconnect
    act(() => {
      result.current.disconnect()
    })

    expect(result.current.lastSequenceNumber).toBeNull()
  })

  it('handles pong messages without error', () => {
    renderHook(() => useProjectWebSocket('proj-123'))

    act(() => {
      mockWsInstances[0].simulateOpen()
    })

    // Should not throw
    act(() => {
      mockWsInstances[0].simulateMessage({ type: 'pong' })
    })
  })
})
