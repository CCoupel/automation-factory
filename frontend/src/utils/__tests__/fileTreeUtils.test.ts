import { describe, it, expect } from 'vitest'
import { buildFileTree, TreeNode } from '../fileTreeUtils'
import { ProjectArtifact } from '../../services/projectService'

/** Helper to create a minimal ProjectArtifact for testing */
const makeArtifact = (overrides: Partial<ProjectArtifact> & { id: string; path: string }): ProjectArtifact => ({
  project_id: 'proj-1',
  artifact_type: 'file',
  content: null,
  raw_content: null,
  version: 1,
  metadata: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('buildFileTree', () => {
  it('returns an empty array for an empty artifact list', () => {
    const result = buildFileTree([])
    expect(result).toEqual([])
  })

  it('places artifacts without "/" as root-level files', () => {
    const artifacts = [
      makeArtifact({ id: 'a1', path: 'site.yml', artifact_type: 'playbook' }),
      makeArtifact({ id: 'a2', path: 'ansible.cfg', artifact_type: 'ansible_cfg' }),
    ]
    const tree = buildFileTree(artifacts)

    // All nodes should be at root level, no folders
    expect(tree).toHaveLength(2)
    expect(tree.every(n => !n.isFolder)).toBe(true)
    expect(tree.map(n => n.name)).toContain('site.yml')
    expect(tree.map(n => n.name)).toContain('ansible.cfg')
  })

  it('creates intermediate folder nodes from paths', () => {
    const artifacts = [
      makeArtifact({ id: 'a1', path: 'roles/webserver/tasks/main.yml', artifact_type: 'role' }),
    ]
    const tree = buildFileTree(artifacts)

    // Root should have one folder: "roles"
    expect(tree).toHaveLength(1)
    const roles = tree[0]
    expect(roles.isFolder).toBe(true)
    expect(roles.name).toBe('roles')

    // roles -> webserver -> tasks -> main.yml
    const webserver = roles.children[0]
    expect(webserver.isFolder).toBe(true)
    expect(webserver.name).toBe('webserver')

    const tasks = webserver.children[0]
    expect(tasks.isFolder).toBe(true)
    expect(tasks.name).toBe('tasks')

    const file = tasks.children[0]
    expect(file.isFolder).toBe(false)
    expect(file.name).toBe('main.yml')
    expect(file.id).toBe('a1')
  })

  it('builds a correct tree from flat paths', () => {
    const artifacts = [
      makeArtifact({ id: 'a1', path: 'roles/webserver/tasks/main.yml', artifact_type: 'role' }),
      makeArtifact({ id: 'a2', path: 'roles/webserver/handlers/main.yml', artifact_type: 'role' }),
      makeArtifact({ id: 'a3', path: 'roles/database/tasks/main.yml', artifact_type: 'role' }),
      makeArtifact({ id: 'a4', path: 'inventory/hosts.yml', artifact_type: 'inventory' }),
      makeArtifact({ id: 'a5', path: 'site.yml', artifact_type: 'playbook' }),
    ]
    const tree = buildFileTree(artifacts)

    // Root level: "roles" folder, "inventory" folder, "site.yml" file
    const rootNames = tree.map(n => n.name)
    expect(rootNames).toContain('roles')
    expect(rootNames).toContain('inventory')
    expect(rootNames).toContain('site.yml')

    // The roles folder should contain webserver and database
    const rolesNode = tree.find(n => n.name === 'roles')!
    expect(rolesNode.isFolder).toBe(true)
    const roleChildren = rolesNode.children.map(n => n.name)
    expect(roleChildren).toContain('webserver')
    expect(roleChildren).toContain('database')
  })

  it('sorts folders before files, then alphabetically', () => {
    const artifacts = [
      makeArtifact({ id: 'a1', path: 'zebra.yml', artifact_type: 'file' }),
      makeArtifact({ id: 'a2', path: 'alpha/file.yml', artifact_type: 'file' }),
      makeArtifact({ id: 'a3', path: 'beta.yml', artifact_type: 'file' }),
      makeArtifact({ id: 'a4', path: 'omega/file.yml', artifact_type: 'file' }),
    ]
    const tree = buildFileTree(artifacts)

    // Folders first (alpha, omega), then files (beta.yml, zebra.yml)
    expect(tree[0].isFolder).toBe(true)
    expect(tree[1].isFolder).toBe(true)
    expect(tree[2].isFolder).toBe(false)
    expect(tree[3].isFolder).toBe(false)

    // Alphabetical within groups
    expect(tree[0].name).toBe('alpha')
    expect(tree[1].name).toBe('omega')
    expect(tree[2].name).toBe('beta.yml')
    expect(tree[3].name).toBe('zebra.yml')
  })

  it('folder nodes have id prefixed with "folder:"', () => {
    const artifacts = [
      makeArtifact({ id: 'a1', path: 'group_vars/all.yml', artifact_type: 'variable_file' }),
    ]
    const tree = buildFileTree(artifacts)

    const folder = tree[0]
    expect(folder.isFolder).toBe(true)
    expect(folder.id).toMatch(/^folder:/)
    expect(folder.id).toBe('folder:group_vars')
  })

  it('file nodes carry the artifact reference and artifactType', () => {
    const artifact = makeArtifact({ id: 'a1', path: 'playbooks/deploy.yml', artifact_type: 'playbook' })
    const tree = buildFileTree([artifact])

    const file = tree[0].children[0]
    expect(file.isFolder).toBe(false)
    expect(file.artifact).toBeDefined()
    expect(file.artifact!.id).toBe('a1')
    expect(file.artifactType).toBe('playbook')
  })

  it('handles paths with trailing slash gracefully', () => {
    const artifacts = [
      makeArtifact({ id: 'a1', path: 'roles/webserver/', artifact_type: 'role' }),
    ]
    // Should not crash; trailing slash is either ignored or handled
    const tree = buildFileTree(artifacts)
    expect(tree).toBeDefined()
    expect(Array.isArray(tree)).toBe(true)
  })

  it('merges artifacts sharing the same intermediate folders', () => {
    const artifacts = [
      makeArtifact({ id: 'a1', path: 'vars/main.yml', artifact_type: 'variable_file' }),
      makeArtifact({ id: 'a2', path: 'vars/secrets.yml', artifact_type: 'variable_file' }),
    ]
    const tree = buildFileTree(artifacts)

    // Only one "vars" folder at root
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('vars')
    expect(tree[0].isFolder).toBe(true)
    expect(tree[0].children).toHaveLength(2)
  })
})
