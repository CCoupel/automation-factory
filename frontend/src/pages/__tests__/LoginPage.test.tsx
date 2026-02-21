import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

// Mock AuthContext
const mockLogin = vi.fn()
const mockRegister = vi.fn()
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    login: mockLogin,
    register: mockRegister,
    isAuthenticated: false,
    isLoading: false,
    authLost: false,
  })),
}))

// Mock useVersionInfo
vi.mock('../../hooks/useVersionInfo', () => ({
  useVersionInfo: vi.fn(() => ({
    frontendVersion: '2.3.0',
    backendVersion: '2.3.0',
    isLoading: false,
    error: null,
  })),
  default: vi.fn(() => ({
    frontendVersion: '2.3.0',
    backendVersion: '2.3.0',
    isLoading: false,
    error: null,
  })),
}))

// Mock httpClient
vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => ({ get: vi.fn(), post: vi.fn() })),
}))

import LoginPage from '../LoginPage'

const renderLoginPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('LoginPage', () => {
  it('renders login form by default', () => {
    renderLoginPage()

    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
  })

  it('switches to register tab', async () => {
    renderLoginPage()
    const user = userEvent.setup()

    const tabs = screen.getAllByRole('tab')
    const registerTab = tabs[1] // Second tab is register
    await user.click(registerTab)

    // Username field should appear in register mode
    const inputs = screen.getAllByRole('textbox')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
  })

  it('shows validation error on empty submit', async () => {
    renderLoginPage()
    const user = userEvent.setup()

    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    await user.click(submitButton)

    // Should not call login with empty fields (HTML required validation blocks it)
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('calls login on valid submit', async () => {
    mockLogin.mockResolvedValue(true)
    renderLoginPage()
    const user = userEvent.setup()

    const emailInput = screen.getByRole('textbox', { name: /email/i })
    await user.type(emailInput, 'test@example.com')

    // Find password input (not a textbox role since type=password)
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    await user.type(passwordInputs[0], 'password123')

    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    await user.click(submitButton)

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
  })
})
