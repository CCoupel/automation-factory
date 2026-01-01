/**
 * Galaxy Roles API Service
 *
 * Fetches roles from Ansible Galaxy:
 * - API v1: Standalone/legacy roles (author.role_name format)
 * - API v3: Collection roles (namespace.collection.role format)
 * - Supports private Galaxy (AAP / Galaxy NG)
 */

import { getHttpClient } from '../utils/httpClient'

// ========================================
// Types
// ========================================

/**
 * Standalone role from Galaxy v1 API
 */
export interface StandaloneRole {
  id: number
  name: string
  namespace: string
  description: string
  download_count: number
  github_user: string
  github_repo: string
  created?: string
  modified?: string
  fqrn: string  // Fully Qualified Role Name: namespace.name
  type: 'standalone'
}

/**
 * Collection role from Galaxy v3 API
 */
export interface CollectionRole {
  name: string
  namespace: string
  collection: string
  description: string
  fqcn: string  // namespace.collection.role
  type: 'collection'
  doc_url?: string
}

/**
 * Namespace with statistics
 */
export interface RoleNamespace {
  name: string
  role_count: number
  total_downloads: number
}

/**
 * Paginated response for standalone roles
 */
export interface StandaloneRolesResponse {
  count: number
  next: string | null
  previous: string | null
  results: StandaloneRole[]
}

/**
 * Galaxy configuration
 */
export interface GalaxyConfig {
  public_url: string
  public_enabled: boolean
  private_configured: boolean
  private_url: string | null
  preferred_source: 'public' | 'private' | 'both'
}

/**
 * Galaxy source type
 */
export type GalaxySource = 'public' | 'private'

// ========================================
// Cache
// ========================================

const standaloneCache = new Map<string, { data: StandaloneRolesResponse; timestamp: number }>()
const collectionCache = new Map<string, { data: CollectionRole[]; timestamp: number }>()
const namespacesCache = new Map<string, { data: RoleNamespace[]; timestamp: number }>()
let configCache: { data: GalaxyConfig; timestamp: number } | null = null

const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL
}

// ========================================
// Standalone Roles (API v1)
// ========================================

/**
 * Get standalone roles from Galaxy v1 API
 */
export async function getStandaloneRoles(params: {
  search?: string
  namespace?: string
  page?: number
  pageSize?: number
  source?: GalaxySource
  orderBy?: string
}): Promise<StandaloneRolesResponse> {
  const {
    search = '',
    namespace = '',
    page = 1,
    pageSize = 50,
    source = 'public',
    orderBy = '-download_count'
  } = params

  const cacheKey = `standalone:${source}:${namespace}:${search}:${page}:${pageSize}`
  const cached = standaloneCache.get(cacheKey)
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data
  }

  try {
    const httpClient = getHttpClient()
    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      source,
      order_by: orderBy
    })
    if (search) queryParams.set('search', search)
    if (namespace) queryParams.set('namespace', namespace)

    const response = await httpClient.get<StandaloneRolesResponse>(
      `/galaxy-roles/standalone?${queryParams.toString()}`
    )

    standaloneCache.set(cacheKey, { data: response.data, timestamp: Date.now() })
    return response.data
  } catch (error) {
    console.error('Failed to fetch standalone roles:', error)
    return { count: 0, next: null, previous: null, results: [] }
  }
}

/**
 * Get standalone role details
 */
export async function getStandaloneRoleDetails(
  namespace: string,
  name: string,
  source: GalaxySource = 'public'
): Promise<StandaloneRole | null> {
  try {
    const httpClient = getHttpClient()
    const response = await httpClient.get<StandaloneRole>(
      `/galaxy-roles/standalone/${namespace}/${name}?source=${source}`
    )
    return response.data
  } catch (error) {
    console.error(`Failed to fetch role ${namespace}.${name}:`, error)
    return null
  }
}

/**
 * Get popular role namespaces (authors)
 */
export async function getPopularNamespaces(
  source: GalaxySource = 'public',
  limit: number = 20
): Promise<RoleNamespace[]> {
  const cacheKey = `namespaces:${source}:${limit}`
  const cached = namespacesCache.get(cacheKey)
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data
  }

  try {
    const httpClient = getHttpClient()
    const response = await httpClient.get<RoleNamespace[]>(
      `/galaxy-roles/standalone/namespaces?source=${source}&limit=${limit}`
    )

    namespacesCache.set(cacheKey, { data: response.data, timestamp: Date.now() })
    return response.data
  } catch (error) {
    console.error('Failed to fetch popular namespaces:', error)
    return []
  }
}

