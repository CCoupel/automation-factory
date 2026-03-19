import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectArtifact } from '../../../services/projectService'

// --- Mock data ---

const mockArtifacts: ProjectArtifact[] = [
  {
    id: 'art-1',
    project_id: 'proj-1',
    artifact_type: 'playbook',
    path: 'site.yml',
    content: { playbook_id: 'pb-1' },
    raw_content: null,
    version: 1,
    metadata: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'art-2',
    project_id: 'proj-1',
    artifact_type: 'role',
    path: 'roles/webserver',
    content: null,
    raw_content: null,
    version: 1,
    metadata: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'art-3',
    project_id: 'proj-1',
    artifact_type: 'inventory',
    path: 'inventory/hosts.yml',
    content: null,
    raw_content: null,
    version: 1,
    metadata: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

// --- Mocks ---

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'artifactTypes.playbook': 'Playbooks',
        'artifactTypes.role': 'Roles',
        'artifactTypes.inventory': 'Inventory',
        'artifactTypes.variable_file': 'Variables',
        'artifactTypes.template': 'Templates',
        'artifactTypes.collection_requirements': 'Collections',
        'artifactTypes.custom_module': 'Modules',
        'artifactTypes.ansible_cfg': 'Configuration',
        'artifactTypes.file': 'Files',
        noArtifacts: 'No artifacts in this project.',
        noArtifactsHint: 'Use the toolbar to add artifacts.',
        noLinkedPlaybook: 'No linked playbook found.',
        failedLoadPlaybooks: 'Failed to load playbooks.',
        comingSoon: 'Editor coming soon.',
        openArtifact: 'Open',
        deleteArtifact: 'Delete',
      }
      return translations[key] || fallback || key
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

const mockStore = {
  artifacts: mockArtifacts,
  currentProject: { id: 'proj-1', name: 'Test Project' },
  selectedArtifactId: null as string | null,
  setSelectedArtifact: vi.fn(),
  createArtifact: vi.fn(),
  updateArtifact: vi.fn(),
  deleteArtifact: vi.fn(),
}

vi.mock('../../../contexts/CollaborationContext', () => ({
  useCollaboration: vi.fn(() => ({
    connectedUsers: [],
    sendUpdate: vi.fn(),
    isConnected: true,
    connectToProject: vi.fn(),
    disconnectFromProject: vi.fn(),
    lastUpdate: null,
  })),
}))

vi.mock('../../../stores/projectStore', () => ({
  useProjectStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}))

vi.mock('../../../services/playbookService', () => ({
  playbookService: {
    listPlaybooks: vi.fn().mockResolvedValue([
      { id: 'pb-1', name: 'site.yml' },
    ]),
  },
  Playbook: {},
}))

const { default: ProjectTree } = await import('../ProjectTree')

const renderTree = () =>
  render(
    <MemoryRouter>
      <ProjectTree />
    </MemoryRouter>
  )

beforeEach(() => {
  vi.clearAllMocks()
  mockStore.artifacts = mockArtifacts
  mockStore.currentProject = { id: 'proj-1', name: 'Test Project' } as any
  mockStore.selectedArtifactId = null
})

describe('ProjectTree', () => {
  it('renders artifact type groups from mock artifacts', () => {
    renderTree()

    // Should show the group headers for types present in mockArtifacts
    expect(screen.getByText('Playbooks')).toBeInTheDocument()
    expect(screen.getByText('Roles')).toBeInTheDocument()
    expect(screen.getByText('Inventory')).toBeInTheDocument()
  })

  it('shows artifact count chips per group', () => {
    renderTree()

    // Each group has a chip with count — playbook has 1 artifact
    const chips = screen.getAllByText('1')
    expect(chips.length).toBeGreaterThanOrEqual(3) // 3 groups each with 1 artifact
  })

  it('shows empty state when no artifacts', () => {
    mockStore.artifacts = []
    renderTree()

    expect(screen.getByText('No artifacts in this project.')).toBeInTheDocument()
    expect(screen.getByText('Use the toolbar to add artifacts.')).toBeInTheDocument()
  })

  it('expands playbook group by default and shows artifact paths', () => {
    renderTree()

    // Playbook group is expanded by default — site.yml should be visible
    expect(screen.getByText('site.yml')).toBeInTheDocument()
  })

  it('toggles group expansion on click', async () => {
    renderTree()
    const user = userEvent.setup()

    // Click on "Roles" group to expand it
    const rolesGroup = screen.getByText('Roles')
    await user.click(rolesGroup)

    // After expanding, the role artifact path should be visible
    expect(screen.getByText('roles/webserver')).toBeInTheDocument()

    // Click again to collapse
    await user.click(rolesGroup)
  })

  it('selects an artifact on single click', async () => {
    renderTree()
    const user = userEvent.setup()

    // site.yml is visible in the expanded playbook group
    const artifactItem = screen.getByText('site.yml')
    await user.click(artifactItem)

    // The list item should have the selected state (MUI adds Mui-selected class)
    const listItemButton = artifactItem.closest('[class*="MuiListItemButton"]')
    expect(listItemButton).toHaveClass('Mui-selected')
  })

  it('opens context menu on right-click', async () => {
    renderTree()
    const user = userEvent.setup()

    const artifactItem = screen.getByText('site.yml')

    // Right-click to open context menu
    await user.pointer({ keys: '[MouseRight]', target: artifactItem })

    // Context menu items should appear
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('navigates to playbook on double-click of playbook artifact', async () => {
    renderTree()
    const user = userEvent.setup()

    const artifactItem = screen.getByText('site.yml')
    await user.dblClick(artifactItem)

    // Should navigate to the playbook editor
    // Wait for async playbookService call
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/playbooks/pb-1')
    })
  })

  it('sorts groups by configured order (playbook before role before inventory)', () => {
    renderTree()

    const allText = document.body.textContent || ''
    const playbookPos = allText.indexOf('Playbooks')
    const rolesPos = allText.indexOf('Roles')
    const inventoryPos = allText.indexOf('Inventory')

    expect(playbookPos).toBeLessThan(rolesPos)
    expect(rolesPos).toBeLessThan(inventoryPos)
  })
})
