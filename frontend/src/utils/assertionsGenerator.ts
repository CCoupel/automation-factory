/**
 * Assertions Generator
 *
 * Generates a system-managed assertions block for playbook variable validation.
 * This block is displayed in the UI but cannot be modified by users.
 */

import { ModuleBlock, PlayVariable } from '../types/playbook'

/** System assertions block ID - fixed value for easy identification */
export const SYSTEM_ASSERTIONS_BLOCK_ID = '__system_assertions__'

/** System assertions tasks prefix */
const SYSTEM_TASK_PREFIX = '__system_task_'

/**
 * Type assertions expressions for Ansible Jinja2
 */
const TYPE_ASSERTIONS: Record<string, string> = {
  int: '{var} | int | string == {var} | string',
  bool: '{var} | bool is boolean',
  list: '{var} is iterable and {var} is not string and {var} is not mapping',
  dict: '{var} is mapping',
}

/**
 * Information about an assertion task within the block
 */
interface AssertionTaskInfo {
  id: string
  name: string
  description: string
  type: 'set_fact' | 'assert'
  variables: string[]
}

/**
 * Generate a system assertions block from playbook variables.
 *
 * This block includes:
 * 1. Default value initialization (for non-required variables with defaults)
 * 2. Required variable assertions
 * 3. Type assertions (int, bool, list, dict)
 * 4. Pattern assertions (regexp validation)
 *
 * @param variables - List of PlayVariable from the current play
 * @param position - Position for the block (default: top-left of pre_tasks area)
 * @returns ModuleBlock for the assertions, or null if no variables
 */
export function generateAssertionsBlock(
  variables: PlayVariable[],
  position: { x: number; y: number } = { x: 50, y: 50 }
): ModuleBlock | null {
  if (!variables || variables.length === 0) {
    return null
  }

  // Generate task IDs for each section
  const taskInfos = generateAssertionTaskInfos(variables)

  if (taskInfos.length === 0) {
    return null
  }

  const taskIds = taskInfos.map(t => t.id)

  return {
    id: SYSTEM_ASSERTIONS_BLOCK_ID,
    collection: 'system',
    name: 'Variable Assertions',
    description: 'System-generated assertions for variable validation. This block cannot be modified.',
    taskName: 'Variable Assertions',
    x: position.x,
    y: position.y,
    isBlock: true,
    isSystem: true,  // Mark as system-managed
    blockSections: {
      normal: taskIds,
      rescue: [],
      always: []
    },
    tags: ['always', 'system_assertions'],
    // Store task info for display
    moduleParameters: {
      __assertionTasks: taskInfos
    }
  }
}

/**
 * Generate information about assertion tasks.
 * This is used for both display in UI and YAML generation.
 */
function generateAssertionTaskInfos(variables: PlayVariable[]): AssertionTaskInfo[] {
  const tasks: AssertionTaskInfo[] = []
  let taskIndex = 0

  // 1. Default value tasks
  const varsWithDefaults = variables.filter(v => !v.required && v.defaultValue)
  for (const variable of varsWithDefaults) {
    tasks.push({
      id: `${SYSTEM_TASK_PREFIX}default_${taskIndex++}`,
      name: `Set default for '${variable.key}'`,
      description: `Initialize ${variable.key} with default value: ${variable.defaultValue}`,
      type: 'set_fact',
      variables: [variable.key]
    })
  }

  // 2. Required variables assertion
  const requiredVars = variables.filter(v => v.required)
  if (requiredVars.length > 0) {
    tasks.push({
      id: `${SYSTEM_TASK_PREFIX}required_${taskIndex++}`,
      name: 'Assert required variables',
      description: `Check that required variables are defined: ${requiredVars.map(v => v.key).join(', ')}`,
      type: 'assert',
      variables: requiredVars.map(v => v.key)
    })
  }

  // 3. Type assertions
  const varsWithTypes = variables.filter(v =>
    v.type && v.type !== 'string' && TYPE_ASSERTIONS[v.type]
  )
  if (varsWithTypes.length > 0) {
    tasks.push({
      id: `${SYSTEM_TASK_PREFIX}types_${taskIndex++}`,
      name: 'Assert variable types',
      description: `Validate types: ${varsWithTypes.map(v => `${v.key} (${v.type})`).join(', ')}`,
      type: 'assert',
      variables: varsWithTypes.map(v => v.key)
    })
  }

  // 4. Pattern assertions (one per variable with regexp)
  const varsWithPatterns = variables.filter(v => v.regexp)
  for (const variable of varsWithPatterns) {
    const isFilter = variable.regexp?.startsWith('|')
    tasks.push({
      id: `${SYSTEM_TASK_PREFIX}pattern_${taskIndex++}`,
      name: `Assert '${variable.key}' pattern`,
      description: isFilter
        ? `Validate with filter: ${variable.regexp}`
        : `Validate with regexp: ${variable.regexp}`,
      type: 'assert',
      variables: [variable.key]
    })
  }

  return tasks
}

/**
 * Check if a module ID belongs to the system assertions block
 */
export function isSystemAssertionsId(id: string): boolean {
  return id === SYSTEM_ASSERTIONS_BLOCK_ID || id.startsWith(SYSTEM_TASK_PREFIX)
}

/**
 * Get a summary of what the assertions block validates
 */
export function getAssertionsSummary(variables: PlayVariable[]): string {
  if (!variables || variables.length === 0) {
    return 'No variables defined'
  }

  const parts: string[] = []

  const requiredCount = variables.filter(v => v.required).length
  if (requiredCount > 0) {
    parts.push(`${requiredCount} required`)
  }

  const defaultCount = variables.filter(v => !v.required && v.defaultValue).length
  if (defaultCount > 0) {
    parts.push(`${defaultCount} with defaults`)
  }

  const typeCount = variables.filter(v => v.type && v.type !== 'string').length
  if (typeCount > 0) {
    parts.push(`${typeCount} typed`)
  }

  const patternCount = variables.filter(v => v.regexp).length
  if (patternCount > 0) {
    parts.push(`${patternCount} with patterns`)
  }

  return parts.length > 0 ? parts.join(', ') : 'No validations'
}

/**
 * Update an existing assertions block with new variables.
 * Preserves position but regenerates content.
 */
export function updateAssertionsBlock(
  existingBlock: ModuleBlock | null,
  variables: PlayVariable[]
): ModuleBlock | null {
  if (!variables || variables.length === 0) {
    return null
  }

  const position = existingBlock
    ? { x: existingBlock.x, y: existingBlock.y }
    : { x: 50, y: 50 }

  return generateAssertionsBlock(variables, position)
}
