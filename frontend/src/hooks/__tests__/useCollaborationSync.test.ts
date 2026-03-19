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

import { useCollaborationSync, applyProjectUpdate } from '../useCollaborationSync'
import type { ModuleAddData, ModuleMoveData, ModuleDeleteData, ModuleConfigData, LinkAddData } from '../useCollaborationSync'
import type { ProjectUpdate } from '../useProjectWebSocket'

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

  describe('artifact_id / playbook_id injection', () => {
    it('injects artifact_id and playbook_id into immediate sends', () => {
      const { result } = renderHook(() =>
        useCollaborationSync({ artifactId: 'art-1', playbookId: 'pb-1' })
      )

      act(() => {
        result.current.sendModuleAdd({
          moduleId: 'm1',
          module: { id: 'm1', collection: 'ansible.builtin', name: 'debug' } as any,
          position: { x: 0, y: 0 },
        })
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
      const [, payload] = mockSendUpdate.mock.calls[0]
      expect(payload.artifact_id).toBe('art-1')
      expect(payload.playbook_id).toBe('pb-1')
    })

    it('injects artifact_id and playbook_id into debounced sends', () => {
      const { result } = renderHook(() =>
        useCollaborationSync({ artifactId: 'art-2', playbookId: 'pb-2' })
      )

      act(() => {
        result.current.sendModuleMove({ moduleId: 'm1', x: 10, y: 20 })
      })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
      const [, payload] = mockSendUpdate.mock.calls[0]
      expect(payload.artifact_id).toBe('art-2')
      expect(payload.playbook_id).toBe('pb-2')
    })

    it('does not inject ids when options are not provided', () => {
      const { result } = renderHook(() => useCollaborationSync())

      act(() => {
        result.current.sendLinkDelete({ linkId: 'l1' })
      })

      expect(mockSendUpdate).toHaveBeenCalledTimes(1)
      const [, payload] = mockSendUpdate.mock.calls[0]
      expect(payload.artifact_id).toBeUndefined()
      expect(payload.playbook_id).toBeUndefined()
    })

    it('injects only artifactId when playbookId is null', () => {
      const { result } = renderHook(() =>
        useCollaborationSync({ artifactId: 'art-3', playbookId: null })
      )

      act(() => {
        result.current.sendModuleDelete({ moduleId: 'm1' })
      })

      const [, payload] = mockSendUpdate.mock.calls[0]
      expect(payload.artifact_id).toBe('art-3')
      expect(payload.playbook_id).toBeUndefined()
    })
  })
})

// ---------------------------------------------------------------------------
// applyProjectUpdate — pure function tests
// ---------------------------------------------------------------------------

describe('applyProjectUpdate', () => {
  const makeUpdate = (update_type: string, data: Record<string, unknown>): ProjectUpdate => ({
    type: 'update',
    update_type,
    user_id: 'u1',
    username: 'alice',
    data,
    timestamp: '2026-01-01T00:00:00Z',
  })

  const baseState = () => ({
    modules: [
      { id: 'm1', collection: 'ansible.builtin', name: 'debug', x: 0, y: 0 } as any,
    ],
    links: [{ id: 'l1', from: 'm1', to: 'm2' } as any],
    plays: [{ id: 'p1', name: 'Play 1' }],
    variables: [{ id: 'v1', key: 'host', value: 'localhost' } as any],
  })

  it('module_add appends a module', () => {
    const state = baseState()
    const newModule = { id: 'm2', collection: 'ansible.builtin', name: 'shell' } as any
    const result = applyProjectUpdate(
      makeUpdate('module_add', { moduleId: 'm2', module: newModule, position: { x: 10, y: 20 } }),
      state
    )
    expect(result.modules).toHaveLength(2)
    expect(result.modules[1].id).toBe('m2')
  })

  it('module_move updates module position', () => {
    const state = baseState()
    const result = applyProjectUpdate(
      makeUpdate('module_move', { moduleId: 'm1', x: 50, y: 60 }),
      state
    )
    expect(result.modules[0].x).toBe(50)
    expect(result.modules[0].y).toBe(60)
  })

  it('module_delete removes module and its links', () => {
    const state = {
      modules: [
        { id: 'm1', collection: 'a', name: 'b', x: 0, y: 0 } as any,
        { id: 'm2', collection: 'a', name: 'c', x: 0, y: 0 } as any,
      ],
      links: [
        { id: 'l1', from: 'm1', to: 'm2' } as any,
        { id: 'l2', from: 'm2', to: 'm3' } as any,
      ],
    }
    const result = applyProjectUpdate(
      makeUpdate('module_delete', { moduleId: 'm1' }),
      state
    )
    expect(result.modules).toHaveLength(1)
    expect(result.modules[0].id).toBe('m2')
    // Link l1 should be removed (connected to m1)
    expect(result.links).toHaveLength(1)
    expect(result.links[0].id).toBe('l2')
  })

  it('module_config updates module parameters', () => {
    const state = {
      modules: [{ id: 'm1', collection: 'a', name: 'b', x: 0, y: 0, moduleParameters: { msg: 'hello' } } as any],
      links: [],
    }
    const result = applyProjectUpdate(
      makeUpdate('module_config', { moduleId: 'm1', field: 'msg', value: 'world' }),
      state
    )
    expect(result.modules[0].moduleParameters.msg).toBe('world')
  })

  it('link_add appends a link', () => {
    const state = baseState()
    const newLink = { id: 'l2', from: 'm1', to: 'm3' } as any
    const result = applyProjectUpdate(
      makeUpdate('link_add', { link: newLink }),
      state
    )
    expect(result.links).toHaveLength(2)
  })

  it('link_delete removes a link', () => {
    const state = baseState()
    const result = applyProjectUpdate(
      makeUpdate('link_delete', { linkId: 'l1' }),
      state
    )
    expect(result.links).toHaveLength(0)
  })

  it('play_update updates a play field', () => {
    const state = baseState()
    const result = applyProjectUpdate(
      makeUpdate('play_update', { playId: 'p1', field: 'name', value: 'Updated Play' }),
      state
    )
    expect(result.plays![0].name).toBe('Updated Play')
  })

  it('variable_add appends a variable', () => {
    const state = baseState()
    const result = applyProjectUpdate(
      makeUpdate('variable_add', { playId: 'p1', variable: { key: 'port', value: '8080' } }),
      state
    )
    expect(result.variables).toHaveLength(2)
  })

  it('variable_delete removes a variable by index', () => {
    const state = baseState()
    const result = applyProjectUpdate(
      makeUpdate('variable_delete', { playId: 'p1', variableIndex: 0 }),
      state
    )
    expect(result.variables).toHaveLength(0)
  })

  it('unknown update type does not crash', () => {
    const state = baseState()
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = applyProjectUpdate(
      makeUpdate('unknown_type', {}),
      state
    )
    // State unchanged
    expect(result.modules).toHaveLength(1)
    consoleSpy.mockRestore()
  })
})
