import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material'

/**
 * Theme mode: 'light', 'dark', or 'system' (follows OS preference)
 */
export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  /**
   * Current theme mode setting (light/dark/system)
   */
  themeMode: ThemeMode
  /**
   * Resolved dark mode state (true if dark, false if light)
   * Takes into account system preference when themeMode is 'system'
   */
  darkMode: boolean
  /**
   * Set theme mode to a specific value
   */
  setThemeMode: (mode: ThemeMode) => void
  /**
   * Cycle through theme modes: light -> dark -> system -> light
   */
  cycleThemeMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

/**
 * Get system preference for dark mode
 */
const getSystemPreference = (): boolean => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load saved theme mode from localStorage, default to 'system'
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode')
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved
    }
    // Migration: check old darkMode boolean
    const oldDarkMode = localStorage.getItem('darkMode')
    if (oldDarkMode === 'true') return 'dark'
    if (oldDarkMode === 'false') return 'light'
    return 'system'
  })

  // Track system preference
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPreference)

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches)
    }

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Resolve actual dark mode based on themeMode and system preference
  const darkMode = useMemo(() => {
    if (themeMode === 'system') {
      return systemPrefersDark
    }
    return themeMode === 'dark'
  }, [themeMode, systemPrefersDark])

  // Update localStorage when themeMode changes
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode)
    // Clean up old key
    localStorage.removeItem('darkMode')
  }, [themeMode])

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode)
  }

  const cycleThemeMode = () => {
    setThemeModeState(prev => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'system'
      return 'light'
    })
  }

  // Create theme based on resolved dark mode
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#dc004e',
          },
          background: {
            default: darkMode ? '#121212' : '#f5f5f5',
            paper: darkMode ? '#1e1e1e' : '#ffffff',
          },
        },
      }),
    [darkMode]
  )

  const value: ThemeContextType = {
    themeMode,
    darkMode,
    setThemeMode,
    cycleThemeMode,
  }

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  )
}
