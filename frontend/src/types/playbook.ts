/**
 * Shared type definitions for the Ansible Playbook Builder
 *
 * This file contains all the core interfaces and types used across
 * the application to represent playbooks, modules, tasks, blocks, and links.
 */

/**
 * Module parameter definition from Galaxy API
 */
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

/**
 * Module schema from Galaxy API
 */
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

/**
 * Role parameter/variable definition
 */
export interface RoleParameter {
  name: string
  type: 'str' | 'int' | 'float' | 'bool' | 'list' | 'dict' | 'path' | 'any'
  required: boolean
  default?: any
  description: string
}

/**
 * Role entry point definition
 */
export interface RoleEntryPoint {
  name: string
  description: string
}

/**
 * Role schema from Ansible documentation
 */
export interface RoleSchema {
  role: string
  description: string
  entry_points: RoleEntryPoint[]
  defaults: RoleParameter[]
  requirements: string[]
  examples: string[]
}

/**
 * Role definition with optional configuration
 *
 * Roles can be:
 * - Simple string: "namespace.collection.role_name"
 * - Object with parameters: { role: "...", vars: {...}, when: "...", tags: [...] }
 */
export interface RoleDefinition {
  role: string                    // FQCN: "namespace.collection.role_name"
  name?: string                   // Display name / alias
  vars?: Record<string, any>      // Role variables
  when?: string                   // Conditional execution
  tags?: string[]                 // Tags for selective execution
  become?: boolean                // Privilege escalation
  become_user?: string            // Become user
  delegate_to?: string            // Delegation
  // Schema info (populated from API)
  schema?: RoleSchema
  namespace?: string
  collection?: string
}

/**
 * Draggable role item data (for drag & drop from palette)
 */
export interface DraggableRoleData {
  type: 'role'
  role: string                    // Role name
  collection: string              // "namespace.collection"
  description?: string
}

/**
 * Check if an object is a DraggableRoleData
 */
export function isDraggableRoleData(data: unknown): data is DraggableRoleData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as DraggableRoleData).type === 'role'
  )
}

/**
 * System block types
 */
export type SystemBlockType = 'assertions'

/**
 * Represents a module, task, or block in the playbook
 *
 * This is a unified interface that can represent:
 * - User blocks/tasks (editable, created by user)
 * - System blocks (non-editable, auto-generated for assertions)
 * - System tasks (tasks inside system blocks)
 *
 * Use type guards (isSystemBlock, isSystemBlockContainer, etc.) to check the type at runtime.
 */
export interface ModuleBlock {
  id: string
  collection: string
  name: string
  description?: string
  taskName?: string
  x: number
  y: number

  // Type flags
  isBlock?: boolean   // Indicates this is a block container
  isPlay?: boolean    // Indicates this is a START task (in a PLAY section)
  isSystem?: boolean  // Indicates this is a system-managed block/task (non-editable)

  // PLAY-specific attributes
  inventory?: string

  // Deprecated - use blockSections instead
  children?: string[]

  // Block sections (for blocks with 3 sections: normal, rescue, always)
  blockSections?: {
    normal: string[]   // IDs of tasks in the normal section
    rescue: string[]   // IDs of tasks in the rescue section
    always: string[]   // IDs of tasks in the always section
  }

  // Parent relationship (for tasks within blocks or PLAY sections)
  parentId?: string
  parentSection?: 'normal' | 'rescue' | 'always' | 'variables' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'

  // Task attributes (Ansible task parameters)
  when?: string
  ignoreErrors?: boolean
  become?: boolean
  loop?: string
  delegateTo?: string
  tags?: string[]   // Task tags for selective execution
  register?: string // Store task result in a variable

  // Module configuration
  moduleParameters?: Record<string, any>  // User-configured module parameters
  moduleSchema?: ModuleSchema             // Galaxy API schema for this module

  // Validation state
  validationState?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
    lastValidated?: Date
  }

  // Custom dimensions (for blocks)
  width?: number
  height?: number

  // ============================================
  // SystemBlock specific properties
  // ============================================
  // These properties are only set when isSystem === true

  /**
   * Type of system block (e.g., 'assertions')
   * Only present when isSystem === true
   */
  systemType?: SystemBlockType

  /**
   * Source variable for assertion blocks
   * Only present when isSystem === true && systemType === 'assertions'
   */
  sourceVariable?: string
}

