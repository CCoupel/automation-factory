import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { ThemeProvider, useTheme } from '../ThemeContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)

beforeEach(() => {
  localStorage.clear()
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('ThemeContext', () => {
  it('defaults to system mode', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.themeMode).toBe('system')
  })

  it('can set to dark mode', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setThemeMode('dark')
    })

    expect(result.current.themeMode).toBe('dark')
    expect(result.current.darkMode).toBe(true)
  })

  it('cycles through modes: light -> dark -> system', () => {
    localStorage.setItem('themeMode', 'light')
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.themeMode).toBe('light')

    act(() => result.current.cycleThemeMode())
    expect(result.current.themeMode).toBe('dark')

    act(() => result.current.cycleThemeMode())
    expect(result.current.themeMode).toBe('system')

    act(() => result.current.cycleThemeMode())
    expect(result.current.themeMode).toBe('light')
  })

  it('persists mode to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setThemeMode('dark')
    })

    expect(localStorage.getItem('themeMode')).toBe('dark')
  })
})
