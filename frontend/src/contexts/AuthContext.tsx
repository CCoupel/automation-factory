import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

/**
 * User interface representing authenticated user data
 */
export interface User {
  id: string
  email: string
  username: string
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

  /**
   * Load user session from localStorage on mount
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

    loadUserFromStorage()
  }, [])

  /**
   * Login user with email and password
   */
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call when backend is ready
      // For now, use mock authentication

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock successful login
      if (email && password) {
        const mockUser: User = {
          id: '1',
          email: email,
          username: email.split('@')[0],
          createdAt: new Date().toISOString()
        }

        const mockToken = 'mock-jwt-token-' + Date.now()

        // Store in state
        setUser(mockUser)
        setToken(mockToken)

        // Persist to localStorage
        localStorage.setItem('authToken', mockToken)
        localStorage.setItem('authUser', JSON.stringify(mockUser))

        return true
      }

      return false
    } catch (error) {
      console.error('Login error:', error)
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
      // TODO: Replace with actual API call when backend is ready
      // For now, use mock registration

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock successful registration
      if (email && username && password) {
        const mockUser: User = {
          id: Date.now().toString(),
          email: email,
          username: username,
          createdAt: new Date().toISOString()
        }

        const mockToken = 'mock-jwt-token-' + Date.now()

        // Store in state
        setUser(mockUser)
        setToken(mockToken)

        // Persist to localStorage
        localStorage.setItem('authToken', mockToken)
        localStorage.setItem('authUser', JSON.stringify(mockUser))

        return true
      }

      return false
    } catch (error) {
      console.error('Registration error:', error)
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

    // Clear localStorage
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
