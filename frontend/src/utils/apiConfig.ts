/**
 * API Configuration Utility
 * Centralizes API URL management for the application
 */

/**
 * Get API base URL dynamically
 * Uses runtime-injected API URL from docker-entrypoint.sh or fallback to relative
 * This ensures all API calls use the correct URL based on deployment configuration
 */
export function getApiBaseUrl(): string {
  // Check for runtime-injected API URL first (set by docker-entrypoint.sh)
  const apiUrl = (window as any).__API_URL__
  if (apiUrl) {
    console.log('Using injected API URL:', apiUrl)
    return apiUrl
  }
  
  // Fallback for development - check if we're in local dev mode
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '192.168.1.84') {
    // Check if we're behind nginx proxy (port 80) or direct Vite (port 5173+)
    const isNginxProxy = window.location.port === '' || window.location.port === '80'
    
    if (isNginxProxy) {
      // 3-component architecture: nginx reverse proxy
      console.log('Using 3-component architecture (nginx proxy): /api')
      return '/api'
    } else {
      // Direct Vite dev server (fallback)
      console.log('Using direct backend API (no proxy): http://localhost:8000/api')
      return 'http://localhost:8000/api'
    }
  }
  
  // Fallback to relative URL for production
  console.log('Using fallback relative API URL: ./api')
  return './api'
}

/**
 * Get Frontend base URL dynamically
 * Uses runtime-injected BASE_PATH from docker-entrypoint.sh
 */
export function getFrontendBaseUrl(): string {
  // Check for runtime-injected base path first
  const basePath = (window as any).__BASE_PATH__
  if (basePath && basePath !== '/') {
    console.log('Using injected frontend base path:', basePath)
    return basePath
  }
  
  // Fallback to current origin for production/development
  return window.location.origin + window.location.pathname.replace(/\/$/, '')
}

/**
 * Log current API configuration for debugging
 */
export function logApiConfig(): void {
  console.log('API Configuration:', {
    injectedUrl: (window as any).__API_URL__,
    basePath: (window as any).__BASE_PATH__,
    currentUrl: getApiBaseUrl(),
    frontendBaseUrl: getFrontendBaseUrl()
  })
}