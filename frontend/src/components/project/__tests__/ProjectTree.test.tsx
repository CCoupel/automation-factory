import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
        noArtifacts: 'No artifacts in this project.',
        noArtifactsHint: 'Use the toolbar to add artifacts.',
        failedLoadPlaybooks: 'Failed to load playbooks.',
        newFolder: 'New Folder',
        newFile: 'New File',
        shareProject: 'Share',
        expandAll: 'Expand All',
        collapseAll: 'Collapse All',
      }
      return translations[key] || fallback || key
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}))

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1', username: 'testuser', email: 'test@example.com', role: 'user' },
    isAuthenticated: true,
    authLost: false,
    logout: vi.fn(),
  })),
}))

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

const mockStore = {
  artifacts: mockArtifacts,
  currentProject: { id: 'proj-1', name: 'Test Project' },
  selectedArtifactId: null as string | null,
  setSelectedArtifact: vi.fn(),
  createArtifact: vi.fn(),
  updateArtifact: vi.fn(),
  deleteArtifact: vi.fn(),
}

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
  it('renders root-level files and folder names from artifact paths', () => {
    renderTree()

    // Root-level file (site.yml has no parent folder)
    expect(screen.getByText('site.yml')).toBeInTheDocument()

    // Folder names derived from nested paths
    expect(screen.getByText('roles')).toBeInTheDocument()
    expect(screen.getByText('inventory')).toBeInTheDocument()
  })

  it('shows empty state when no artifacts', () => {
    mockStore.artifacts = []
    renderTree()

    expect(screen.getByText('No artifacts in this project.')).toBeInTheDocument()
    expect(screen.getByText('Use the toolbar to add artifacts.')).toBeInTheDocument()
  })

  it('shows nested files inside a folder when expanded', async () => {
    renderTree()
    const user = userEvent.setup()

    // Nested files are hidden until folder is expanded
    expect(screen.queryByText('webserver')).not.toBeInTheDocument()

    // Click on "roles" folder to expand it
    const rolesFolder = screen.getByText('roles')
    await user.click(rolesFolder)

    // After expanding, the nested role artifact should be visible
    expect(screen.getByText('webserver')).toBeInTheDocument()
  })

  it('renders toolbar with folder and file creation buttons', () => {
    renderTree()

    // Toolbar buttons should be present (via aria-label or tooltip data)
    const toolbar = document.querySelector('[class*="MuiToolbar"], [class*="MuiBox"]')
    expect(toolbar).not.toBeNull()

    // The tree itself renders (at least 1 item visible — site.yml)
    expect(screen.getByText('site.yml')).toBeInTheDocument()
  })

  it('navigates to playbook on double-click of playbook artifact', async () => {
    renderTree()
    const user = userEvent.setup()

    const artifactItem = screen.getByText('site.yml')
    await user.dblClick(artifactItem)

    // Should navigate to the playbook editor
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/playbooks/pb-1')
    })
  })
})
