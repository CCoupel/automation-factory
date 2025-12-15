/**
 * Galaxy Module Schema Service
 * 
 * Service for fetching and caching module schemas from Galaxy API
 * Provides module parameter definitions for dynamic configuration interface
 */

import { getHttpClient } from '../utils/httpClient'
import { ansibleApiService } from './ansibleApiService'

// Module parameter definition from Galaxy docs
export interface ModuleParameter {
  name: string
  type: 'str' | 'int' | 'float' | 'bool' | 'list' | 'dict' | 'path' | 'any'
  required: boolean
  default?: any
  description: string
  choices?: string[]
  aliases?: string[]
  elements?: string // Type of elements for lists
  version_added?: string
  suboptions?: Record<string, ModuleParameter>
}

// Complete module schema from Galaxy API
export interface ModuleSchema {
  module_name: string
  namespace: string
  collection: string
  version: string
  description: string
  short_description: string
  author: string[]
  parameters: Record<string, ModuleParameter>
  examples?: any
  notes?: string[]
  requirements?: string[]
  version_added?: string
  filename?: string
  parameter_count: number
  required_parameters: number
  optional_parameters: number
}

// In-memory cache for schemas (TTL: 30 minutes)
class SchemaCache {
  private cache = new Map<string, { data: ModuleSchema; expiry: number }>()
  private readonly TTL = 30 * 60 * 1000 // 30 minutes in milliseconds

  set(key: string, data: ModuleSchema): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.TTL
    })
  }

  get(key: string): ModuleSchema | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instance
const schemaCache = new SchemaCache()

/**
 * Galaxy Module Schema Service
 */
