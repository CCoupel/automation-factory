/**
 * Galaxy SMART Service - Interface avec le nouveau backend optimisé
 * Remplace l'ancien galaxyCacheService pour utiliser le service SMART
 */

import { getHttpClient } from '../utils/httpClient'
import { Namespace } from './galaxyService'

interface SmartSyncStatus {
  last_sync: string | null
  method: string
  stats: {
    api_calls: number
    namespaces_fetched: number
    collections_fetched: number
    errors: number
    duration_seconds?: number
  }
}

interface SmartCacheInfo {
  popular_namespaces: number
  all_namespaces: number
  has_data: boolean
}

interface SmartStatusResponse {
  sync_status: SmartSyncStatus
  cache_info: SmartCacheInfo
  service: string
  api_approach: string
}

interface SmartNamespacesResponse {
  namespaces: Namespace[]
  total_namespaces: number
  returned_count: number
  status: string
  sync_info: {
    last_sync: string | null
    method: string
    api_calls: number
  }
}

export class GalaxySmartService {
  private baseUrl = '/galaxy'  // httpClient ajoute déjà /api
  private httpClient = getHttpClient()

  /**
   * Récupérer le statut du service SMART
   */
  async getSmartStatus(): Promise<SmartStatusResponse> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/smart/status`)
      return response.data
    } catch (error) {
      console.error('Failed to get SMART status:', error)
      throw error
    }
  }

  /**
   * Récupérer tous les namespaces (équivalent getAllCachedData)
   */
  async getAllNamespaces(): Promise<Namespace[]> {
    try {
      const response = await this.httpClient.get<SmartNamespacesResponse>(`${this.baseUrl}/namespaces`)
      return response.data.namespaces || []
    } catch (error) {
      console.error('Failed to get all namespaces:', error)
      return []
    }
  }

  /**
   * Récupérer les namespaces populaires
   */
  async getPopularNamespaces(): Promise<Namespace[]> {
    try {
      const response = await this.httpClient.get<SmartNamespacesResponse>(
        `${this.baseUrl}/namespaces?popular_only=true&limit=10`
      )
      return response.data.namespaces || []
    } catch (error) {
      console.error('Failed to get popular namespaces:', error)
      return []
    }
  }

  /**
   * Simuler l'ancien getAllCachedData pour compatibilité
   */
  async getAllCachedData() {
    try {
      console.log('🔄 GalaxySmartService: Fetching data from SMART backend...')
      
      const [status, popularNamespaces, allNamespaces] = await Promise.all([
        this.getSmartStatus(),
        this.getPopularNamespaces(),
        this.getAllNamespaces()
      ])

      // Format compatible avec l'ancien système
      const cachedData = {
        popular_namespaces: popularNamespaces,
        all_namespaces: allNamespaces,
        collections_sample: {}, // Vide pour l'instant, peut être enrichi si nécessaire
        cache_info: {
          sync_status: status.cache_info.has_data ? 'completed' : 'pending',
          last_sync: status.sync_status.last_sync,
          method: status.sync_status.method,
          api_calls: status.sync_status.stats.api_calls
        }
      }

      console.log('✅ GalaxySmartService: Data fetched from SMART backend:', {
        popular: popularNamespaces.length,
        all: allNamespaces.length,
        has_data: status.cache_info.has_data,
        last_sync: status.sync_status.last_sync
      })

      return cachedData

    } catch (error) {
      console.error('❌ GalaxySmartService: Failed to get cached data:', error)
      return null
    }
  }

  /**
   * Déclencher un resync manuel
   */
  async triggerResync(): Promise<boolean> {
    try {
      console.log('🔄 Triggering SMART resync...')
      const response = await this.httpClient.post(`${this.baseUrl}/smart/resync`)
      console.log('✅ SMART resync completed:', response.data)
      return true
    } catch (error) {
      console.error('❌ Failed to trigger SMART resync:', error)
      return false
    }
  }

  /**
   * Récupérer les collections pour un namespace (utilise API standard)
   */
  async getCollections(namespace: string): Promise<any[] | null> {
    try {
      const response = await this.httpClient.get(`${this.baseUrl}/namespaces/${namespace}/collections`)
      return response.data.collections || []
    } catch (error) {
      console.error(`Failed to get collections for ${namespace}:`, error)
      return null
    }
  }

  /**
   * Récupérer les modules pour une collection (utilise API standard)
   */
  async getModules(namespace: string, collection: string, version: string): Promise<any[] | null> {
    try {
      const response = await this.httpClient.get(
        `${this.baseUrl}/namespaces/${namespace}/collections/${collection}/versions/${version}/modules`
      )
      const data = response.data
      // Combine modules et plugins
      return [...(data.modules || []), ...(data.plugins || [])]
    } catch (error) {
      console.error(`Failed to get modules for ${namespace}.${collection}:${version}:`, error)
      return null
    }
  }

  /**
   * Vérifier si les données sont prêtes (équivalent isReady)
   */
  async isDataReady(): Promise<boolean> {
    try {
      const status = await this.getSmartStatus()
      return status.cache_info.has_data && status.cache_info.all_namespaces > 0
    } catch (error) {
      console.error('Failed to check data readiness:', error)
      return false
    }
  }
}

// Instance singleton
export const galaxySmartService = new GalaxySmartService()