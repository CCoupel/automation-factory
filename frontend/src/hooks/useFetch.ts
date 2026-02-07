/**
 * Generic useFetch Hook
 *
 * A reusable hook for data fetching with loading, error, and refetch support.
 * Eliminates boilerplate code in components that need to fetch data.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Result type for useFetch hook
 */
export interface UseFetchResult<T> {
  /** The fetched data, or null if not yet loaded or on error */
  data: T | null
  /** Whether the fetch is currently in progress */
  loading: boolean
  /** Error message if fetch failed, null otherwise */
  error: string | null
  /** Function to trigger a refetch */
  refetch: () => Promise<void>
}

/**
 * Options for useFetch hook
 */
export interface UseFetchOptions {
  /** Whether to fetch immediately on mount (default: true) */
  immediate?: boolean
  /** Whether to reset data to null before refetching (default: false) */
  resetOnRefetch?: boolean
}

/**
 * Generic data fetching hook
 *
 * @example
 * ```typescript
 * // Simple usage
 * const { data, loading, error } = useFetch(
 *   () => api.getUsers(),
 *   []
 * )
 *
 * // With dependencies
 * const { data, loading, refetch } = useFetch(
 *   () => api.getUser(userId),
 *   [userId]
 * )
 *
 * // Deferred loading
 * const { data, loading, refetch } = useFetch(
 *   () => api.getUsers(),
 *   [],
 *   { immediate: false }
 * )
 * // Later: refetch()
 * ```
 *
 * @param fetchFn - Async function that returns the data
 * @param deps - Dependency array (triggers refetch when changed)
 * @param options - Hook options
 * @returns Object with data, loading, error, and refetch function
 */
export function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseFetchOptions = {}
): UseFetchResult<T> {
  const { immediate = true, resetOnRefetch = false } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<string | null>(null)

  // Track if component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true)

  // Track the current fetch to avoid race conditions
  const fetchIdRef = useRef(0)

  const fetch = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current

    if (resetOnRefetch) {
      setData(null)
    }
    setLoading(true)
    setError(null)

    try {
      const result = await fetchFn()

      // Only update state if this is still the latest fetch and component is mounted
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setData(result)
      }
    } catch (e) {
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred'
        setError(message)
      }
    } finally {
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mountedRef.current = true

    if (immediate) {
      fetch()
    }

    return () => {
      mountedRef.current = false
    }
  }, [fetch, immediate])

  return { data, loading, error, refetch: fetch }
}

/**
 * useFetch with initial data
 *
 * Similar to useFetch but with an initial value instead of null
 *
 * @param fetchFn - Async function that returns the data
 * @param initialData - Initial value before fetch completes
 * @param deps - Dependency array
 * @param options - Hook options
 */
export function useFetchWithInitial<T>(
  fetchFn: () => Promise<T>,
  initialData: T,
  deps: React.DependencyList = [],
  options: UseFetchOptions = {}
): UseFetchResult<T> & { data: T } {
  const result = useFetch(fetchFn, deps, options)

  return {
    ...result,
    data: result.data ?? initialData
  }
}
