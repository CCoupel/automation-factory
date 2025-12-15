import axios from 'axios';

export interface AnsibleVersion {
  versions: string[];
  total_count: number;
  cache_ttl: number;
  source: string;
}

export interface AnsibleCollections {
  ansible_version: string;
  collections: { [namespace: string]: string[] };
  total_namespaces: number;
  total_collections: number;
  source: string;
}

export interface AnsibleNamespaces {
  ansible_version: string;
  namespaces: Array<{
    name: string;
    collections_count: number;
    collections: string[];
  }>;
  total_count: number;
  source: string;
}

export interface AnsibleModules {
  ansible_version: string;
  namespace: string;
  collection: string;
  modules: Array<{
    name: string;
    description: string;
    href?: string;
  }>;
  total_modules: number;
  source: string;
}

export interface AnsibleModuleSchema {
  ansible_version: string;
  namespace: string;
  collection: string;
  module: string;
  schema: {
    module: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
      default?: any;
    }>;
    examples: string[];
    return_values: any[];
  };
  source: string;
  documentation_url?: string;
}

class AnsibleService {
  private baseUrl = '/api/ansible';

  async getVersions(force_refresh = false): Promise<AnsibleVersion> {
    const params = force_refresh ? { force_refresh: 'true' } : {};
    const response = await axios.get(`${this.baseUrl}/versions`, { params });
    return response.data;
  }

  async getCollections(version: string): Promise<AnsibleCollections> {
    const response = await axios.get(`${this.baseUrl}/${version}/collections`);
    return response.data;
  }

  async getNamespaces(version: string): Promise<AnsibleNamespaces> {
    const response = await axios.get(`${this.baseUrl}/${version}/namespaces`);
    return response.data;
  }

  async getNamespaceCollections(version: string, namespace: string): Promise<{ collections: string[] }> {
    const response = await axios.get(`${this.baseUrl}/${version}/namespaces/${namespace}/collections`);
    return response.data;
  }

  async getCollectionModules(version: string, namespace: string, collection: string): Promise<AnsibleModules> {
    const response = await axios.get(`${this.baseUrl}/${version}/namespaces/${namespace}/collections/${collection}/modules`);
    return response.data;
  }

  async getModuleSchema(
    version: string,
    namespace: string,
    collection: string,
    module: string
  ): Promise<AnsibleModuleSchema> {
    const response = await axios.get(
      `${this.baseUrl}/${version}/namespaces/${namespace}/collections/${collection}/modules/${module}/schema`
    );
    return response.data;
  }

  async getHealth(): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/health`);
    return response.data;
  }

  async getCollectionStats(version: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/${version}/collections/stats`);
    return response.data;
  }

  // Helper method to convert new API format to legacy Galaxy format for compatibility
  convertToGalaxyFormat(collections: AnsibleCollections): any {
    const namespaces = [];
    
    for (const [namespace, collectionList] of Object.entries(collections.collections)) {
      namespaces.push({
        name: namespace,
        collection_count: collectionList.length,
        collections: collectionList,
        // Mock some Galaxy-style metadata for compatibility
        total_downloads: collectionList.length * 1000, // Mock downloads
        description: `${namespace} namespace`,
        url: `https://galaxy.ansible.com/${namespace}`,
      });
    }
    
    return {
      namespaces,
      total_count: namespaces.length,
      source: 'ansible_docs_converted'
    };
  }
}

export const ansibleService = new AnsibleService();