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
  /** DEPRECATED — alias of is_build_candidate, kept for backward compat */
  is_rc: boolean
  /** Build counter (the 4th segment `a` of X.Y.Z.a), null when absent (PROD image) */
  build?: number | null
  /** true iff build != null AND environment != 'PROD' */
  is_build_candidate?: boolean
  features?: {
    title: string
    release_date: string
    features: string[]
    improvements: string[]
    technical: string[]
  }
}

/**
 * Strips the environment-hidden suffix from a raw version string.
 *
 * Supports two formats:
 * - Current (`X.Y.Z.a`): strips the trailing 4th segment (the build counter).
 * - Legacy (`X.Y.Z-rc.n`): strips the `-rc.n` suffix, kept for backward compat
 *   during the transition away from the old versioning scheme.
 */
function stripBuildSuffix(version: string): string {
  const fourSegmentMatch = version.match(/^(\d+\.\d+\.\d+)\.\d+$/)
  if (fourSegmentMatch) {
    return fourSegmentMatch[1]
  }
  return version.replace(/-rc\.\d+$/, '')
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
 * - In PROD: Hides the build counter (4th segment `.a`) from both frontend and
 *   backend versions — e.g. `2.4.4.3` → `2.4.4`. Legacy `-rc.n` suffixes are
 *   also stripped for backward compat during the transition.
 * - In STAGING/DEV: Shows the full version including the build counter
 *   (`X.Y.Z.a`) or the legacy `-rc.n` suffix.
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

  // Frontend version: remove the build counter (4th segment) / legacy -rc.n suffix only in production
  const frontendVersion = isProduction
    ? stripBuildSuffix(packageJson.version)
    : packageJson.version

  // Backend version: use the version from API (already computed by backend)
  const backendVersion = backendVersionInfo?.version || '...'

  // Is this a build candidate? (new explicit field, falls back to legacy is_rc)
  const isReleaseCandidate = backendVersionInfo?.is_build_candidate ?? backendVersionInfo?.is_rc ?? false

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
