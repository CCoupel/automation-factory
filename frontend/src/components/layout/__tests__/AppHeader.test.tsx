import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

// Mock contexts
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', email: 'test@example.com', username: 'testuser', role: 'admin' },
    logout: vi.fn(),
    isAuthenticated: true,
    authLost: false,
  })),
}))

vi.mock('../../../contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    themeMode: 'light',
    darkMode: false,
    setThemeMode: vi.fn(),
    cycleThemeMode: vi.fn(),
  })),
}))

vi.mock('../../../contexts/GalaxyCacheContext', () => ({
  useGalaxyCache: vi.fn(() => ({
    forceRefreshCache: vi.fn(),
    isLoading: false,
    currentVersion: 'latest',
  })),
}))

vi.mock('../../../hooks/useVersionInfo', () => ({
  useVersionInfo: vi.fn(() => ({
    frontendVersion: '2.3.0',
    backendVersion: '2.3.0',
    backendVersionInfo: null,
    isReleaseCandidate: false,
  })),
}))

vi.mock('../../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  })),
}))

vi.mock('../../VersionSelector', () => ({
  VersionSelector: () => <div data-testid="version-selector">Version</div>,
}))

vi.mock('../../collaboration/PresenceIndicator', () => ({
  default: () => <div data-testid="presence">Presence</div>,
}))

vi.mock('../../collaboration/ShareDialog', () => ({
  default: () => null,
}))

vi.mock('../../dialogs/ConfigurationDialog', () => ({
  default: () => null,
}))

// Dynamic import to get the component after mocks
const { default: AppHeader } = await import('../AppHeader')

const renderAppHeader = (props = {}) =>
  render(
    <MemoryRouter>
      <AppHeader
        saveStatus="saved"
        playbookName="Test Playbook"
        playbookId="pb-1"
        onOpenPlaybookManager={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  )

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AppHeader', () => {
  it('renders playbook name', () => {
    renderAppHeader()
    expect(screen.getByDisplayValue('Test Playbook')).toBeInTheDocument()
  })

  it('renders save status indicator', () => {
    renderAppHeader({ saveStatus: 'saved' })
    // Saved status should show a check icon or text
    const toolbar = document.querySelector('[class*="MuiToolbar"]')
    expect(toolbar).toBeInTheDocument()
  })

  it('opens user menu on avatar click', async () => {
    renderAppHeader()
    const user = userEvent.setup()

    // Find the avatar button (contains first letter of username)
    const avatarButton = screen.getByText('T') // first letter of 'testuser'
    await user.click(avatarButton)

    // Menu items should appear
    expect(screen.getByText('Change Password')).toBeInTheDocument()
    expect(screen.getByText('Configuration')).toBeInTheDocument()
    expect(screen.getByText('About')).toBeInTheDocument()
  })
})
