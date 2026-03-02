import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { ProjectCollaborationProvider, useProjectCollaboration } from '../ProjectCollaborationContext'

// Mock the hook
const mockSendArtifactFocus = vi.fn()
const mockDisconnect = vi.fn()
const mockConnect = vi.fn()
let mockConnectedUsers: any[] = []
let mockIsConnected = false

vi.mock('../../hooks/useProjectWebSocket', () => ({
  useProjectWebSocket: (_projectId: string | null) => ({
    isConnected: mockIsConnected,
    connectedUsers: mockConnectedUsers,
    sendArtifactFocus: mockSendArtifactFocus,
    connect: mockConnect,
    disconnect: mockDisconnect,
  }),
}))

// Mock AuthContext
vi.mock('../AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'current-user', username: 'me' },
  }),
}))

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProjectCollaborationProvider>{children}</ProjectCollaborationProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  mockConnectedUsers = []
  mockIsConnected = false
})

describe('ProjectCollaborationContext', () => {
  it('provides default disconnected state', () => {
    const { result } = renderHook(() => useProjectCollaboration(), { wrapper })

    expect(result.current.isConnected).toBe(false)
    expect(result.current.connectedUsers).toEqual([])
  })

  it('provides connectToProject', () => {
    const { result } = renderHook(() => useProjectCollaboration(), { wrapper })

    act(() => {
      result.current.connectToProject('project-123')
    })

    // Should not throw
    expect(result.current.connectToProject).toBeDefined()
  })

  it('provides disconnectFromProject', () => {
    const { result } = renderHook(() => useProjectCollaboration(), { wrapper })

    act(() => {
      result.current.disconnectFromProject()
    })

    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('provides sendArtifactFocus', () => {
    const { result } = renderHook(() => useProjectCollaboration(), { wrapper })

    act(() => {
      result.current.sendArtifactFocus('artifact-1')
    })

    expect(mockSendArtifactFocus).toHaveBeenCalledWith('artifact-1')
  })

  it('getUsersOnArtifact filters by artifact_focus excluding current user', () => {
    mockConnectedUsers = [
      { user_id: 'user-1', username: 'alice', connected_at: '', artifact_focus: 'artifact-1' },
      { user_id: 'user-2', username: 'bob', connected_at: '', artifact_focus: 'artifact-2' },
      { user_id: 'current-user', username: 'me', connected_at: '', artifact_focus: 'artifact-1' },
    ]

    const { result } = renderHook(() => useProjectCollaboration(), { wrapper })

    const users = result.current.getUsersOnArtifact('artifact-1')
    expect(users).toHaveLength(1)
    expect(users[0].user_id).toBe('user-1')
  })

  it('getUsersOnArtifact returns empty for unmatched artifact', () => {
    mockConnectedUsers = [
      { user_id: 'user-1', username: 'alice', connected_at: '', artifact_focus: 'artifact-1' },
    ]

    const { result } = renderHook(() => useProjectCollaboration(), { wrapper })

    const users = result.current.getUsersOnArtifact('artifact-999')
    expect(users).toHaveLength(0)
  })

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useProjectCollaboration())
    }).toThrow('useProjectCollaboration must be used within a ProjectCollaborationProvider')
  })
})
