import { getHttpClient } from '../utils/httpClient'

/**
 * Builtin variable type (string, int, bool, list, dict)
 */
export interface BuiltinVariableType {
  name: string
  label: string
  description?: string
  is_builtin: true
}

/**
 * Custom variable type created by admin
 */
export interface CustomVariableType {
  id: string
  name: string
  label: string
  description?: string
  pattern: string
  is_filter: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string
}

/**
 * Combined variable type for display
 */
export type VariableTypeInfo =
  | (BuiltinVariableType & { is_builtin: true })
  | (CustomVariableType & { is_builtin?: false })

/**
 * Response from GET /variable-types
 */
interface VariableTypeListResponse {
  builtin: BuiltinVariableType[]
  custom: CustomVariableType[]
}

/**
 * Request for POST /variable-types/validate
 */
interface ValidateValueRequest {
  type_name: string
  value: string
}

/**
 * Response from POST /variable-types/validate
 */
export interface ValidateValueResponse {
  is_valid: boolean
  message: string
  parsed_value?: unknown
}

/**
 * Request for creating a custom variable type
 */
export interface CreateCustomTypeRequest {
  name: string
  label: string
  description?: string
  pattern: string
}

/**
 * Request for updating a custom variable type
 */
export interface UpdateCustomTypeRequest {
  label?: string
  description?: string
  pattern?: string
  is_active?: boolean
}

// Cache for variable types (5 minutes)
let cachedTypes: VariableTypeListResponse | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Variable Types Service
 *
 * Handles API calls for variable type management.
 */
export const variableTypesService = {
  /**
   * Get all variable types (builtin + custom active)
   * Results are cached for 5 minutes
   *
   * @returns Promise with builtin and custom types
   */
  async getVariableTypes(forceRefresh = false): Promise<VariableTypeListResponse> {
    // Check cache
    if (!forceRefresh && cachedTypes && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedTypes
    }

    try {
      const http = getHttpClient()
      const response = await http.get<VariableTypeListResponse>('/variable-types')
      cachedTypes = response.data
      cacheTimestamp = Date.now()
      return response.data
    } catch (error: unknown) {
      console.error('Failed to get variable types:', error)
      // Return empty defaults on error
      return { builtin: [], custom: [] }
    }
  },

  /**
   * Get all variable types as a flat list for Select components
   */
  async getVariableTypesFlat(forceRefresh = false): Promise<VariableTypeInfo[]> {
    const { builtin, custom } = await this.getVariableTypes(forceRefresh)

    const builtinTypes: VariableTypeInfo[] = builtin.map(t => ({
      ...t,
      is_builtin: true as const
    }))

    const customTypes: VariableTypeInfo[] = custom.map(t => ({
      ...t,
      is_builtin: false as const
    }))

    return [...builtinTypes, ...customTypes]
  },

  /**
   * Validate a value against a variable type
   *
   * @param typeName - Type name to validate against
   * @param value - Value to validate
   * @returns Validation result
   */
  async validateValue(typeName: string, value: string): Promise<ValidateValueResponse> {
    try {
      const http = getHttpClient()
      const response = await http.post<ValidateValueResponse>('/variable-types/validate', {
        type_name: typeName,
        value
      } as ValidateValueRequest)
      return response.data
    } catch (error: unknown) {
      console.error('Failed to validate value:', error)
      return {
        is_valid: false,
        message: 'Validation failed'
      }
    }
  },

  /**
   * Invalidate the cache (call after admin operations)
   */
  invalidateCache(): void {
    cachedTypes = null
    cacheTimestamp = 0
  },

  // ============== Admin Operations ==============

  /**
   * Get all custom types including inactive (admin only)
   */
  async adminGetAllTypes(): Promise<CustomVariableType[]> {
    try {
      const http = getHttpClient()
      const response = await http.get<CustomVariableType[]>('/variable-types/admin')
      return response.data
    } catch (error: unknown) {
      console.error('Failed to get custom types (admin):', error)
      throw error
    }
  },

  /**
   * Create a new custom variable type (admin only)
   */
  async adminCreateType(data: CreateCustomTypeRequest): Promise<CustomVariableType> {
    try {
      const http = getHttpClient()
      const response = await http.post<CustomVariableType>('/variable-types/admin', data)
      this.invalidateCache()
      return response.data
    } catch (error: unknown) {
      console.error('Failed to create custom type:', error)
      throw error
    }
  },

  /**
   * Update a custom variable type (admin only)
   */
  async adminUpdateType(typeId: string, data: UpdateCustomTypeRequest): Promise<CustomVariableType> {
    try {
      const http = getHttpClient()
      const response = await http.put<CustomVariableType>(`/variable-types/admin/${typeId}`, data)
      this.invalidateCache()
      return response.data
    } catch (error: unknown) {
      console.error('Failed to update custom type:', error)
      throw error
    }
  },

  /**
   * Delete a custom variable type (admin only)
   */
  async adminDeleteType(typeId: string): Promise<void> {
    try {
      const http = getHttpClient()
      await http.delete(`/variable-types/admin/${typeId}`)
      this.invalidateCache()
    } catch (error: unknown) {
      console.error('Failed to delete custom type:', error)
      throw error
    }
  }
}
