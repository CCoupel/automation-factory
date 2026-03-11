import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  usePlaybookEditorStore,
  createStartModulesForPlay,
  type PlaybookEditorStore,
} from '../playbookEditorStore'
import { Play, PlayVariable } from '../../types/playbook'

// Helper to get store state without React
const getState = () => usePlaybookEditorStore.getState()
const setState = (partial: Partial<PlaybookEditorStore>) => usePlaybookEditorStore.setState(partial)

describe('playbookEditorStore', () => {
  beforeEach(() => {
    getState().resetStore()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // =====================================================
  // Initial state
  // =====================================================

  describe('initial state', () => {
    it('has one default play with START modules', () => {
      const { plays } = getState()
      expect(plays).toHaveLength(1)
      expect(plays[0].id).toBe('play-1')
      expect(plays[0].name).toBe('Play 1')
      expect(plays[0].modules).toHaveLength(4) // 4 START modules
      expect(plays[0].modules.every(m => m.taskName === 'START')).toBe(true)
    })

    it('has correct default values', () => {
      const state = getState()
      expect(state.activePlayIndex).toBe(0)
      expect(state.selectedModuleId).toBeNull()
      expect(state.selectedRole).toBeNull()
      expect(state.currentPlaybookId).toBeNull()
      expect(state.playbookName).toBe('Untitled Playbook')
      expect(state.saveStatus).toBe('idle')
      expect(state.lastSavedAt).toBeNull()
      expect(state.activeSectionTab).toBe('tasks')
      expect(state.gridEnabled).toBe(false)
      expect(state.draggedModuleId).toBeNull()
      expect(state.hoveredLinkId).toBeNull()
      expect(state.editingTabIndex).toBeNull()
      expect(state.resizingBlock).toBeNull()
      expect(state.highlightedElements.size).toBe(0)
    })

    it('has default collapsed sections', () => {
      const state = getState()
      expect(state.collapsedBlockSections.has('*:rescue')).toBe(true)
      expect(state.collapsedBlockSections.has('*:always')).toBe(true)
      expect(state.collapsedPlaySections.has('*:pre_tasks')).toBe(true)
      expect(state.collapsedPlaySections.has('*:post_tasks')).toBe(true)
      expect(state.collapsedPlaySections.has('*:handlers')).toBe(true)
    })

    it('has default play attributes', () => {
      const attrs = getState().plays[0].attributes
      expect(attrs?.hosts).toBe('all')
      expect(attrs?.gatherFacts).toBe(true)
      expect(attrs?.become).toBe(false)
      expect(attrs?.connection).toBe('ssh')
      expect(attrs?.roles).toEqual([])
    })

    it('has default variables', () => {
      const vars = getState().plays[0].variables
      expect(vars).toHaveLength(2)
      expect(vars[0].key).toBe('ansible_user')
      expect(vars[1].key).toBe('ansible_port')
    })
  })

  // =====================================================
  // setPlays / setActivePlayIndex
  // =====================================================

  describe('setPlays', () => {
    it('sets plays directly', () => {
      const newPlays: Play[] = [{
        id: 'test-play',
        name: 'Test',
        modules: [],
        links: [],
        variables: [],
      }]
      getState().setPlays(newPlays)
      expect(getState().plays).toEqual(newPlays)
    })

    it('sets plays via function', () => {
      getState().setPlays(prev => prev.map(p => ({ ...p, name: 'Renamed' })))
      expect(getState().plays[0].name).toBe('Renamed')
    })
  })

  describe('setActivePlayIndex', () => {
    it('sets active play index', () => {
      getState().addPlay()
      getState().setActivePlayIndex(1)
      expect(getState().activePlayIndex).toBe(1)
    })
  })

  // =====================================================
  // addPlay / removePlay
  // =====================================================

  describe('addPlay', () => {
    it('adds a new play and activates it', () => {
      getState().addPlay()
      const state = getState()
      expect(state.plays).toHaveLength(2)
      expect(state.activePlayIndex).toBe(1)
      expect(state.plays[1].modules).toHaveLength(4) // START modules
      expect(state.plays[1].variables).toEqual([])
    })
  })

  describe('removePlay', () => {
    it('removes a play', () => {
      getState().addPlay()
      expect(getState().plays).toHaveLength(2)
      getState().removePlay(1)
      expect(getState().plays).toHaveLength(1)
    })

    it('does not remove the last play', () => {
      getState().removePlay(0)
      expect(getState().plays).toHaveLength(1)
    })

    it('adjusts activePlayIndex when needed', () => {
      getState().addPlay()
      getState().addPlay()
      getState().setActivePlayIndex(2)
      getState().removePlay(2)
      expect(getState().activePlayIndex).toBe(1)
    })
  })

  // =====================================================
  // setModulesForActivePlay / setLinksForActivePlay
  // =====================================================

  describe('setModulesForActivePlay', () => {
    it('sets modules directly', () => {
      const modules = [{ id: 'm1', collection: 'test', name: 'test', x: 0, y: 0 }]
      getState().setModulesForActivePlay(modules as any)
      expect(getState().plays[0].modules).toEqual(modules)
    })

    it('sets modules via function', () => {
      const initial = getState().plays[0].modules.length
      getState().setModulesForActivePlay(prev => [
        ...prev,
        { id: 'new', collection: 'test', name: 'test', x: 100, y: 100 } as any,
      ])
      expect(getState().plays[0].modules).toHaveLength(initial + 1)
    })
  })

  describe('setLinksForActivePlay', () => {
    it('sets links directly', () => {
      const links = [{ id: 'l1', from: 'a', to: 'b', type: 'normal' as const }]
      getState().setLinksForActivePlay(links)
      expect(getState().plays[0].links).toEqual(links)
    })

    it('sets links via function', () => {
      getState().setLinksForActivePlay(prev => [
        ...prev,
        { id: 'l1', from: 'a', to: 'b', type: 'normal' as const },
      ])
      expect(getState().plays[0].links).toHaveLength(1)
    })
  })

  // =====================================================
  // selectModule / selectRole (mutual exclusion)
  // =====================================================

  describe('selectModule', () => {
    it('selects a module and clears role', () => {
      setState({ selectedRole: { index: 0, role: 'test' } })
      getState().selectModule('m1')
      expect(getState().selectedModuleId).toBe('m1')
      expect(getState().selectedRole).toBeNull()
    })

    it('deselecting module preserves role', () => {
      setState({ selectedRole: { index: 0, role: 'test' } })
      getState().selectModule(null)
      expect(getState().selectedModuleId).toBeNull()
      expect(getState().selectedRole).toEqual({ index: 0, role: 'test' })
    })
  })

  describe('selectRole', () => {
    it('selects a role and clears module', () => {
      setState({ selectedModuleId: 'm1' })
      getState().selectRole({ index: 0, role: 'test-role' })
      expect(getState().selectedRole).toEqual({ index: 0, role: 'test-role' })
      expect(getState().selectedModuleId).toBeNull()
    })

    it('deselecting role preserves module', () => {
      setState({ selectedModuleId: 'm1' })
      getState().selectRole(null)
      expect(getState().selectedRole).toBeNull()
      expect(getState().selectedModuleId).toBe('m1')
    })
  })

  // =====================================================
  // updateModuleAttributes
  // =====================================================

  describe('updateModuleAttributes', () => {
    it('updates the right module in plays', () => {
      const moduleId = getState().plays[0].modules[0].id
      getState().updateModuleAttributes(moduleId, { taskName: 'Updated Task' })
      const updated = getState().plays[0].modules.find(m => m.id === moduleId)
      expect(updated?.taskName).toBe('Updated Task')
    })

    it('does not affect other modules', () => {
      const modules = getState().plays[0].modules
      getState().updateModuleAttributes(modules[0].id, { taskName: 'Changed' })
      expect(getState().plays[0].modules[1].taskName).toBe('START')
    })
  })

  // =====================================================
  // deleteModule
  // =====================================================

  describe('deleteModule', () => {
    it('removes module and associated links', () => {
      // Setup: add a module and a link
      getState().setModulesForActivePlay(prev => [
        ...prev,
        { id: 'task-1', collection: 'test', name: 'test', x: 100, y: 100 } as any,
      ])
      getState().setLinksForActivePlay([
        { id: 'link-1', from: 'task-1', to: 'play-1-start-tasks', type: 'normal' },
      ])

      getState().deleteModule('task-1')

      const play = getState().plays[0]
      expect(play.modules.find(m => m.id === 'task-1')).toBeUndefined()
      expect(play.links).toHaveLength(0)
    })

    it('deselects the deleted module', () => {
      getState().setModulesForActivePlay(prev => [
        ...prev,
        { id: 'task-1', collection: 'test', name: 'test', x: 100, y: 100 } as any,
      ])
      setState({ selectedModuleId: 'task-1' })

      getState().deleteModule('task-1')
      expect(getState().selectedModuleId).toBeNull()
    })

    it('cleans up parent blockSections references', () => {
      getState().setModulesForActivePlay([
        {
          id: 'block-1', collection: 'test', name: 'block', x: 0, y: 0,
          isBlock: true,
          blockSections: { normal: ['child-1'], rescue: [], always: [] },
        } as any,
        { id: 'child-1', collection: 'test', name: 'child', x: 10, y: 10, parentId: 'block-1', parentSection: 'normal' } as any,
      ])

      getState().deleteModule('child-1')
      const block = getState().plays[0].modules.find(m => m.id === 'block-1')
      expect(block?.blockSections?.normal).toEqual([])
    })
  })

  // =====================================================
  // getPlayAttributes / updatePlayAttributes
  // =====================================================

  describe('getPlayAttributes', () => {
    it('returns current play attributes', () => {
      const attrs = getState().getPlayAttributes()
      expect(attrs.hosts).toBe('all')
      expect(attrs.gatherFacts).toBe(true)
    })
  })

  describe('updatePlayAttributes', () => {
    it('updates play attributes partially', () => {
      getState().updatePlayAttributes({ hosts: 'webservers', become: true })
      const attrs = getState().getPlayAttributes()
      expect(attrs.hosts).toBe('webservers')
      expect(attrs.become).toBe(true)
      expect(attrs.gatherFacts).toBe(true) // unchanged
    })
  })

  // =====================================================
  // getRoles / updateRole
  // =====================================================

  describe('getRoles', () => {
    it('returns empty array by default', () => {
      expect(getState().getRoles()).toEqual([])
    })

    it('returns roles after update', () => {
      getState().updatePlayAttributes({ roles: ['nginx', { role: 'mysql', vars: { port: 3306 } }] })
      const roles = getState().getRoles()
      expect(roles).toHaveLength(2)
      expect(roles[0]).toBe('nginx')
      expect(roles[1]).toEqual({ role: 'mysql', vars: { port: 3306 } })
    })
  })

  describe('updateRole', () => {
    it('updates a string role to object', () => {
      getState().updatePlayAttributes({ roles: ['nginx'] })
      getState().updateRole(0, { vars: { port: 80 } })
      const roles = getState().getRoles()
      expect(roles[0]).toEqual({ role: 'nginx', vars: { port: 80 } })
    })

    it('updates an object role', () => {
      getState().updatePlayAttributes({ roles: [{ role: 'mysql', vars: { port: 3306 } }] })
      getState().updateRole(0, { vars: { port: 5432 } })
      const roles = getState().getRoles()
      expect(roles[0]).toEqual({ role: 'mysql', vars: { port: 5432 } })
    })
  })

  // =====================================================
  // serializePlaybookContent
  // =====================================================

  describe('serializePlaybookContent', () => {
    it('returns correct output format', () => {
      const content = getState().serializePlaybookContent()
      expect(content.modules).toHaveLength(4) // 4 START modules with playId added
      expect(content.modules[0].playId).toBe('play-1')
      expect(content.links).toEqual([])
      expect(content.plays).toHaveLength(1)
      expect(content.plays[0].id).toBe('play-1')
      expect(content.plays[0].name).toBe('Play 1')
      expect(content.plays[0].hosts).toBe('all')
      expect(content.metadata.playbookName).toBe('Untitled Playbook')
      expect(content.variables).toHaveLength(2)
      expect(content.variables[0].name).toBe('ansible_user')
    })

    it('flattens modules from all plays', () => {
      getState().addPlay()
      const content = getState().serializePlaybookContent()
      expect(content.modules).toHaveLength(8) // 4 per play
      expect(content.plays).toHaveLength(2)
    })

    it('includes collapsed blocks', () => {
      getState().setCollapsedBlocks(new Set(['block-1', 'block-2']))
      const content = getState().serializePlaybookContent()
      expect(content.collapsedBlocks).toContain('block-1')
      expect(content.collapsedBlocks).toContain('block-2')
    })
  })

  // =====================================================
  // loadPlaybookState
  // =====================================================

  describe('loadPlaybookState', () => {
    it('loads bulk state correctly', () => {
      const plays: Play[] = [{
        id: 'loaded-play',
        name: 'Loaded',
        modules: createStartModulesForPlay('loaded-play'),
        links: [],
        variables: [{ key: 'test', value: 'val', type: 'string', required: true }],
        attributes: { hosts: 'webservers' },
      }]

      getState().loadPlaybookState({
        plays,
        currentPlaybookId: 'pb-123',
        playbookName: 'My Playbook',
        collapsedBlocks: ['block-1'],
        collapsedBlockSections: ['block-1:rescue'],
      })

      const state = getState()
      expect(state.plays).toEqual(plays)
      expect(state.currentPlaybookId).toBe('pb-123')
      expect(state.playbookName).toBe('My Playbook')
      expect(state.activePlayIndex).toBe(0)
      expect(state.selectedModuleId).toBeNull()
      expect(state.selectedRole).toBeNull()
      expect(state.collapsedBlocks.has('block-1')).toBe(true)
      expect(state.collapsedBlockSections.has('block-1:rescue')).toBe(true)
    })
  })

  // =====================================================
  // applyCollaborationUpdate
  // =====================================================

  describe('applyCollaborationUpdate', () => {
    const makeUpdate = (update_type: string, data: Record<string, unknown>) => ({
      type: 'update' as const,
      update_type,
      user_id: 'user-123',
      username: 'testuser',
      data,
      timestamp: new Date().toISOString(),
    })

    describe('module_add', () => {
      it('adds module to active play', () => {
        const module = { id: 'new-mod', collection: 'test', name: 'test', x: 100, y: 100 }
        getState().applyCollaborationUpdate(makeUpdate('module_add', { module }))
        expect(getState().plays[0].modules.find(m => m.id === 'new-mod')).toBeDefined()
      })

      it('adds block sections for block modules', () => {
        const module = { id: 'new-block', collection: 'test', name: 'block', x: 100, y: 100, isBlock: true }
        getState().applyCollaborationUpdate(makeUpdate('module_add', { module }))
        expect(getState().collapsedBlockSections.has('new-block:rescue')).toBe(true)
        expect(getState().collapsedBlockSections.has('new-block:always')).toBe(true)
      })

      it('updates parent blockSections when adding child', () => {
        // Setup parent block
        getState().setModulesForActivePlay(prev => [...prev, {
          id: 'parent-block', collection: 'test', name: 'block', x: 0, y: 0,
          isBlock: true, blockSections: { normal: [], rescue: [], always: [] },
        } as any])

        const child = {
          id: 'child-1', collection: 'test', name: 'task', x: 10, y: 10,
          parentId: 'parent-block', parentSection: 'normal',
        }
        getState().applyCollaborationUpdate(makeUpdate('module_add', { module: child }))

        const parent = getState().plays[0].modules.find(m => m.id === 'parent-block')
        expect(parent?.blockSections?.normal).toContain('child-1')
      })

      it('highlights the added module', () => {
        const module = { id: 'highlight-test', collection: 'test', name: 'test', x: 0, y: 0 }
        getState().applyCollaborationUpdate(makeUpdate('module_add', { module }))
        expect(getState().highlightedElements.has('highlight-test')).toBe(true)
      })
    })

    describe('module_move', () => {
      it('updates module position', () => {
        getState().setModulesForActivePlay(prev => [...prev, {
          id: 'movable', collection: 'test', name: 'test', x: 0, y: 0,
        } as any])

        getState().applyCollaborationUpdate(makeUpdate('module_move', {
          moduleId: 'movable', x: 200, y: 300,
        }))

        const mod = getState().plays[0].modules.find(m => m.id === 'movable')
        expect(mod?.x).toBe(200)
        expect(mod?.y).toBe(300)
      })

      it('updates parent references when moving between blocks', () => {
        getState().setModulesForActivePlay([
          {
            id: 'block-a', collection: 'test', name: 'block', x: 0, y: 0,
            isBlock: true, blockSections: { normal: ['task-1'], rescue: [], always: [] },
          } as any,
          {
            id: 'block-b', collection: 'test', name: 'block', x: 200, y: 0,
            isBlock: true, blockSections: { normal: [], rescue: [], always: [] },
          } as any,
          {
            id: 'task-1', collection: 'test', name: 'task', x: 10, y: 10,
            parentId: 'block-a', parentSection: 'normal',
          } as any,
        ])

        getState().applyCollaborationUpdate(makeUpdate('module_move', {
          moduleId: 'task-1', x: 210, y: 10,
          parentId: 'block-b', parentSection: 'rescue',
        }))

        const blockA = getState().plays[0].modules.find(m => m.id === 'block-a')
        const blockB = getState().plays[0].modules.find(m => m.id === 'block-b')
        expect(blockA?.blockSections?.normal).not.toContain('task-1')
        expect(blockB?.blockSections?.rescue).toContain('task-1')
      })
    })

    describe('module_delete', () => {
      it('removes module and its links', () => {
        getState().setModulesForActivePlay(prev => [...prev, {
          id: 'del-mod', collection: 'test', name: 'test', x: 0, y: 0,
        } as any])
        getState().setLinksForActivePlay([
          { id: 'l1', from: 'del-mod', to: 'play-1-start-tasks', type: 'normal' },
        ])

        getState().applyCollaborationUpdate(makeUpdate('module_delete', { moduleId: 'del-mod' }))

        expect(getState().plays[0].modules.find(m => m.id === 'del-mod')).toBeUndefined()
        expect(getState().plays[0].links).toHaveLength(0)
      })
    })

    describe('module_config', () => {
      it('updates direct module field', () => {
        getState().setModulesForActivePlay(prev => [...prev, {
          id: 'cfg-mod', collection: 'test', name: 'test', x: 0, y: 0, taskName: 'Old',
        } as any])

        getState().applyCollaborationUpdate(makeUpdate('module_config', {
          moduleId: 'cfg-mod', field: 'taskName', value: 'New Task',
        }))

        const mod = getState().plays[0].modules.find(m => m.id === 'cfg-mod')
        expect(mod?.taskName).toBe('New Task')
      })

      it('updates moduleParameters for non-direct fields', () => {
        getState().setModulesForActivePlay(prev => [...prev, {
          id: 'cfg-mod2', collection: 'test', name: 'test', x: 0, y: 0,
          moduleParameters: { existingParam: 'val' },
        } as any])

        getState().applyCollaborationUpdate(makeUpdate('module_config', {
          moduleId: 'cfg-mod2', field: 'customField', value: 'custom-value',
        }))

        const mod = getState().plays[0].modules.find(m => m.id === 'cfg-mod2')
        expect(mod?.moduleParameters?.customField).toBe('custom-value')
        expect(mod?.moduleParameters?.existingParam).toBe('val')
      })
    })

    describe('module_resize', () => {
      it('updates module dimensions and position', () => {
        getState().setModulesForActivePlay(prev => [...prev, {
          id: 'resize-mod', collection: 'test', name: 'test', x: 0, y: 0,
        } as any])

        getState().applyCollaborationUpdate(makeUpdate('module_resize', {
          moduleId: 'resize-mod', width: 300, height: 200, x: 50, y: 60,
        }))

        const mod = getState().plays[0].modules.find(m => m.id === 'resize-mod')
        expect(mod?.width).toBe(300)
        expect(mod?.height).toBe(200)
        expect(mod?.x).toBe(50)
        expect(mod?.y).toBe(60)
      })
    })

    describe('link_add', () => {
      it('adds link to active play', () => {
        const link = { id: 'new-link', from: 'a', to: 'b', type: 'normal' }
        getState().applyCollaborationUpdate(makeUpdate('link_add', { link }))
        expect(getState().plays[0].links).toContainEqual(link)
      })

      it('highlights both endpoints', () => {
        const link = { id: 'hl-link', from: 'mod-a', to: 'mod-b', type: 'normal' }
        getState().applyCollaborationUpdate(makeUpdate('link_add', { link }))
        expect(getState().highlightedElements.has('mod-a')).toBe(true)
        expect(getState().highlightedElements.has('mod-b')).toBe(true)
      })
    })

    describe('link_delete', () => {
      it('removes link from active play', () => {
        getState().setLinksForActivePlay([
          { id: 'del-link', from: 'a', to: 'b', type: 'normal' },
        ])
        getState().applyCollaborationUpdate(makeUpdate('link_delete', { linkId: 'del-link' }))
        expect(getState().plays[0].links).toHaveLength(0)
      })
    })

    describe('play_update', () => {
      it('updates play attribute field', () => {
        getState().applyCollaborationUpdate(makeUpdate('play_update', {
          playId: 'play-1', field: 'hosts', value: 'dbservers',
        }))
        expect(getState().plays[0].attributes?.hosts).toBe('dbservers')
      })

      it('updates direct play property', () => {
        getState().applyCollaborationUpdate(makeUpdate('play_update', {
          playId: 'play-1', field: 'name', value: 'Renamed Play',
        }))
        expect(getState().plays[0].name).toBe('Renamed Play')
      })

      it('ignores updates for non-existent play', () => {
        getState().applyCollaborationUpdate(makeUpdate('play_update', {
          playId: 'non-existent', field: 'name', value: 'Test',
        }))
        expect(getState().plays[0].name).toBe('Play 1')
      })
    })

    describe('variable_add', () => {
      it('adds variable to the right play', () => {
        const variable: PlayVariable = { key: 'new_var', value: 'test', type: 'string', required: true }
        getState().applyCollaborationUpdate(makeUpdate('variable_add', {
          playId: 'play-1', variable,
        }))
        expect(getState().plays[0].variables).toHaveLength(3)
        expect(getState().plays[0].variables[2].key).toBe('new_var')
      })
    })

    describe('variable_update', () => {
      it('updates variable at index', () => {
        const variable: PlayVariable = { key: 'ansible_user', value: 'admin', type: 'string', required: true }
        getState().applyCollaborationUpdate(makeUpdate('variable_update', {
          playId: 'play-1', variableIndex: 0, variable,
        }))
        expect(getState().plays[0].variables[0].value).toBe('admin')
      })
    })

    describe('variable_delete', () => {
      it('removes variable at index', () => {
        getState().applyCollaborationUpdate(makeUpdate('variable_delete', {
          playId: 'play-1', variableIndex: 0,
        }))
        expect(getState().plays[0].variables).toHaveLength(1)
        expect(getState().plays[0].variables[0].key).toBe('ansible_port')
      })
    })

    describe('role_add', () => {
      it('adds string role', () => {
        getState().applyCollaborationUpdate(makeUpdate('role_add', {
          playId: 'play-1', role: 'nginx',
        }))
        expect(getState().plays[0].attributes?.roles).toContain('nginx')
      })

      it('adds object role', () => {
        const role = { role: 'mysql', vars: { port: 3306 } }
        getState().applyCollaborationUpdate(makeUpdate('role_add', {
          playId: 'play-1', role,
        }))
        expect(getState().plays[0].attributes?.roles).toContainEqual(role)
      })
    })

    describe('role_delete', () => {
      it('removes role at index', () => {
        getState().updatePlayAttributes({ roles: ['nginx', 'mysql'] })
        getState().applyCollaborationUpdate(makeUpdate('role_delete', {
          playId: 'play-1', roleIndex: 0,
        }))
        const roles = getState().plays[0].attributes?.roles
        expect(roles).toHaveLength(1)
        expect(roles?.[0]).toBe('mysql')
      })
    })

    describe('role_update', () => {
      it('replaces entire roles array', () => {
        getState().updatePlayAttributes({ roles: ['old'] })
        getState().applyCollaborationUpdate(makeUpdate('role_update', {
          playId: 'play-1', roles: ['new1', 'new2'],
        }))
        expect(getState().plays[0].attributes?.roles).toEqual(['new1', 'new2'])
      })
    })

    describe('block_collapse', () => {
      it('collapses a block', () => {
        getState().applyCollaborationUpdate(makeUpdate('block_collapse', {
          blockId: 'block-1', collapsed: true,
        }))
        expect(getState().collapsedBlocks.has('block-1')).toBe(true)
      })

      it('expands a block', () => {
        setState({ collapsedBlocks: new Set(['block-1']) })
        getState().applyCollaborationUpdate(makeUpdate('block_collapse', {
          blockId: 'block-1', collapsed: false,
        }))
        expect(getState().collapsedBlocks.has('block-1')).toBe(false)
      })

      it('highlights the collapsed block', () => {
        getState().applyCollaborationUpdate(makeUpdate('block_collapse', {
          blockId: 'block-hl', collapsed: true,
        }))
        expect(getState().highlightedElements.has('block-hl')).toBe(true)
      })
    })
  })

  // =====================================================
  // highlightElement
  // =====================================================

  describe('highlightElement', () => {
    it('adds highlight and auto-removes after duration', () => {
      getState().highlightElement('elem-1', 'user-1', 1000)
      expect(getState().highlightedElements.has('elem-1')).toBe(true)

      vi.advanceTimersByTime(1000)
      expect(getState().highlightedElements.has('elem-1')).toBe(false)
    })

    it('uses consistent color for same user', () => {
      getState().highlightElement('elem-a', 'user-x', 5000)
      getState().highlightElement('elem-b', 'user-x', 5000)
      const colorA = getState().highlightedElements.get('elem-a')
      const colorB = getState().highlightedElements.get('elem-b')
      expect(colorA).toBe(colorB)
    })
  })

  // =====================================================
  // resetStore
  // =====================================================

  describe('resetStore', () => {
    it('returns to initial state', () => {
      // Modify various state
      getState().setPlaybookName('Modified')
      getState().setCurrentPlaybookId('pb-123')
      getState().selectModule('m1')
      getState().setGridEnabled(true)
      getState().addPlay()

      getState().resetStore()

      const state = getState()
      expect(state.playbookName).toBe('Untitled Playbook')
      expect(state.currentPlaybookId).toBeNull()
      expect(state.selectedModuleId).toBeNull()
      expect(state.gridEnabled).toBe(false)
      expect(state.plays).toHaveLength(1)
      expect(state.plays[0].id).toBe('play-1')
    })
  })

  // =====================================================
  // Selectors (tested indirectly via getState)
  // =====================================================

  describe('selectors behavior', () => {
    it('current play returns correct play', () => {
      getState().addPlay()
      getState().setActivePlayIndex(1)
      const play = getState().plays[getState().activePlayIndex]
      expect(play.id).not.toBe('play-1')
    })

    it('selected module data returns full module', () => {
      const moduleId = getState().plays[0].modules[0].id
      setState({ selectedModuleId: moduleId })
      const play = getState().plays[getState().activePlayIndex]
      const module = play.modules.find(m => m.id === moduleId)
      expect(module).toBeDefined()
      expect(module?.taskName).toBe('START')
    })
  })
})
