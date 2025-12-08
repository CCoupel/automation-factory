/**
 * HTTP Client Configuration
 * Creates a pre-configured axios instance with correct base URL
 */

import axios, { AxiosInstance } from 'axios'
import { getApiBaseUrl } from './apiConfig'

// Create a configured axios instance
let httpClient: AxiosInstance | null = null

const createHttpClient = (): AxiosInstance => {
  const baseURL = getApiBaseUrl()
  
  console.log('🔧 HTTP CLIENT: Creating axios instance with baseURL:', baseURL)
  console.log('🔧 HTTP CLIENT: window.__API_URL__ =', (window as any).__API_URL__)
  
  const client = axios.create({
    baseURL: baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    }
  })

  // Add request interceptor for authentication
  client.interceptors.request.use(
    (config) => {
      // Auto-inject JWT token if available
      const token = localStorage.getItem('authToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      console.log('🚀 HTTP REQUEST:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullUrl: `${config.baseURL}${config.url}`,
        hasAuth: !!token
      })
      return config
    },
    (error) => {
      console.error('❌ HTTP REQUEST ERROR:', error)
      return Promise.reject(error)
    }
  )

  // Add response interceptor for auth error handling
  client.interceptors.response.use(
    (response) => {
      console.log('✅ HTTP RESPONSE:', {
        status: response.status,
        url: response.config.url,
        data: typeof response.data === 'object' ? 'JSON Object' : response.data
      })
      return response
    },
    (error) => {
      console.error('❌ HTTP ERROR:', {
        message: error.message,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        fullUrl: error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown'
      })

      // Handle 401 Unauthorized - token expired or invalid
      if (error.response?.status === 401) {
        console.warn('🔒 AUTHENTICATION LOST: Token expired or invalid')
        
        // Notify auth context of lost authentication
        window.dispatchEvent(new CustomEvent('authLost', { 
          detail: { reason: 'token_expired', url: error.config?.url } 
        }))
      }

      return Promise.reject(error)
    }
  )

  return client
}

// Get or create the HTTP client instance
export const getHttpClient = (): AxiosInstance => {
  if (!httpClient) {
    httpClient = createHttpClient()
  }
  return httpClient
}

// Reset the client (useful for testing or when config changes)
export const resetHttpClient = (): void => {
  httpClient = null
}