// ========================================
// Collection Roles (API v3)
// ========================================

/**
 * Get roles from a collection
 */
export async function getCollectionRoles(
  namespace: string,
  collection: string,
  version: string = 'latest',
  source: GalaxySource = 'public'
): Promise<CollectionRole[]> {
  const cacheKey = `collection:${source}:${namespace}:${collection}:${version}`
  const cached = collectionCache.get(cacheKey)
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data
  }

  try {
    const httpClient = getHttpClient()
    const response = await httpClient.get<CollectionRole[]>(
      `/galaxy-roles/collections/${namespace}/${collection}/roles?version=${version}&source=${source}`
    )

    collectionCache.set(cacheKey, { data: response.data, timestamp: Date.now() })
    return response.data
  } catch (error) {
    console.error(`Failed to fetch roles for ${namespace}.${collection}:`, error)
    return []
  }
}

/**
 * Search for roles across collections
 */
export async function searchCollectionRoles(
  query: string,
  source: GalaxySource = 'public',
  limit: number = 50
): Promise<CollectionRole[]> {
  try {
    const httpClient = getHttpClient()
    const response = await httpClient.get<CollectionRole[]>(
      `/galaxy-roles/collections/search?query=${encodeURIComponent(query)}&source=${source}&limit=${limit}`
    )
    return response.data
  } catch (error) {
    console.error('Failed to search collection roles:', error)
    return []
  }
}

// ========================================
// Configuration
// ========================================

/**
 * Get Galaxy configuration
 */
export async function getGalaxyConfig(): Promise<GalaxyConfig> {
  if (configCache && isCacheValid(configCache.timestamp)) {
    return configCache.data
  }

  try {
    const httpClient = getHttpClient()
    const response = await httpClient.get<GalaxyConfig>('/galaxy-roles/config')

    configCache = { data: response.data, timestamp: Date.now() }
    return response.data
  } catch (error) {
    console.error('Failed to fetch Galaxy config:', error)
    // Return default config
    return {
      public_url: 'https://galaxy.ansible.com',
      public_enabled: true,
      private_configured: false,
      private_url: null,
      preferred_source: 'public'
    }
  }
}

/**
 * Check if private Galaxy is configured
 */
export async function isPrivateGalaxyConfigured(): Promise<boolean> {
  const config = await getGalaxyConfig()
  return config.private_configured
}

// ========================================
// Cache Management
// ========================================

/**
 * Clear all caches
 */
export function clearGalaxyRolesCache(): void {
  standaloneCache.clear()
  collectionCache.clear()
  namespacesCache.clear()
  configCache = null
}

/**
 * Get cache statistics
 */
export function getGalaxyRolesCacheStats(): {
  standalone: number
  collections: number
  namespaces: number
} {
  return {
    standalone: standaloneCache.size,
    collections: collectionCache.size,
    namespaces: namespacesCache.size
  }
}

// ========================================
// Drag & Drop Data
// ========================================

/**
 * Data for dragging a standalone role
 */
export interface DraggableStandaloneRoleData {
  type: 'standalone-role'
  fqrn: string  // author.role_name
  namespace: string
  name: string
  description?: string
}

/**
 * Data for dragging a collection role
 */
export interface DraggableCollectionRoleData {
  type: 'collection-role'
  fqcn: string  // namespace.collection.role
  namespace: string
  collection: string
  name: string
  description?: string
}

/**
 * Create drag data for a standalone role
 */
export function createStandaloneRoleDragData(role: StandaloneRole): DraggableStandaloneRoleData {
  return {
    type: 'standalone-role',
    fqrn: role.fqrn,
    namespace: role.namespace,
    name: role.name,
    description: role.description
  }
}

/**
 * Create drag data for a collection role
 */
export function createCollectionRoleDragData(role: CollectionRole): DraggableCollectionRoleData {
  return {
    type: 'collection-role',
    fqcn: role.fqcn,
    namespace: role.namespace,
    collection: role.collection,
    name: role.name,
    description: role.description
  }
}

/**
 * Format download count for display
 */
export function formatDownloadCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}