export const galaxyModuleSchemaService = {
  /**
   * Get schema for a specific module
   */
  async getModuleSchema(
    namespace: string, 
    collection: string, 
    module: string, 
    version: string = 'latest'
  ): Promise<ModuleSchema | null> {
    try {
      // Check cache first
      const cacheKey = `${namespace}.${collection}.${module}:${version}`
      const cached = schemaCache.get(cacheKey)
      if (cached) {
        console.debug(`Cache hit for module schema: ${cacheKey}`)
        return cached
      }

      console.log(`Fetching schema from Ansible API for ${namespace}.${collection}.${module}`)

      // Use new Ansible API
      const ansibleSchema = await ansibleApiService.getModuleSchema(namespace, collection, module)
      
      if (!ansibleSchema) {
        console.warn(`No schema found for ${namespace}.${collection}.${module}`)
        return null
      }

      // Convert Ansible schema to Galaxy schema format
      const schema: ModuleSchema = {
        module_name: ansibleSchema.module,
        namespace: namespace,
        collection: collection,
        version: version,
        description: ansibleSchema.description,
        short_description: ansibleSchema.description,
        author: [],
        parameters: ansibleSchema.parameters.reduce((acc, param) => {
          acc[param.name] = {
            ...param,
            type: param.type as any,
            choices: param.choices || undefined
          }
          return acc
        }, {} as Record<string, ModuleParameter>),
        examples: ansibleSchema.examples,
        notes: [],
        requirements: [],
        parameter_count: ansibleSchema.parameters.length,
        required_parameters: ansibleSchema.parameters.filter(p => p.required).length,
        optional_parameters: ansibleSchema.parameters.filter(p => !p.required).length
      }

      // Cache the result
      schemaCache.set(cacheKey, schema)

      console.log(`Schema loaded for ${schema.module_name}: ${schema.parameter_count} parameters (${schema.required_parameters} required)`)
      return schema

    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`Schema not found for ${namespace}.${collection}.${module}:${version}`)
        return null
      }

      console.error(`Error fetching schema for ${namespace}.${collection}.${module}:`, error)
      throw error
    }
  },

  /**
   * Get schema using the full endpoint path
   */
  async getModuleSchemaFull(
    namespace: string,
    collection: string, 
    version: string,
    module: string
  ): Promise<ModuleSchema | null> {
    try {
      const cacheKey = `${namespace}.${collection}.${module}:${version}`
      const cached = schemaCache.get(cacheKey)
      if (cached) {
        return cached
      }

      console.log(`Fetching schema (full) for ${namespace}.${collection}.${module}:${version}`)

      const http = getHttpClient()
      const response = await http.get(
        `/galaxy/namespaces/${namespace}/collections/${collection}/versions/${version}/modules/${module}/schema`
      )

      const schema: ModuleSchema = response.data

      if (!schema.module_name || !schema.parameters) {
        console.warn(`Invalid schema structure for ${namespace}.${collection}.${module}`)
        return null
      }

      schemaCache.set(cacheKey, schema)
      return schema

    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`Schema not found for ${namespace}.${collection}.${module}:${version}`)
        return null
      }

      console.error(`Error fetching full schema for ${namespace}.${collection}.${module}:`, error)
      throw error
    }
  },

  /**
   * Get documentation blob for entire collection (for batch processing)
   */
  async getCollectionDocsBlob(
    namespace: string,
    collection: string,
    version: string
  ): Promise<any> {
    try {
      console.log(`Fetching docs-blob for ${namespace}.${collection}:${version}`)

      const http = getHttpClient()
      const response = await http.get(
        `/galaxy/namespaces/${namespace}/collections/${collection}/versions/${version}/docs-blob`
      )

      return response.data

    } catch (error: any) {
      console.error(`Error fetching docs-blob for ${namespace}.${collection}:${version}:`, error)
      throw error
    }
  },

  /**
   * Parse module from collection name (e.g., "community.general")
   */
  parseModuleName(fullModuleName: string): { namespace: string; collection: string; module: string } | null {
    const parts = fullModuleName.split('.')
    if (parts.length < 3) {
      // Handle builtin modules like "copy", "service" 
      if (parts.length === 1) {
        return {
          namespace: 'ansible',
          collection: 'builtin',
          module: parts[0]
        }
      }
      console.warn(`Invalid module name format: ${fullModuleName}`)
      return null
    }

    return {
      namespace: parts[0],
      collection: parts[1],
      module: parts.slice(2).join('.') // Handle nested module names
    }
  },

  /**
   * Get schema for a module using its full name (e.g., "community.general.copy")
   */
  async getSchemaByFullName(fullModuleName: string, version: string = 'latest'): Promise<ModuleSchema | null> {
    const parsed = this.parseModuleName(fullModuleName)
    if (!parsed) return null

    return this.getModuleSchema(parsed.namespace, parsed.collection, parsed.module, version)
  },

  /**
   * Enrich module block with schema data
   */
  async enrichModuleWithSchema(moduleBlock: any): Promise<any> {
    try {
      // Extract module information
      const { collection, name } = moduleBlock
      
      // Parse collection name (e.g., "community.general")
      const parsed = this.parseModuleName(`${collection}.${name}`)
      if (!parsed) {
        console.warn(`Cannot parse module name: ${collection}.${name}`)
        return moduleBlock
      }

      // Fetch schema
      const schema = await this.getModuleSchema(parsed.namespace, parsed.collection, parsed.module)
      
      if (schema) {
        return {
          ...moduleBlock,
          moduleSchema: schema,
          // Initialize empty parameters if not already set
          moduleParameters: moduleBlock.moduleParameters || {}
        }
      }

      return moduleBlock

    } catch (error) {
      console.error('Error enriching module with schema:', error)
      return moduleBlock
    }
  },

  /**
   * Validate module parameters against schema
   */
  validateParameters(parameters: Record<string, any>, schema: ModuleSchema): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check required parameters
    Object.values(schema.parameters).forEach(param => {
      if (param.required && !parameters.hasOwnProperty(param.name)) {
        errors.push(`Required parameter '${param.name}' is missing`)
      }
    })

    // Check parameter types and values
    Object.entries(parameters).forEach(([paramName, value]) => {
      const paramDef = schema.parameters[paramName]
      
      if (!paramDef) {
        warnings.push(`Unknown parameter '${paramName}'`)
        return
      }

      // Type validation (basic)
      if (value !== null && value !== undefined && value !== '') {
        switch (paramDef.type) {
          case 'bool':
            if (typeof value !== 'boolean') {
              errors.push(`Parameter '${paramName}' should be boolean, got ${typeof value}`)
            }
            break
          case 'int':
            if (!Number.isInteger(Number(value))) {
              errors.push(`Parameter '${paramName}' should be integer`)
            }
            break
          case 'list':
            if (!Array.isArray(value)) {
              errors.push(`Parameter '${paramName}' should be list/array`)
            }
            break
        }
      }

      // Choice validation
      if (paramDef.choices && value && !paramDef.choices.includes(value)) {
        errors.push(`Parameter '${paramName}' value '${value}' not in allowed choices: ${paramDef.choices.join(', ')}`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  },

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: schemaCache.size(),
      maxAge: 30 * 60 * 1000 // 30 minutes
    }
  },

  /**
   * Clear the cache
   */
  clearCache() {
    schemaCache.clear()
  }
}

export default galaxyModuleSchemaService