import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// --- Mock CollaborationContext ---

const mockSendUpdate = vi.fn()

vi.mock('../../contexts/CollaborationContext', () => ({
  useCollaboration: vi.fn(() => ({
    sendUpdate: mockSendUpdate,
    sendSetArtifact: vi.fn(),
    isConnected: true,
    connectedUsers: [],
    currentProjectId: 'proj-1',
    connectToProject: vi.fn(),
    disconnectFromProject: vi.fn(),
    lastUpdate: null,
    highlightedElement: null,
    clearHighlight: vi.fn(),
  })),
}))

// Mock useProjectWebSocket (imported by useCollaborationSync for types)
vi.mock('../useProjectWebSocket', () => ({
  useProjectWebSocket: vi.fn(),
}))

import { useCollaborationSync } from '../useCollaborationSync'
import type { ModuleAddData, ModuleMoveData, ModuleDeleteData, ModuleConfigData, LinkAddData } from '../useCollaborationSync'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCollaborationSync', () => {
  describe('immediate (discrete) sends', () => {
    it('sendModuleAdd sends immediately without debounce', () => {
      const { result } = renderHook(() => useCollaborationSync())

      const data: ModuleAddData = {
        moduleId: 'm1',
        module: { id: 'm1', collection: 'ansible.builtin', name: 'debug' } as any,
        position: { x: 100, y: 200 },
      }

      act(() => {
        result.current.sendModuleAdd(data)
      })

      // Called immediately, no need to advance timers
      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
      expect(mockSendUpdate).toHaveBeenCalledWith('module_add', expect.objectContaining({ moduleId: 'm1' }))
    })

    it('sendModuleDelete sends immediately', () => {
      const { result } = renderHook(() => useCollaborationSync())

      const data: ModuleDeleteData = { moduleId: 'm1' }

      act(() => {
        result.current.sendModuleDelete(data)
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
      expect(mockSendUpdate).toHaveBeenCalledWith('module_delete', expect.objectContaining({ moduleId: 'm1' }))
    })

    it('sendLinkAdd sends immediately', () => {
      const { result } = renderHook(() => useCollaborationSync())

      const data: LinkAddData = { link: { id: 'l1', from: 'm1', to: 'm2' } as any }

      act(() => {
        result.current.sendLinkAdd(data)
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
      expect(mockSendUpdate).toHaveBeenCalledWith('link_add', expect.objectContaining({ link: expect.objectContaining({ id: 'l1' }) }))
    })

    it('sendRoleAdd sends immediately', () => {
      const { result } = renderHook(() => useCollaborationSync())

      act(() => {
        result.current.sendRoleAdd({ playId: 'p1', role: 'nginx' })
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
      expect(mockSendUpdate).toHaveBeenCalledWith('role_add', expect.objectContaining({ playId: 'p1', role: 'nginx' }))
    })

    it('sendBlockCollapse sends immediately', () => {
      const { result } = renderHook(() => useCollaborationSync())

      act(() => {
        result.current.sendBlockCollapse({ blockId: 'b1', collapsed: true })
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('debounced sends', () => {
    it('sendModuleMove is debounced (300ms)', () => {
      const { result } = renderHook(() => useCollaborationSync())

      const data: ModuleMoveData = { moduleId: 'm1', x: 100, y: 200 }

      act(() => {
        result.current.sendModuleMove(data)
      })

      // Not sent immediately
      expect(mockSendUpdate).not.toHaveBeenCalled()

      // Advance past debounce delay
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
      expect(mockSendUpdate).toHaveBeenCalledWith('module_move', expect.objectContaining({ moduleId: 'm1', x: 100, y: 200 }))
    })

    it('sendModuleConfig is debounced', () => {
      const { result } = renderHook(() => useCollaborationSync())

      const data: ModuleConfigData = { moduleId: 'm1', field: 'name', value: 'test' }

      act(() => {
        result.current.sendModuleConfig(data)
      })

      expect(mockSendUpdate).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
    })

    it('rapid debounced calls only send the last value', () => {
      const { result } = renderHook(() => useCollaborationSync())

      // Simulate rapid move updates
      act(() => {
        result.current.sendModuleMove({ moduleId: 'm1', x: 10, y: 20 })
      })

      act(() => {
        vi.advanceTimersByTime(100)
      })

      act(() => {
        result.current.sendModuleMove({ moduleId: 'm1', x: 50, y: 60 })
      })

      act(() => {
        vi.advanceTimersByTime(100)
      })

      act(() => {
        result.current.sendModuleMove({ moduleId: 'm1', x: 200, y: 300 })
      })

      // Nothing sent yet
      expect(mockSendUpdate).not.toHaveBeenCalled()

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(300)
      })

      // Only the last value should have been sent
      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
      expect(mockSendUpdate).toHaveBeenCalledWith('module_move', expect.objectContaining({ x: 200, y: 300 }))
    })

    it('sendPlayUpdate is debounced', () => {
      const { result } = renderHook(() => useCollaborationSync())

      act(() => {
        result.current.sendPlayUpdate({ playId: 'p1', field: 'name', value: 'My Play' })
      })

      expect(mockSendUpdate).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('generic sendUpdate', () => {
    it('sends discrete types immediately', () => {
      const { result } = renderHook(() => useCollaborationSync())

      act(() => {
        result.current.sendUpdate('module_add', { moduleId: 'm1', module: {}, position: { x: 0, y: 0 } } as any)
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
    })

    it('debounces non-discrete types', () => {
      const { result } = renderHook(() => useCollaborationSync())

      act(() => {
        result.current.sendUpdate('module_move', { moduleId: 'm1', x: 10, y: 20 } as any)
      })

      expect(mockSendUpdate).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('connection state', () => {
    it('exposes isConnected from context', () => {
      const { result } = renderHook(() => useCollaborationSync())

      expect(result.current.isConnected).toBe(true)
    })
  })

  describe('cleanup', () => {
    it('clears debounce timers on unmount', () => {
      const { result, unmount } = renderHook(() => useCollaborationSync())

      // Queue a debounced send
      act(() => {
        result.current.sendModuleMove({ moduleId: 'm1', x: 10, y: 20 })
      })

      unmount()

      // Advance timers — the debounced send should NOT fire after unmount
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(mockSendUpdate).not.toHaveBeenCalled()
    })
  })
})
