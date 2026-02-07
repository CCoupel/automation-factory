import { useState, useEffect } from 'react'
import { getHttpClient } from '../utils/httpClient'
import packageJson from '../../package.json'

/**
 * Backend version info structure
 */
export interface VersionInfo {
  version: string
  base_version: string
  internal_version: string
  environment: 'PROD' | 'STAGING' | 'DEV'
  name?: string
  description?: string
  is_rc: boolean
  features?: {
    title: string
    release_date: string
    features: string[]
    improvements: string[]
    technical: string[]
  }
}

/**
 * Hook return type
 */
export interface UseVersionInfoReturn {
  // Computed display versions (respects environment)
  frontendVersion: string
  backendVersion: string

  // Raw data
  backendVersionInfo: VersionInfo | null
  packageVersion: string

  // Computed flags
  isProduction: boolean
  isReleaseCandidate: boolean

  // State
  isLoading: boolean
  error: string | null
}

/**
 * Custom hook for version information management
 *
 * Provides consistent version display across the application:
 * - In PROD: Hides -rc.X suffix from both frontend and backend versions
 * - In STAGING/DEV: Shows full version including -rc.X suffix
 *
 * Usage:
 * ```tsx
 * const { frontendVersion, backendVersion, isReleaseCandidate } = useVersionInfo()
 * ```
 */
export function useVersionInfo(): UseVersionInfoReturn {
  const [backendVersionInfo, setBackendVersionInfo] = useState<VersionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch backend version on mount
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const httpClient = getHttpClient()
        const response = await httpClient.get<VersionInfo>('/version')
        setBackendVersionInfo(response.data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch backend version:', err)
        setError('Failed to fetch version')
        setBackendVersionInfo(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchVersion()
  }, [])

  // Compute display values based on environment
  const isProduction = backendVersionInfo?.environment === 'PROD'

  // Frontend version: remove RC suffix only in production
  const frontendVersion = isProduction
    ? packageJson.version.replace(/-rc\.\d+$/, '')
    : packageJson.version

  // Backend version: use the version from API (already computed by backend)
  const backendVersion = backendVersionInfo?.version || '...'

  // Is this a release candidate? (only true if RC exists AND not in prod)
  const isReleaseCandidate = backendVersionInfo?.is_rc ?? false

  return {
    frontendVersion,
    backendVersion,
    backendVersionInfo,
    packageVersion: packageJson.version,
    isProduction,
    isReleaseCandidate,
    isLoading,
    error
  }
}

export default useVersionInfo
