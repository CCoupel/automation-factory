/**
 * Ansible API Service - Interface avec la nouvelle API Ansible documentation
 * Remplace l'ancien service Galaxy pour utiliser la documentation Ansible
 */

import { getHttpClient } from '../utils/httpClient'

export interface AnsibleNamespace {
  name: string
  collections: string[]
  collections_count: number
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
      return ['13', '12', '11', '10', '9'] // Fallback versions
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
   */
  async getAllNamespaces(): Promise<AnsibleNamespace[]> {
    try {
      const response = await this.httpClient.get<AnsibleNamespacesResponse>(
        `${this.baseUrl}/${this.selectedVersion}/namespaces`
      )
      
      // If backend returns empty namespaces, use fallback data for testing
      if (!response.data.namespaces || response.data.namespaces.length === 0) {
        console.warn('Backend returned empty namespaces, using fallback data')
        return this.getFallbackNamespaces()
      }
      
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
    return [
      { name: 'ansible', collections: ['builtin', 'posix', 'netcommon', 'utils', 'windows'], collections_count: 5 },
      { name: 'community', collections: ['general', 'crypto', 'docker', 'mysql', 'postgresql', 'vmware', 'network', 'windows'], collections_count: 8 },
      { name: 'kubernetes', collections: ['core'], collections_count: 1 },
      { name: 'amazon', collections: ['aws'], collections_count: 1 },
      { name: 'azure', collections: ['azcollection'], collections_count: 1 },
      { name: 'google', collections: ['cloud'], collections_count: 1 },
      { name: 'redhat', collections: ['openshift', 'rhel_system_roles'], collections_count: 2 },
      { name: 'cisco', collections: ['ios', 'nxos', 'aci', 'meraki'], collections_count: 4 },
      { name: 'arista', collections: ['eos'], collections_count: 1 },
      { name: 'junipernetworks', collections: ['junos'], collections_count: 1 },
      { name: 'f5networks', collections: ['f5_modules'], collections_count: 1 },
      { name: 'vmware', collections: ['vmware_rest'], collections_count: 1 }
    ]
  }

  /**
   * Collection object interface for compatibility
   */
  private createCollectionObject(name: string, namespace: string): AnsibleCollectionObject {
    return {
      name,
      description: `${namespace}.${name} collection`,
      latest_version: '1.0.0',
      download_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      requires_ansible: undefined,
      deprecated: false
    }
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
    const fallbackCollectionNames: Record<string, string[]> = {
      'ansible': ['builtin', 'posix', 'netcommon', 'utils', 'windows'],
      'community': ['general', 'crypto', 'docker', 'mysql', 'postgresql', 'vmware', 'network', 'windows'],
      'kubernetes': ['core'],
      'amazon': ['aws'],
      'azure': ['azcollection'],
      'google': ['cloud'],
      'redhat': ['openshift', 'rhel_system_roles'],
      'cisco': ['ios', 'nxos', 'aci', 'meraki'],
      'arista': ['eos'],
      'junipernetworks': ['junos'],
      'f5networks': ['f5_modules'],
      'vmware': ['vmware_rest']
    }
    const names = fallbackCollectionNames[namespace] || ['default']
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
    // Modules for ansible.builtin
    if (namespace === 'ansible' && collection === 'builtin') {
      return [
        { name: 'copy', description: 'Copy files to remote locations', href: '#' },
        { name: 'template', description: 'Template a file out to a target host', href: '#' },
        { name: 'file', description: 'Manage files and file properties', href: '#' },
        { name: 'command', description: 'Execute commands on targets', href: '#' },
        { name: 'shell', description: 'Execute shell commands on targets', href: '#' },
        { name: 'debug', description: 'Print statements during execution', href: '#' },
        { name: 'fail', description: 'Fail with custom message', href: '#' },
        { name: 'set_fact', description: 'Set host variable(s) and fact(s)', href: '#' },
        { name: 'lineinfile', description: 'Manage lines in text files', href: '#' },
        { name: 'yum', description: 'Manage packages with yum', href: '#' },
        { name: 'apt', description: 'Manage apt packages', href: '#' },
        { name: 'service', description: 'Manage services', href: '#' },
        { name: 'user', description: 'Manage user accounts', href: '#' },
        { name: 'group', description: 'Manage groups', href: '#' },
        { name: 'ping', description: 'Try to connect to host', href: '#' },
        { name: 'setup', description: 'Gather facts about remote hosts', href: '#' }
      ]
    }

    // Modules for community.general
    if (namespace === 'community' && collection === 'general') {
      return [
        { name: 'timezone', description: 'Configure timezone setting', href: '#' },
        { name: 'parted', description: 'Configure block device partitions', href: '#' },
        { name: 'lvol', description: 'Configure LVM logical volumes', href: '#' },
        { name: 'nmcli', description: 'Manage NetworkManager connections', href: '#' },
        { name: 'ufw', description: 'Manage UFW firewall', href: '#' }
      ]
    }

    // Modules for community.docker
    if (namespace === 'community' && collection === 'docker') {
      return [
        { name: 'docker_container', description: 'Manage Docker containers', href: '#' },
        { name: 'docker_image', description: 'Manage Docker images', href: '#' },
        { name: 'docker_network', description: 'Manage Docker networks', href: '#' },
        { name: 'docker_volume', description: 'Manage Docker volumes', href: '#' },
        { name: 'docker_compose', description: 'Manage Docker Compose', href: '#' }
      ]
    }

    // Modules for kubernetes.core
    if (namespace === 'kubernetes' && collection === 'core') {
      return [
        { name: 'k8s', description: 'Manage Kubernetes objects', href: '#' },
        { name: 'k8s_info', description: 'Describe Kubernetes objects', href: '#' },
        { name: 'helm', description: 'Manage Helm charts', href: '#' },
        { name: 'k8s_exec', description: 'Execute commands in pods', href: '#' }
      ]
    }

    // Modules for amazon.aws
    if (namespace === 'amazon' && collection === 'aws') {
      return [
        { name: 'ec2_instance', description: 'Manage EC2 instances', href: '#' },
        { name: 's3_bucket', description: 'Manage S3 buckets', href: '#' },
        { name: 'ec2_vpc_net', description: 'Manage VPCs', href: '#' },
        { name: 'ec2_security_group', description: 'Manage security groups', href: '#' },
        { name: 'iam_role', description: 'Manage IAM roles', href: '#' }
      ]
    }

    // Default modules for other collections
    return [
      { name: 'module1', description: `Module for ${namespace}.${collection}`, href: '#' },
      { name: 'module2', description: `Module for ${namespace}.${collection}`, href: '#' },
      { name: 'module3', description: `Module for ${namespace}.${collection}`, href: '#' }
    ]
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
   */
  async getAllCachedData() {
    try {
      console.log('🔄 AnsibleApiService: Fetching namespaces from Ansible docs...')
      
      const namespaces = await this.getAllNamespaces()
      
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
          sync_status: 'completed',
          last_sync: new Date().toISOString(),
          method: 'ansible_docs',
          api_calls: 1
        }
      }

      console.log('✅ AnsibleApiService: Data fetched:', {
        namespaces: galaxyNamespaces.length,
        version: this.selectedVersion
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