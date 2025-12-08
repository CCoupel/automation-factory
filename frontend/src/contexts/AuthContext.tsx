import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getHttpClient } from '../utils/httpClient'
import { galaxyService } from '../services/galaxyService'

/**
 * User interface representing authenticated user data
 */
export interface User {
  id: string
  email: string
  username: string
  role?: 'user' | 'admin'
  createdAt?: string
}

/**
 * Authentication context interface
 */
interface AuthContextType {
  /**
   * Currently authenticated user, null if not authenticated
   */
  user: User | null

  /**
   * JWT token for API authentication
   */
  token: string | null

  /**
   * Loading state during authentication operations
   */
  isLoading: boolean

  /**
   * Authentication lost state (token expired/invalid)
   */
  authLost: boolean

  /**
   * Login function
   * @param email - User email
   * @param password - User password
   * @returns Promise resolving to success boolean
   */
  login: (email: string, password: string) => Promise<boolean>

  /**
   * Register function
   * @param email - User email
   * @param username - User username
   * @param password - User password
   * @returns Promise resolving to success boolean
   */
  register: (email: string, username: string, password: string) => Promise<boolean>

  /**
   * Logout function - clears user session
   */
  logout: () => void

  /**
   * Clear auth lost state (after re-login)
   */
  clearAuthLost: () => void

  /**
   * Check if user is authenticated
   */
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Hook to access authentication context
 * @throws Error if used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Authentication Provider Component
 *
 * Manages user authentication state and provides login/logout functionality.
 * Persists authentication token in localStorage for session persistence.
 *
 * Features:
 * - JWT token-based authentication
 * - Automatic token refresh from localStorage on mount
 * - User session persistence across page reloads
 * - Login, register, and logout operations
 *
 * Usage:
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authLost, setAuthLost] = useState(false)

  /**
   * Load user session from localStorage on mount and listen for auth events
   */
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const storedToken = localStorage.getItem('authToken')
        const storedUser = localStorage.getItem('authUser')

        if (storedToken && storedUser) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        }
      } catch (error) {
        console.error('Error loading user from storage:', error)
        // Clear invalid data
        localStorage.removeItem('authToken')
        localStorage.removeItem('authUser')
      } finally {
        setIsLoading(false)
      }
    }

    // Listen for authentication lost events from httpClient
    const handleAuthLost = (event: CustomEvent) => {
      console.warn('🔒 AUTH CONTEXT: Authentication lost detected', event.detail)
      setAuthLost(true)
    }

    loadUserFromStorage()
    
    // Add event listener for auth loss
    window.addEventListener('authLost', handleAuthLost as EventListener)

    // Cleanup
    return () => {
      window.removeEventListener('authLost', handleAuthLost as EventListener)
    }
  }, [])

  /**
   * Preload Galaxy data when user is authenticated
   */
  useEffect(() => {
    if (user && token && !authLost) {
      // Trigger preloading for faster subsequent access
      galaxyService.preloadOnStartup().then(() => {
        console.log('✅ Galaxy data preloaded successfully')
      }).catch((error) => {
        console.warn('⚠️ Galaxy data preload failed (non-blocking):', error)
      })
    }
  }, [user, token, authLost])

  /**
   * Login user with email and password
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const http = getHttpClient()
      const response = await http.post('/auth/login', {
        email,
        password
      })

      const { user: userData, token: userToken } = response.data

      // Map is_admin to role
      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: userData.is_admin ? 'admin' : 'user',
        createdAt: userData.created_at
      }

      // Store in state
      setUser(mappedUser)
      setToken(userToken)

      // Clear auth lost state on successful login
      setAuthLost(false)

      // Persist to localStorage
      localStorage.setItem('authToken', userToken)
      localStorage.setItem('authUser', JSON.stringify(mappedUser))

      return true
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Register new user
   */
  const register = async (email: string, username: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const http = getHttpClient()
      const response = await http.post('/auth/register', {
        email,
        username,
        password
      })

      const { user: userData, token: userToken } = response.data

      // Map is_admin to role
      const mappedUser: User = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: userData.is_admin ? 'admin' : 'user',
        createdAt: userData.created_at
      }

      // Store in state
      setUser(mappedUser)
      setToken(userToken)

      // Clear auth lost state on successful login
      setAuthLost(false)

      // Persist to localStorage
      localStorage.setItem('authToken', userToken)
      localStorage.setItem('authUser', JSON.stringify(mappedUser))

      return true
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Logout user and clear session
   */
  const logout = () => {
    // Clear state
    setUser(null)
    setToken(null)
    setAuthLost(false)

    // Clear localStorage
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
  }

  /**
   * Clear auth lost state (useful for manual refresh after re-login)
   */
  const clearAuthLost = () => {
    setAuthLost(false)
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    authLost,
    login,
    register,
    logout,
    clearAuthLost,
    isAuthenticated: !!user && !!token
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
