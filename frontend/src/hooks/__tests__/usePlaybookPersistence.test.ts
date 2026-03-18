import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// --- Mocks ---

const mockGetPlaybook = vi.fn()
const mockListPlaybooks = vi.fn()

vi.mock('../../services/playbookService', () => ({
  playbookService: {
    getPlaybook: (...args: unknown[]) => mockGetPlaybook(...args),
    listPlaybooks: (...args: unknown[]) => mockListPlaybooks(...args),
  },
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}))

// Mock sessionStorage
const sessionStore: Record<string, string> = {}
vi.stubGlobal('sessionStorage', {
  getItem: vi.fn((key: string) => sessionStore[key] || null),
  setItem: vi.fn((key: string, value: string) => { sessionStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete sessionStore[key] }),
  clear: vi.fn(() => { Object.keys(sessionStore).forEach(k => delete sessionStore[k]) }),
})

import { usePlaybookPersistence } from '../usePlaybookPersistence'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'

// Helper: build a minimal playbook detail response
function makePlaybookDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pb-1',
    name: 'Test Playbook',
    content: {
      plays: [
        {
          id: 'play-1',
          name: 'Play 1',
          attributes: {
            hosts: 'all',
            gatherFacts: true,
            become: false,
            connection: 'ssh',
            roles: [],
          },
        },
      ],
      modules: [
        {
          id: 'play-1-start-tasks',
          collection: 'ansible.generic',
          name: 'start',
          description: 'Start point for tasks',
          taskName: 'START',
          x: 50,
          y: 20,
          isPlay: true,
          parentSection: 'tasks',
          playId: 'play-1',
        },
      ],
      links: [],
      variables: [],
      collapsedBlocks: [],
      collapsedBlockSections: [],
    },
    snapshot_sequence: 0,
    events_delta: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(sessionStore).forEach(k => delete sessionStore[k])
  usePlaybookEditorStore.getState().resetStore()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePlaybookPersistence', () => {
  describe('loadPlaybook — snapshot only', () => {
    it('loads a playbook and calls loadPlaybookState on the store', async () => {
      const detail = makePlaybookDetail()
      mockGetPlaybook.mockResolvedValue(detail)

      const { result } = renderHook(() => usePlaybookPersistence('pb-1'))

      await act(async () => {
        await result.current.loadPlaybook('pb-1')
      })

      const state = usePlaybookEditorStore.getState()
      expect(state.currentPlaybookId).toBe('pb-1')
      expect(state.playbookName).toBe('Test Playbook')
      expect(mockGetPlaybook).toHaveBeenCalledWith('pb-1')
    })
  })

  describe('loadPlaybook — snapshot + events_delta replay', () => {
    it('replays events_delta via applyCollaborationUpdate after loading snapshot', async () => {
      // Mock applyCollaborationUpdate to avoid real store logic on synthetic events
      const mockApply = vi.fn()
      const origApply = usePlaybookEditorStore.getState().applyCollaborationUpdate
      usePlaybookEditorStore.setState({ applyCollaborationUpdate: mockApply })

      const detail = makePlaybookDetail({
        events_delta: [
          {
            id: 'evt-1',
            playbook_id: 'pb-1',
            user_id: 'u1',
            event_type: 'module_add',
            data: { moduleId: 'm-new', name: 'apt' },
            sequence_number: 1,
            created_at: '2026-03-18T10:00:00Z',
          },
          {
            id: 'evt-2',
            playbook_id: 'pb-1',
            user_id: 'u2',
            event_type: 'module_move',
            data: { moduleId: 'm-new', x: 200, y: 300 },
            sequence_number: 2,
            created_at: '2026-03-18T10:01:00Z',
          },
        ],
      })
      mockGetPlaybook.mockResolvedValue(detail)

      const { result } = renderHook(() => usePlaybookPersistence('pb-1'))

      await act(async () => {
        await result.current.loadPlaybook('pb-1')
      })

      expect(mockApply).toHaveBeenCalledTimes(2)

      // First event
      expect(mockApply).toHaveBeenNthCalledWith(1, expect.objectContaining({
        type: 'update',
        update_type: 'module_add',
        data: { moduleId: 'm-new', name: 'apt' },
        user_id: 'u1',
      }))

      // Second event
      expect(mockApply).toHaveBeenNthCalledWith(2, expect.objectContaining({
        type: 'update',
        update_type: 'module_move',
        data: { moduleId: 'm-new', x: 200, y: 300 },
        user_id: 'u2',
      }))

      usePlaybookEditorStore.setState({ applyCollaborationUpdate: origApply })
    })

    it('does not call applyCollaborationUpdate when events_delta is empty', async () => {
      const mockApply = vi.fn()
      const origApply = usePlaybookEditorStore.getState().applyCollaborationUpdate
      usePlaybookEditorStore.setState({ applyCollaborationUpdate: mockApply })

      mockGetPlaybook.mockResolvedValue(makePlaybookDetail({ events_delta: [] }))

      const { result } = renderHook(() => usePlaybookPersistence('pb-1'))

      await act(async () => {
        await result.current.loadPlaybook('pb-1')
      })

      expect(mockApply).not.toHaveBeenCalled()
      usePlaybookEditorStore.setState({ applyCollaborationUpdate: origApply })
    })
  })

  describe('auto-save removal', () => {
    it('does not return savePlaybook', () => {
      mockListPlaybooks.mockResolvedValue([])

      const { result } = renderHook(() => usePlaybookPersistence('pb-1'))

      // savePlaybook should not exist in the return value
      expect(result.current).not.toHaveProperty('savePlaybook')
      expect(result.current).toHaveProperty('loadPlaybook')
    })

    it('does not auto-save on store state changes', async () => {
      // Load a playbook first
      mockGetPlaybook.mockResolvedValue(makePlaybookDetail())

      const { result } = renderHook(() => usePlaybookPersistence('pb-1'))

      await act(async () => {
        await result.current.loadPlaybook('pb-1')
      })

      // Spy on playbookService to ensure no save calls happen
      const updateSpy = vi.fn()
      vi.spyOn(await import('../../services/playbookService'), 'playbookService', 'get').mockReturnValue({
        getPlaybook: mockGetPlaybook,
        listPlaybooks: mockListPlaybooks,
        updatePlaybook: updateSpy,
      } as any)

      // Mutate the store
      act(() => {
        usePlaybookEditorStore.getState().setPlaybookName('Changed Name')
      })

      // Wait for any potential auto-save debounce (3s in the old code)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 4000))
      })

      // No backend save should have been triggered
      expect(updateSpy).not.toHaveBeenCalled()
    })
  })
})
