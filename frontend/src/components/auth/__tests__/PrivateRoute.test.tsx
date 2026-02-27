import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

// Mock useAuth — will be overridden per test
const mockUseAuth = vi.fn()
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

import PrivateRoute from '../PrivateRoute'

describe('PrivateRoute', () => {
  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })

    render(
      <MemoryRouter>
        <PrivateRoute>
          <div>Protected Content</div>
        </PrivateRoute>
      </MemoryRouter>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })

    render(
      <MemoryRouter initialEntries={['/app']}>
        <PrivateRoute>
          <div>Protected Content</div>
        </PrivateRoute>
      </MemoryRouter>
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('shows loading spinner while checking auth', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoading: true })

    render(
      <MemoryRouter>
        <PrivateRoute>
          <div>Protected Content</div>
        </PrivateRoute>
      </MemoryRouter>
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    expect(document.querySelector('[role="progressbar"]')).toBeInTheDocument()
  })
})
