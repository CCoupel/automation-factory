import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock httpClient
const mockGet = vi.fn()
vi.mock('../../utils/httpClient', () => ({
  getHttpClient: vi.fn(() => ({ get: mockGet })),
}))

// Mock package.json — surchargé par test via vi.doMock si besoin d'une valeur différente
vi.mock('../../../package.json', () => ({
  default: { version: '2.4.4.3' },
}))

import { useVersionInfo } from '../useVersionInfo'

beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * Migration versioning X.Y.Z.a (contrats C-1/C-2, contracts/version-format.md, contracts/http-endpoints.md)
 * Matrice couverte : PROD/STAGING × formats {X.Y.Z.a, X.Y.Z, legacy X.Y.Z-rc.n}
 */
describe('useVersionInfo', () => {
  it('fetches backend version on mount (STAGING, format X.Y.Z.a)', async () => {
    mockGet.mockResolvedValue({
      data: {
        version: '2.4.4.3',
        base_version: '2.4.4',
        internal_version: '2.4.4.3',
        environment: 'STAGING',
        is_rc: true,
        build: 3,
        is_build_candidate: true,
      },
    })

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.backendVersion).toBe('2.4.4.3')
    expect(result.current.isReleaseCandidate).toBe(true)
  })

  it('strips the 4th segment (build) from the frontend version in production', async () => {
    mockGet.mockResolvedValue({
      data: {
        version: '2.4.4',
        base_version: '2.4.4',
        internal_version: '2.4.4',
        environment: 'PROD',
        is_rc: false,
        build: null,
        is_build_candidate: false,
      },
    })

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // packageJson mocké à '2.4.4.3' (cf. mock module ci-dessus) : le hook doit retirer le 4e
    // segment en PROD, y compris si un artefact de build QUALIF a été livré par erreur.
    expect(result.current.frontendVersion).toBe('2.4.4')
    expect(result.current.isProduction).toBe(true)
    expect(result.current.isReleaseCandidate).toBe(false)
  })

  it('keeps the full X.Y.Z.a version in staging', async () => {
    mockGet.mockResolvedValue({
      data: {
        version: '2.4.4.3',
        base_version: '2.4.4',
        internal_version: '2.4.4.3',
        environment: 'STAGING',
        is_rc: true,
        build: 3,
        is_build_candidate: true,
      },
    })

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.frontendVersion).toBe('2.4.4.3')
  })

  it('does not alter a package.json already at X.Y.Z (post-release, no build segment)', async () => {
    vi.resetModules()
    vi.doMock('../../../package.json', () => ({ default: { version: '2.4.4' } }))
    vi.doMock('../../utils/httpClient', () => ({
      getHttpClient: vi.fn(() => ({ get: mockGet })),
    }))
    mockGet.mockResolvedValue({
      data: {
        version: '2.4.4',
        base_version: '2.4.4',
        internal_version: '2.4.4',
        environment: 'PROD',
        is_rc: false,
        build: null,
        is_build_candidate: false,
      },
    })

    const { useVersionInfo: freshUseVersionInfo } = await import('../useVersionInfo')
    const { result } = renderHook(() => freshUseVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.frontendVersion).toBe('2.4.4')
    expect(result.current.packageVersion).toBe('2.4.4')
  })

  it('[non-regression] strips the legacy -rc.n suffix in production', async () => {
    vi.resetModules()
    vi.doMock('../../../package.json', () => ({ default: { version: '2.4.3-rc.2' } }))
    vi.doMock('../../utils/httpClient', () => ({
      getHttpClient: vi.fn(() => ({ get: mockGet })),
    }))
    mockGet.mockResolvedValue({
      data: {
        version: '2.4.3',
        base_version: '2.4.3',
        internal_version: '2.4.3-rc.2',
        environment: 'PROD',
        is_rc: false,
        build: null,
      },
    })

    const { useVersionInfo: freshUseVersionInfo } = await import('../useVersionInfo')
    const { result } = renderHook(() => freshUseVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.frontendVersion).toBe('2.4.3')
  })

  it('[non-regression] shows the full legacy -rc.n version in staging', async () => {
    vi.resetModules()
    vi.doMock('../../../package.json', () => ({ default: { version: '2.4.3-rc.2' } }))
    vi.doMock('../../utils/httpClient', () => ({
      getHttpClient: vi.fn(() => ({ get: mockGet })),
    }))
    mockGet.mockResolvedValue({
      data: {
        version: '2.4.3-rc.2',
        base_version: '2.4.3',
        internal_version: '2.4.3-rc.2',
        environment: 'STAGING',
        is_rc: true,
        build: null,
      },
    })

    const { useVersionInfo: freshUseVersionInfo } = await import('../useVersionInfo')
    const { result } = renderHook(() => freshUseVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.frontendVersion).toBe('2.4.3-rc.2')
  })

  it('falls back to is_rc for isReleaseCandidate when is_build_candidate is absent (legacy backend payload)', async () => {
    mockGet.mockResolvedValue({
      data: {
        version: '2.4.3-rc.2',
        base_version: '2.4.3',
        internal_version: '2.4.3-rc.2',
        environment: 'STAGING',
        is_rc: true,
        // is_build_candidate volontairement absent (contrat rétrocompat legacy, C-1)
      },
    })

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isReleaseCandidate).toBe(true)
  })

  it('prefers is_build_candidate over is_rc when both are present and diverge', async () => {
    mockGet.mockResolvedValue({
      data: {
        version: '2.4.4.3',
        base_version: '2.4.4',
        internal_version: '2.4.4.3',
        environment: 'STAGING',
        is_rc: false, // valeur volontairement incohérente pour isoler la priorité
        build: 3,
        is_build_candidate: true,
      },
    })

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isReleaseCandidate).toBe(true)
  })

  it('detects a QUALIF image deployed by mistake in PROD (build != null, is_rc forced false by backend)', async () => {
    mockGet.mockResolvedValue({
      data: {
        version: '2.4.4',
        base_version: '2.4.4',
        internal_version: '2.4.4.3',
        environment: 'PROD',
        is_rc: false,
        build: 3,
        is_build_candidate: false,
      },
    })

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Le hook ne bloque pas l'affichage (rôle du smoke test / QA), mais expose bien les
    // métadonnées permettant à l'UI/QA de détecter l'anomalie (build renseigné en PROD).
    expect(result.current.backendVersionInfo?.build).toBe(3)
    expect(result.current.isProduction).toBe(true)
    expect(result.current.isReleaseCandidate).toBe(false)
  })

  it('handles fetch error', async () => {
    mockGet.mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useVersionInfo())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.backendVersion).toBe('...')
  })
})
