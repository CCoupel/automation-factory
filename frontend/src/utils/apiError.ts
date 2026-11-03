/**
 * Shape of errors thrown by the HTTP client / API calls.
 * Use it to narrow `unknown` values caught in `catch` blocks.
 */
export interface ApiError {
  message?: string
  response?: {
    status?: number
    data?: {
      detail?: string
      [key: string]: unknown
    }
  }
}
