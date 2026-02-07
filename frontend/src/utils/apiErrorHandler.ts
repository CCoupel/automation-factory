/**
 * API Error Handler Utility
 *
 * Centralizes error handling for API calls to eliminate duplication across services.
 * Provides consistent error extraction and formatting.
 */

import { AxiosError } from 'axios'

/**
 * Standard API error response structure from FastAPI
 */
interface ApiErrorResponse {
  detail?: string | { msg: string }[]
  message?: string
}

/**
 * HTTP status code to default error message mapping
 */
const STATUS_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  401: 'Authentication required',
  403: 'Access denied',
  404: 'Resource not found',
  409: 'Resource already exists',
  422: 'Validation error',
  429: 'Too many requests',
  500: 'Server error',
  502: 'Bad gateway',
  503: 'Service unavailable',
  504: 'Gateway timeout'
}

/**
 * Extract error message from API response
 *
 * Handles various response formats:
 * - { detail: "message" }
 * - { detail: [{ msg: "message" }] }
 * - { message: "message" }
 * - Plain string response
 * - Stringified JSON
 *
 * @param error - Axios error object
 * @returns Extracted error message or undefined
 */
export function extractErrorMessage(error: AxiosError<ApiErrorResponse | string>): string | undefined {
  const data = error.response?.data

  if (!data) return undefined

  // Handle string response (might be stringified JSON)
  if (typeof data === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(data)
      if (parsed.detail) {
        return typeof parsed.detail === 'string'
          ? parsed.detail
          : JSON.stringify(parsed.detail)
      }
      if (parsed.message) {
        return parsed.message
      }
    } catch {
      // Not JSON - return as-is if it looks like an error message
      if (data.length < 200 && !data.includes('<')) {
        return data
      }
    }
    return undefined
  }

  // Handle object with detail property (FastAPI standard)
  if (typeof data === 'object' && data !== null) {
    // String detail
    if (typeof data.detail === 'string') {
      return data.detail
    }

    // Array of validation errors (Pydantic)
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      return data.detail.map(d => d.msg).join(', ')
    }

    // Generic message property
    if (data.message) {
      return data.message
    }
  }

  return undefined
}

/**
 * Get default error message for HTTP status code
 *
 * @param status - HTTP status code
 * @returns Default error message
 */
export function getStatusErrorMessage(status?: number): string {
  if (!status) return 'Network error'
  return STATUS_ERROR_MESSAGES[status] || `Error ${status}`
}

/**
 * Handle API error and throw with extracted message
 *
 * @param error - The caught error (usually AxiosError)
 * @param defaultMessage - Default message if no specific error found
 * @param context - Optional context for logging (e.g., "sharePlaybook")
 * @throws Error with extracted or default message
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string,
  context?: string
): never {
  // Log error for debugging
  if (context) {
    console.error(`[${context}] API Error:`, error)
  }

  // Handle Axios errors
  if (isAxiosError(error)) {
    const extractedMessage = extractErrorMessage(error)

    if (extractedMessage) {
      throw new Error(extractedMessage)
    }

    // Fall back to status-based message
    const statusMessage = getStatusErrorMessage(error.response?.status)
    throw new Error(`${defaultMessage}: ${statusMessage}`)
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    throw error
  }

  // Handle unknown errors
  throw new Error(defaultMessage)
}

/**
 * Type guard for Axios errors
 */
function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  )
}

/**
 * Wrapper for async API calls with standardized error handling
 *
 * @param apiCall - Async function that makes the API call
 * @param defaultMessage - Default error message
 * @param context - Optional context for logging
 * @returns Result of the API call
 * @throws Error with extracted or default message
 *
 * @example
 * const result = await withApiErrorHandling(
 *   () => http.get('/api/data'),
 *   'Failed to fetch data',
 *   'fetchData'
 * )
 */
export async function withApiErrorHandling<T>(
  apiCall: () => Promise<T>,
  defaultMessage: string,
  context?: string
): Promise<T> {
  try {
    return await apiCall()
  } catch (error) {
    handleApiError(error, defaultMessage, context)
  }
}

/**
 * Create a typed API error
 * Useful for creating consistent error objects
 */
export class ApiError extends Error {
  public readonly statusCode?: number
  public readonly context?: string

  constructor(message: string, statusCode?: number, context?: string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.context = context
  }
}
