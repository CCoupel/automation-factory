/**
 * Ansible API Service - Interface avec la nouvelle API Ansible documentation
 * Remplace l'ancien service Galaxy pour utiliser la documentation Ansible
 *
 * Ce service est le point d'entrée unique pour toutes les données Ansible.
 * Les anciens services (galaxyService, galaxyCacheService, galaxySmartService) sont obsolètes.
 */

import { getHttpClient } from '../utils/httpClient'
import {
  FALLBACK_VERSIONS,
  FALLBACK_NAMESPACES,
  getFallbackCollectionsForNamespace,
  getFallbackModulesForCollection,
  createFallbackCollectionObject
} from '../data/ansibleFallbackData'

// ============================================================================
// Types principaux
// ============================================================================

export interface AnsibleNamespace {
  name: string
  collections: string[]
  collections_count: number
}

// Alias pour compatibilité avec l'ancien code
export interface Namespace {
  name: string
  collection_count: number
  total_downloads?: number
  description?: string
}

export interface Collection {
  name: string
  namespace: string
  description: string
  latest_version: string
  requires_ansible?: string
  download_count: number
  created_at: string
  updated_at: string
  deprecated: boolean
}

export interface Module {
  name: string
  description: string
  content_type?: string
}

export interface AnsibleCollection {
  name: string
  namespace: string
  version?: string
  description?: string
}

export interface AnsibleModule {
  name: string
  description: string
  href: string
}

export interface AnsibleModuleSchema {
  module: string
  description: string
  parameters: Array<{
    name: string
    type: string
    required: boolean
    description: string
    default: any
    choices?: any[]
  }>
  examples: string[]
  return_values: any[]
}

export interface AnsibleCollectionObject {
  name: string
  description: string
  latest_version: string
  download_count: number
  created_at: string
  updated_at: string
  requires_ansible?: string
  deprecated: boolean
}

interface AnsibleVersionsResponse {
  versions: string[]
  total_count: number
  cache_ttl: number
  source: string
}

interface AnsibleCollectionsResponse {
  ansible_version: string
  collections: { [namespace: string]: string[] }
  total_namespaces: number
  total_collections: number
  source: string
}

interface AnsibleNamespacesResponse {
  ansible_version: string
  namespaces: AnsibleNamespace[]
  total_count: number
  source: string
}

export class AnsibleApiService {
  private baseUrl = '/ansible'  // httpClient ajoute déjà /api
  private httpClient = getHttpClient()
  private selectedVersion: string = '13' // Default to latest stable

  /**
   * Get available Ansible versions
   */
  async getVersions(): Promise<string[]> {
    try {
      const response = await this.httpClient.get<AnsibleVersionsResponse>(`${this.baseUrl}/versions`)
      return response.data.versions || []
    } catch (error) {
      console.error('Failed to get Ansible versions:', error)
      return FALLBACK_VERSIONS
    }
  }

  /**
   * Set the selected Ansible version
   */
  setVersion(version: string) {
    this.selectedVersion = version
  }

  /**
   * Get current selected version
   */
  getSelectedVersion(): string {
    return this.selectedVersion
  }

  /**
   * Get all namespaces for selected version
   * @param forceRefresh - If true, bypass backend cache
   */
  async getAllNamespaces(forceRefresh: boolean = false): Promise<AnsibleNamespace[]> {
    try {
      const url = forceRefresh
        ? `${this.baseUrl}/${this.selectedVersion}/namespaces?force_refresh=true`
        : `${this.baseUrl}/${this.selectedVersion}/namespaces`

      console.log(`📥 Fetching namespaces for Ansible ${this.selectedVersion}${forceRefresh ? ' (FORCE REFRESH)' : ''}`)

      const response = await this.httpClient.get<AnsibleNamespacesResponse>(url)

      // If backend returns empty namespaces, use fallback data for testing
      if (!response.data.namespaces || response.data.namespaces.length === 0) {
        console.warn('Backend returned empty namespaces, using fallback data')
        return this.getFallbackNamespaces()
      }

      console.log(`✅ Got ${response.data.namespaces.length} namespaces for Ansible ${this.selectedVersion}`)
      return response.data.namespaces || []
    } catch (error) {
      console.error('Failed to get namespaces:', error)
      console.warn('Using fallback namespaces due to error')
      return this.getFallbackNamespaces()
    }
  }