/**
 * SystemBlock characteristics (documentation interface)
 *
 * A SystemBlock is a ModuleBlock with:
 * - isSystem: true
 * - isBlock: true
 * - systemType: SystemBlockType (e.g., 'assertions')
 * - sourceVariable: string (the variable being validated)
 * - parentSection: 'pre_tasks' (always in pre_tasks)
 * - blockSections.rescue: [] (always empty)
 * - blockSections.always: [] (always empty)
 *
 * Behavior:
 * - Visible but locked (padlock icon)
 * - Cannot be modified by user
 * - No drag-in (cannot add elements)
 * - No drag-out (cannot remove elements)
 * - Internal repositioning allowed
 * - Collapsed by default
 * - Only 'normal' section displayed (no rescue/always)
 * - Grey/muted visual style
 */
export type SystemBlock = ModuleBlock & {
  isSystem: true
  isBlock: true
  systemType: SystemBlockType
  sourceVariable: string
}

/**
 * SystemTask characteristics (documentation interface)
 *
 * A SystemTask is a ModuleBlock with:
 * - isSystem: true
 * - isBlock: false or undefined
 * - parentId: string (ID of parent SystemBlock)
 * - parentSection: 'normal'
 */
export type SystemTask = ModuleBlock & {
  isSystem: true
  isBlock?: false
  parentId: string
  parentSection: 'normal'
}

/**
 * Represents a link between two modules/tasks
 */
export interface Link {
  id: string
  from: string  // Source module ID
  to: string    // Destination module ID
  type: 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
}

/**
 * Builtin variable types (cannot be overridden)
 */
export type BuiltinVariableType = 'string' | 'int' | 'bool' | 'list' | 'dict'

/**
 * Variable types supported in Ansible
 * Can be a builtin type or a custom type name (string)
 */
export type VariableType = BuiltinVariableType | string

/**
 * Represents a variable in a PLAY
 */
export interface PlayVariable {
  key: string
  value: string
  type: VariableType
  required: boolean
  defaultValue?: string  // Only used when required is false
  regexp?: string        // Validation pattern
}

/**
 * Attributes that can be applied to an entire PLAY
 */
export interface PlayAttributes {
  hosts?: string          // Target hosts pattern (e.g., "all", "webservers")
  remoteUser?: string     // SSH user for connection
  gatherFacts?: boolean   // Whether to gather facts (default: true)
  become?: boolean        // Privilege escalation
  connection?: string     // Connection type (ssh, local, etc.)
  roles?: (string | RoleDefinition)[]  // List of roles (string or configured)
}

/**
 * Helper to get role display name
 */
export function getRoleDisplayName(role: string | RoleDefinition): string {
  if (typeof role === 'string') {
    return role
  }
  return role.name || role.role
}

/**
 * Helper to get role FQCN
 */
export function getRoleFQCN(role: string | RoleDefinition): string {
  if (typeof role === 'string') {
    return role
  }
  return role.role
}

/**
 * Helper to check if role has configuration
 */
export function isConfiguredRole(role: string | RoleDefinition): role is RoleDefinition {
  return typeof role === 'object' && role !== null
}

/**
 * Represents a PLAY (a tab in the playbook with multiple sections)
 */
export interface Play {
  id: string
  name: string
  modules: ModuleBlock[]
  links: Link[]
  variables: PlayVariable[]
  // PLAY-level attributes
  attributes?: PlayAttributes
}

/**
 * Type guard to check if a module is a block (user or system)
 */
export function isBlock(module: ModuleBlock): boolean {
  return module.isBlock === true
}

/**
 * Type guard to check if a module is a PLAY START task
 */
export function isPlayStart(module: ModuleBlock): boolean {
  return module.isPlay === true
}

/**
 * Type guard to check if a module is a regular task (not block, not play)
 */
export function isTask(module: ModuleBlock): boolean {
  return !module.isBlock && !module.isPlay
}

/**
 * Type guard to check if a module is a system-managed block or task
 * Returns true for both SystemBlock containers and SystemTask
 */
export function isSystemBlock(module: ModuleBlock): module is SystemBlock | SystemTask {
  return module.isSystem === true
}

/**
 * Type guard to specifically check for SystemBlock container (not SystemTask)
 * A SystemBlock is a block that contains system tasks
 */
export function isSystemBlockContainer(module: ModuleBlock): module is SystemBlock {
  return module.isSystem === true && module.isBlock === true
}

/**
 * Type guard to specifically check for SystemTask (task inside a SystemBlock)
 */
export function isSystemTask(module: ModuleBlock): module is SystemTask {
  return module.isSystem === true && !module.isBlock
}

/**
 * Type guard to check if a module is user-editable (not a system block/task)
 */
export function isUserBlock(module: ModuleBlock): boolean {
  return !module.isSystem
}

/**
 * Section name type for PLAY sections
 */
export type PlaySectionName = 'variables' | 'roles' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'

/**
 * Section name type for block sections
 */
export type BlockSectionName = 'normal' | 'rescue' | 'always'

/**
 * Combined section name type
 */
export type SectionName = PlaySectionName | BlockSectionName
