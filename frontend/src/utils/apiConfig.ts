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
  
  // Fallback to relative URL for development or when no injection
  console.log('Using fallback relative API URL: ./api')
  return './api'
}

/**
 * Log current API configuration for debugging
 */
export function logApiConfig(): void {
  console.log('API Configuration:', {
    injectedUrl: (window as any).__API_URL__,
    basePath: (window as any).__BASE_PATH__,
    currentUrl: getApiBaseUrl()
  })
}