  /**
   * Fallback namespaces for testing when backend is not working
   */
  private getFallbackNamespaces(): AnsibleNamespace[] {
    return FALLBACK_NAMESPACES
  }

  /**
   * Collection object interface for compatibility
   */
  private createCollectionObject(name: string, namespace: string): AnsibleCollectionObject {
    return createFallbackCollectionObject(name, namespace)
  }

  /**
   * Get collections for a specific namespace
   */
  async getCollections(namespace: string): Promise<AnsibleCollectionObject[]> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/${this.selectedVersion}/namespaces/${namespace}/collections`
      )

      // If backend returns empty collections, use fallback data
      if (!response.data.collections || response.data.collections.length === 0) {
        console.warn(`Backend returned empty collections for ${namespace}, using fallback`)
        return this.getFallbackCollections(namespace)
      }

      // Convert string array to Collection objects
      const collectionNames = response.data.collections || []
      return collectionNames.map((name: string) => this.createCollectionObject(name, namespace))
    } catch (error) {
      console.error(`Failed to get collections for ${namespace}:`, error)
      return this.getFallbackCollections(namespace)
    }
  }

  /**
   * Fallback collections for testing
   */
  private getFallbackCollections(namespace: string): AnsibleCollectionObject[] {
    const names = getFallbackCollectionsForNamespace(namespace)
    return names.map(name => this.createCollectionObject(name, namespace))
  }

  /**
   * Get modules for a specific collection
   */
  async getModules(namespace: string, collection: string): Promise<AnsibleModule[]> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/${this.selectedVersion}/namespaces/${namespace}/collections/${collection}/modules`
      )
      
      // If backend returns empty modules, use fallback data
      if (!response.data.modules || response.data.modules.length === 0) {
        console.warn(`Backend returned empty modules for ${namespace}.${collection}, using fallback`)
        return this.getFallbackModules(namespace, collection)
      }
      
      return response.data.modules || []
    } catch (error) {
      console.error(`Failed to get modules for ${namespace}.${collection}:`, error)
      return this.getFallbackModules(namespace, collection)
    }
  }

  /**
   * Fallback modules for testing
   */
  private getFallbackModules(namespace: string, collection: string): AnsibleModule[] {
    return getFallbackModulesForCollection(namespace, collection)
  }

  /**
   * Get module schema
   */
  async getModuleSchema(namespace: string, collection: string, module: string): Promise<AnsibleModuleSchema | null> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/${this.selectedVersion}/namespaces/${namespace}/collections/${collection}/modules/${module}/schema`
      )
      return response.data.schema || null
    } catch (error) {
      console.error(`Failed to get schema for ${namespace}.${collection}.${module}:`, error)
      return null
    }
  }

  /**
   * Get Galaxy-compatible data format for backward compatibility
   * @param forceRefresh - If true, bypass all caches (frontend and backend)
   */
  async getAllCachedData(forceRefresh: boolean = false) {
    try {
      console.log(`🔄 AnsibleApiService: Fetching namespaces from Ansible docs...${forceRefresh ? ' (FORCE REFRESH)' : ''}`)

      const namespaces = await this.getAllNamespaces(forceRefresh)

      // Convert to Galaxy format for compatibility
      const galaxyNamespaces = namespaces.map(ns => ({
        name: ns.name,
        id: ns.name,
        avatar_url: null,
        company: '',
        description: '',
        collection_count: ns.collections_count || 1,
        total_downloads: 0
      }))

      const cachedData = {
        popular_namespaces: galaxyNamespaces.slice(0, 10), // Top 10 as popular
        all_namespaces: galaxyNamespaces,
        collections_sample: {},
        cache_info: {
          sync_status: forceRefresh ? 'force_refreshed' : 'completed',
          last_sync: new Date().toISOString(),
          method: 'ansible_docs',
          api_calls: 1
        }
      }

      console.log('✅ AnsibleApiService: Data fetched:', {
        namespaces: galaxyNamespaces.length,
        version: this.selectedVersion,
        forceRefresh
      })

      return cachedData

    } catch (error) {
      console.error('❌ AnsibleApiService: Failed to get data:', error)
      return null
    }
  }

  /**
   * Check if service is ready
   */
  async isDataReady(): Promise<boolean> {
    try {
      const versions = await this.getVersions()
      return versions.length > 0
    } catch (error) {
      return false
    }
  }
}

// Instance singleton
export const ansibleApiService = new AnsibleApiService()