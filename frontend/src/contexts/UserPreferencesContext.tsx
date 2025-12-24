import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

/**
 * User preferences stored in localStorage
 */
export interface UserPreferences {
  // Collaboration settings
  highlightDurationMs: number  // Duration for collaboration highlight effect (default: 1500ms)
}

const DEFAULT_PREFERENCES: UserPreferences = {
  highlightDurationMs: 1500,
}

const STORAGE_KEY = 'ansible-builder-user-preferences'

interface UserPreferencesContextType {
  preferences: UserPreferences
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void
  resetPreferences: () => void
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined)

/**
 * Load preferences from localStorage
 */
const loadPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Merge with defaults to handle new preference keys
      return { ...DEFAULT_PREFERENCES, ...parsed }
    }
  } catch (error) {
    console.warn('Failed to load user preferences:', error)
  }
  return { ...DEFAULT_PREFERENCES }
}

/**
 * Save preferences to localStorage
 */
const savePreferences = (preferences: UserPreferences): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.warn('Failed to save user preferences:', error)
  }
}

interface UserPreferencesProviderProps {
  children: ReactNode
}

export const UserPreferencesProvider: React.FC<UserPreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences)

  // Save to localStorage whenever preferences change
  useEffect(() => {
    savePreferences(preferences)
  }, [preferences])

  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const resetPreferences = () => {
    setPreferences({ ...DEFAULT_PREFERENCES })
  }

  return (
    <UserPreferencesContext.Provider value={{ preferences, updatePreference, resetPreferences }}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

/**
 * Hook to access user preferences
 */
export const useUserPreferences = (): UserPreferencesContextType => {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider')
  }
  return context
}

export default UserPreferencesContext
