import { describe, it, expect } from 'vitest'
import { transformToAnsibleFormat, transformSinglePlayToAnsible } from '../playbookPreviewService'
import { PlaybookContent, ModuleBlock, Link } from '../playbookService'

// Helper to create a PlaybookContent with tasks connected via links
function createContentWithTasks(): PlaybookContent {
  const modules: ModuleBlock[] = [
    // START modules (4 per play)
    { id: 'play-1-start-pre-tasks', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'pre_tasks', playId: 'play-1' },
    { id: 'play-1-start-tasks', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'tasks', playId: 'play-1' },
    { id: 'play-1-start-post-tasks', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'post_tasks', playId: 'play-1' },
    { id: 'play-1-start-handlers', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'handlers', playId: 'play-1' },
    // User tasks in the tasks section
    { id: 'module-1', collection: 'ansible.builtin', name: 'debug', taskName: 'Debug message', x: 200, y: 100, parentSection: 'tasks', playId: 'play-1' },
    { id: 'module-2', collection: 'ansible.builtin', name: 'yum', taskName: 'Install package', x: 200, y: 200, parentSection: 'tasks', playId: 'play-1' },
  ]

  const links: Link[] = [
    { id: 'link-1', from: 'play-1-start-tasks', to: 'module-1', type: 'tasks' },
    { id: 'link-2', from: 'module-1', to: 'module-2', type: 'tasks' },
  ]

  return {
    modules,
    links,
    plays: [
      { id: 'play-1', name: 'Test Play', hosts: 'webservers' }
    ],
    collapsedBlocks: [],
    collapsedBlockSections: [],
    metadata: { playbookName: 'Test Playbook' },
    variables: [],
  }
}

describe('playbookPreviewService - transformToAnsibleFormat', () => {
  it('should include tasks section when tasks are linked from START node', () => {
    const content = createContentWithTasks()
    const result = transformToAnsibleFormat(content)

    expect(result).toHaveLength(1)
    expect(result[0].tasks).toBeDefined()
    expect(result[0].tasks).toHaveLength(2)
    expect(result[0].tasks![0].name).toBe('Debug message')
    expect(result[0].tasks![0].module).toBe('ansible.builtin.debug')
    expect(result[0].tasks![1].name).toBe('Install package')
    expect(result[0].tasks![1].module).toBe('ansible.builtin.yum')
  })

  it('should return play with no tasks when no modules are linked', () => {
    const content: PlaybookContent = {
      modules: [
        { id: 'play-1-start-tasks', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'tasks', playId: 'play-1' },
      ],
      links: [],
      plays: [{ id: 'play-1', name: 'Empty Play', hosts: 'all' }],
      collapsedBlocks: [],
      collapsedBlockSections: [],
      metadata: {},
      variables: [],
    }

    const result = transformToAnsibleFormat(content)
    expect(result).toHaveLength(1)
    expect(result[0].tasks).toBeUndefined()
  })

  it('should include pre_tasks when linked', () => {
    const content: PlaybookContent = {
      modules: [
        { id: 'play-1-start-pre-tasks', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'pre_tasks', playId: 'play-1' },
        { id: 'play-1-start-tasks', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'tasks', playId: 'play-1' },
        { id: 'module-1', collection: 'ansible.builtin', name: 'debug', taskName: 'Pre task', x: 200, y: 100, parentSection: 'pre_tasks', playId: 'play-1' },
      ],
      links: [
        { id: 'link-1', from: 'play-1-start-pre-tasks', to: 'module-1', type: 'pre_tasks' },
      ],
      plays: [{ id: 'play-1', name: 'Play', hosts: 'all' }],
      collapsedBlocks: [],
      collapsedBlockSections: [],
      metadata: {},
      variables: [],
    }

    const result = transformToAnsibleFormat(content)
    expect(result[0].pre_tasks).toBeDefined()
    expect(result[0].pre_tasks).toHaveLength(1)
  })
})

describe('playbookPreviewService - round-trip after load', () => {
  it('should produce tasks after a simulated load+serialize cycle', () => {
    // Simulate serializePlaybookContent output after a playbook load
    const serialized: PlaybookContent = {
      modules: [
        { id: 'play-1-start-pre-tasks', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'pre_tasks' as const, playId: 'play-1' },
        { id: 'play-1-start-tasks', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'tasks' as const, playId: 'play-1' },
        { id: 'play-1-start-post-tasks', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'post_tasks' as const, playId: 'play-1' },
        { id: 'play-1-start-handlers', collection: 'ansible.generic', name: 'start', taskName: 'START', x: 50, y: 20, isPlay: true, parentSection: 'handlers' as const, playId: 'play-1' },
        { id: 'module-1', collection: 'ansible.builtin', name: 'debug', taskName: 'My Debug', x: 200, y: 100, parentSection: 'tasks' as const, playId: 'play-1' },
      ],
      links: [
        { id: 'link-1', from: 'play-1-start-tasks', to: 'module-1', type: 'tasks' as const }
      ],
      plays: [{ id: 'play-1', name: 'Loaded Play', hosts: 'webservers', attributes: { hosts: 'webservers', gatherFacts: true, become: false, connection: 'ssh' } }],
      collapsedBlocks: [],
      collapsedBlockSections: [],
      metadata: { playbookName: 'Loaded Playbook' },
      variables: [],
    }

    // 5. transformToAnsibleFormat should find tasks
    const result = transformToAnsibleFormat(serialized)
    expect(result).toHaveLength(1)
    expect(result[0].tasks).toBeDefined()
    expect(result[0].tasks).toHaveLength(1)
    expect(result[0].tasks![0].name).toBe('My Debug')
  })
})

describe('playbookPreviewService - transformSinglePlayToAnsible', () => {
  it('should return first play with tasks', () => {
    const content = createContentWithTasks()
    const result = transformSinglePlayToAnsible(content)

    expect(result.name).toBe('Test Play')
    expect(result.hosts).toBe('webservers')
    expect(result.tasks).toBeDefined()
    expect(result.tasks).toHaveLength(2)
  })

  it('should return empty play when no plays defined but has modules', () => {
    const content: PlaybookContent = {
      modules: [
        { id: 'module-1', collection: 'ansible.builtin', name: 'debug', taskName: 'Debug', x: 0, y: 0 },
      ],
      links: [],
      plays: [],
      collapsedBlocks: [],
      collapsedBlockSections: [],
      metadata: { playbookName: 'Fallback' },
      variables: [],
    }

    const result = transformSinglePlayToAnsible(content)
    // Fallback: uses all regular modules as tasks
    expect(result.tasks).toBeDefined()
    expect(result.tasks).toHaveLength(1)
  })
})
