import { getHttpClient } from '../utils/httpClient'

/**
 * User interface for API responses
 */
export interface User {
  id: string
  email: string
  username: string
  createdAt?: string
}

/**
 * Login response interface
 */
interface LoginResponse {
  user: User
  token: string
}

/**
 * Register response interface
 */
interface RegisterResponse {
  user: User
  token: string
}

/**
 * Authentication Service
 *
 * Handles API calls for authentication operations.
 * This service will communicate with the FastAPI backend once it's implemented.
 *
 * TODO: Implement actual backend integration
 * - Replace mock responses with real API calls
 * - Add error handling and retry logic
 * - Implement token refresh mechanism
 * - Add request interceptors for JWT token
 */
export const authService = {
  /**
   * Login user with email and password
   *
   * @param email - User email
   * @param password - User password
   * @returns Promise with user data and JWT token
   *
   * TODO: Implement actual API call
   * POST /api/auth/login
   * Body: { email, password }
   * Response: { user, token }
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const http = getHttpClient()
      const response = await http.post('/auth/login', {
        email,
        password
      })
      return response.data
    } catch (error: any) {
      console.error('Login API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Login failed')
    }
  },

  /**
   * Register new user
   *
   * @param email - User email
   * @param username - User username
   * @param password - User password
   * @returns Promise with user data and JWT token
   *
   * TODO: Implement actual API call
   * POST /api/auth/register
   * Body: { email, username, password }
   * Response: { user, token }
   */
  async register(email: string, username: string, password: string): Promise<RegisterResponse> {
    try {
      const http = getHttpClient()
      const response = await http.post('/auth/register', {
        email,
        username,
        password
      })
      return response.data
    } catch (error: any) {
      console.error('Register API error:', error)
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail)
      }
      throw new Error('Registration failed')
    }
  },

  /**
   * Logout user
   *
   * @param token - JWT token to invalidate
   *
   * TODO: Implement actual API call
   * POST /api/auth/logout
   * Headers: { Authorization: Bearer <token> }
   */
  async logout(token: string): Promise<void> {
    try {
      const http = getHttpClient()
      await http.post('/auth/logout', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Logout API error:', error)
      // Don't throw error on logout - always clear local session
    }
  },

  /**
   * Verify token validity
   *
   * @param token - JWT token to verify
   * @returns Promise with user data if token is valid
   *
   * TODO: Implement actual API call
   * GET /api/auth/verify
   * Headers: { Authorization: Bearer <token> }
   * Response: { user }
   */
  async verifyToken(token: string): Promise<User> {
    try {
      const http = getHttpClient()
      const response = await http.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      return response.data
    } catch (error: any) {
      console.error('Token verification error:', error)
      throw new Error('Token verification failed')
    }
  }
}

/**
 * Axios interceptor to add JWT token to all requests
 *
 * TODO: Uncomment when backend is ready
 */
// axios.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('authToken')
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`
//     }
//     return config
//   },
//   (error) => {
//     return Promise.reject(error)
//   }
// )

/**
 * Axios interceptor to handle 401 responses (token expired)
 *
 * TODO: Uncomment when backend is ready
 */
// axios.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Token expired - clear session and redirect to login
//       localStorage.removeItem('authToken')
//       localStorage.removeItem('authUser')
//       window.location.href = '/login'
//     }
//     return Promise.reject(error)
//   }
// )
