import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'

// --- Mock useProjectWebSocket ---

const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockSendUpdate = vi.fn()
const mockSendSetArtifact = vi.fn()

let mockOnUpdate: ((update: any) => void) | undefined
let mockOnPresenceChange: ((users: any[]) => void) | undefined

vi.mock('../../hooks/useProjectWebSocket', () => ({
  useProjectWebSocket: vi.fn((projectId: string | null, options: any) => {
    // Capture callbacks so tests can trigger them
    mockOnUpdate = options?.onUpdate
    mockOnPresenceChange = options?.onPresenceChange
    return {
      isConnected: projectId !== null,
      connectedUsers: [],
      sendUpdate: mockSendUpdate,
      sendSetArtifact: mockSendSetArtifact,
      connect: mockConnect,
      disconnect: mockDisconnect,
    }
  }),
}))

// Mock AuthContext
vi.mock('../AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'u1', email: 'test@example.com', username: 'testuser', role: 'admin' },
    isAuthenticated: true,
  })),
}))

import { CollaborationProvider, useCollaboration } from '../CollaborationContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CollaborationProvider>{children}</CollaborationProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  mockOnUpdate = undefined
  mockOnPresenceChange = undefined
})

describe('CollaborationContext', () => {
  it('provides default values', () => {
    const { result } = renderHook(() => useCollaboration(), { wrapper })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.connectedUsers).toEqual([])
    expect(result.current.currentProjectId).toBeNull()
    expect(result.current.lastUpdate).toBeNull()
    expect(result.current.highlightedElement).toBeNull()
  })

  it('throws when used outside provider', () => {
    // Suppress console.error for expected error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useCollaboration())
    }).toThrow('useCollaboration must be used within a CollaborationProvider')

    consoleSpy.mockRestore()
  })

  it('connectToProject sets the currentProjectId', () => {
    const { result } = renderHook(() => useCollaboration(), { wrapper })

    act(() => {
      result.current.connectToProject('pb-42')
    })

    expect(result.current.currentProjectId).toBe('pb-42')
  })

  it('disconnectFromProject clears state', () => {
    const { result } = renderHook(() => useCollaboration(), { wrapper })

    act(() => {
      result.current.connectToProject('pb-42')
    })

    act(() => {
      result.current.disconnectFromProject()
    })

    expect(result.current.currentProjectId).toBeNull()
    expect(result.current.lastUpdate).toBeNull()
    expect(result.current.highlightedElement).toBeNull()
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('sendUpdate forwards to the WebSocket hook', () => {
    const { result } = renderHook(() => useCollaboration(), { wrapper })

    act(() => {
      result.current.sendUpdate('module_move', { moduleId: 'm1', x: 10, y: 20 })
    })

    expect(mockSendUpdate).toHaveBeenCalledWith('module_move', { moduleId: 'm1', x: 10, y: 20 })
  })

  it('sets lastUpdate when onUpdate is triggered', () => {
    const { result } = renderHook(() => useCollaboration(), { wrapper })

    const update = {
      type: 'update' as const,
      update_type: 'module_add',
      user_id: 'u2',
      username: 'alice',
      data: { moduleId: 'm1' },
      timestamp: '2026-01-01T00:00:00Z',
    }

    act(() => {
      mockOnUpdate?.(update)
    })

    expect(result.current.lastUpdate).toEqual(update)
  })

  it('sets highlightedElement from update data.element_id', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCollaboration(), { wrapper })

    const update = {
      type: 'update' as const,
      update_type: 'module_config',
      user_id: 'u2',
      username: 'alice',
      data: { element_id: 'elem-99', field: 'name', value: 'test' },
      timestamp: '2026-01-01T00:00:00Z',
    }

    act(() => {
      mockOnUpdate?.(update)
    })

    expect(result.current.highlightedElement).toBe('elem-99')

    // Auto-clears after 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.highlightedElement).toBeNull()
    vi.useRealTimers()
  })

  it('clearHighlight manually clears the highlight', () => {
    const { result } = renderHook(() => useCollaboration(), { wrapper })

    const update = {
      type: 'update' as const,
      update_type: 'module_config',
      user_id: 'u2',
      username: 'alice',
      data: { element_id: 'elem-99' },
      timestamp: '2026-01-01T00:00:00Z',
    }

    act(() => {
      mockOnUpdate?.(update)
    })

    expect(result.current.highlightedElement).toBe('elem-99')

    act(() => {
      result.current.clearHighlight()
    })

    expect(result.current.highlightedElement).toBeNull()
  })

  it('calls onProjectUpdate prop when update is received', () => {
    const onProjectUpdate = vi.fn()

    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <CollaborationProvider onProjectUpdate={onProjectUpdate}>
        {children}
      </CollaborationProvider>
    )

    renderHook(() => useCollaboration(), { wrapper: customWrapper })

    const update = {
      type: 'update' as const,
      update_type: 'link_add',
      user_id: 'u2',
      username: 'bob',
      data: { linkId: 'l1' },
      timestamp: '2026-01-01T00:00:00Z',
    }

    act(() => {
      mockOnUpdate?.(update)
    })

    expect(onProjectUpdate).toHaveBeenCalledWith(update)
  })
})
