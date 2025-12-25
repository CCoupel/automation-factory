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
 * Represents a module, task, or block in the playbook
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
  isBlock?: boolean  // Indicates this is a block container
  isPlay?: boolean   // Indicates this is a START task (in a PLAY section)

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
  tags?: string[]  // Task tags for selective execution
  register?: string  // Store task result in a variable

  // Module configuration (NEW)
  moduleParameters?: Record<string, any>  // User-configured module parameters
  moduleSchema?: ModuleSchema            // Galaxy API schema for this module
  
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
 * Represents a variable in a PLAY
 */
export interface PlayVariable {
  key: string
  value: string
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
  roles?: string[]        // List of roles to apply
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
 * Type guard to check if a module is a block
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
 * Type guard to check if a module is a regular task
 */
export function isTask(module: ModuleBlock): boolean {
  return !module.isBlock && !module.isPlay
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
