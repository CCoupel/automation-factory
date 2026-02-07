/**
 * Assertions Generator
 *
 * Generates system-managed assertion blocks for playbook variable validation.
 * Creates ONE BLOCK PER VARIABLE for better visual organization.
 * Each block contains tasks for: default value, required check, type check, pattern check.
 */

import { ModuleBlock, PlayVariable, Link } from '../types/playbook'

/** System assertions block prefix */
export const SYSTEM_ASSERTIONS_BLOCK_PREFIX = '__system_var_'

/** System assertions tasks prefix */
export const SYSTEM_TASK_PREFIX = '__system_task_'

/** System link prefix */
export const SYSTEM_LINK_PREFIX = '__system_link_'

/** Spacing constants */
const BLOCK_WIDTH = 220
const BLOCK_MIN_HEIGHT = 100
const TASK_HEIGHT = 60
const TASK_VERTICAL_SPACING = 10  // Space between tasks inside a block
const BLOCK_VERTICAL_SPACING = 40 // Space between blocks (vertical layout)
const BLOCK_START_X = 100         // X position for all assertion blocks
const BLOCK_START_Y = 200         // Y position for first block (below START)

/**
 * Custom type information for assertion generation
 */
export interface CustomTypeInfo {
  name: string
  label: string
  pattern: string
  is_filter: boolean
}

/**
 * Type assertions expressions for Ansible Jinja2 (builtin types)
 */
const TYPE_ASSERTIONS: Record<string, string> = {
  int: '{var} | int | string == {var} | string',
  bool: '{var} | bool is boolean',
  list: '{var} is iterable and {var} is not string and {var} is not mapping',
  dict: '{var} is mapping',
}

/** Builtin type names */
const BUILTIN_TYPES = ['string', 'int', 'bool', 'list', 'dict']

/**
 * Result of generating assertions - contains blocks, tasks, and links
 */
export interface AssertionsResult {
  blocks: ModuleBlock[]       // One SystemBlock per variable (isSystem: true, isBlock: true)
  tasks: ModuleBlock[]        // All SystemTasks (isSystem: true, inside blocks)
  links: Link[]               // Links between blocks
}

/**
 * Generate assertion blocks - one per variable.
 * Uses VERTICAL layout to avoid overlap between blocks.
 *
 * @param variables - List of PlayVariable from the current play
 * @param playId - The play ID (needed for linking to START module)
 * @param existingBlocks - Existing system blocks to preserve positions
 * @param customTypes - Optional list of custom type definitions
 * @returns AssertionsResult with blocks, tasks and links, or null if no variables
 */
export function generateAssertionsBlocks(
  variables: PlayVariable[],
  playId: string,
  existingBlocks: ModuleBlock[] = [],
  customTypes: CustomTypeInfo[] = []
): AssertionsResult | null {
  if (!variables || variables.length === 0) {
    return null
  }

  const blocks: ModuleBlock[] = []
  const allTasks: ModuleBlock[] = []
  const links: Link[] = []

  // Create a lookup for existing block positions
  const existingPositions = new Map<string, { x: number; y: number; height: number }>()
  for (const block of existingBlocks) {
    if (block.id.startsWith(SYSTEM_ASSERTIONS_BLOCK_PREFIX)) {
      existingPositions.set(block.id, {
        x: block.x,
        y: block.y,
        height: block.height || BLOCK_MIN_HEIGHT
      })
    }
  }

  // Calculate positions for blocks - VERTICAL layout below START
  let currentY = BLOCK_START_Y
  let prevBlockId: string | null = null

  for (const variable of variables) {
    const blockId = `${SYSTEM_ASSERTIONS_BLOCK_PREFIX}${variable.key}`
    const { block, tasks, internalLinks } = generateVariableBlock(variable, blockId, customTypes)

    if (!block) continue

    // Use existing position if available, otherwise calculate new position
    const existingPos = existingPositions.get(blockId)
    if (existingPos) {
      block.x = existingPos.x
      block.y = existingPos.y
    } else {
      block.x = BLOCK_START_X
      block.y = currentY
    }

    // Always update currentY based on actual block height for next block
    currentY = block.y + (block.height || BLOCK_MIN_HEIGHT) + BLOCK_VERTICAL_SPACING

    blocks.push(block)
    allTasks.push(...tasks)

    // Create link from previous block (or START) to this block
    if (prevBlockId === null) {
      // First block - link from START pre_tasks
      const startPreTasksId = `${playId}-start-pre-tasks`
      links.push({
        id: `${SYSTEM_LINK_PREFIX}start_to_${variable.key}`,
        from: startPreTasksId,
        to: blockId,
        type: 'pre_tasks'
      })
    } else {
      // Subsequent blocks - link from previous block
      links.push({
        id: `${SYSTEM_LINK_PREFIX}${prevBlockId}_to_${variable.key}`,
        from: prevBlockId,
        to: blockId,
        type: 'pre_tasks'
      })
    }

    // Add internal links (START → task1 → task2 → ...)
    links.push(...internalLinks)

    prevBlockId = blockId
  }

  if (blocks.length === 0) {
    return null
  }

  return { blocks, tasks: allTasks, links }
}

/**
 * Generate a single assertion block for one variable.
 * Includes validation assertions and conversion tasks for filters.
 * Also generates internal links between tasks.
 */
function generateVariableBlock(
  variable: PlayVariable,
  blockId: string,
  customTypes: CustomTypeInfo[]
): { block: ModuleBlock | null; tasks: ModuleBlock[]; internalLinks: Link[] } {
  const tasks: ModuleBlock[] = []
  let yOffset = 15
  const taskSpacing = TASK_HEIGHT + TASK_VERTICAL_SPACING

  // Track if we need a conversion task
  let conversionFilter: string | null = null
  let conversionLabel: string | null = null

  // 1. Default value task (if not required and has default)
  if (!variable.required && variable.defaultValue) {
    const taskId = `${SYSTEM_TASK_PREFIX}${variable.key}_default`
    tasks.push({
      id: taskId,
      collection: 'ansible.builtin',
      name: 'set_fact',
      taskName: 'Set default',
      description: `Default: ${variable.defaultValue}`,
      x: 10,
      y: yOffset,
      parentId: blockId,
      parentSection: 'normal',
      isSystem: true,
      moduleParameters: {
        [variable.key]: `{{ ${variable.key} | default('${variable.defaultValue}') }}`
      }
    })
    yOffset += taskSpacing
  }

  // 2. Required check (if required)
  if (variable.required) {
    const taskId = `${SYSTEM_TASK_PREFIX}${variable.key}_required`
    tasks.push({
      id: taskId,
      collection: 'ansible.builtin',
      name: 'assert',
      taskName: 'Required',
      description: 'Must be defined',
      x: 10,
      y: yOffset,
      parentId: blockId,
      parentSection: 'normal',
      isSystem: true,
      moduleParameters: {
        that: [`${variable.key} is defined`],
        fail_msg: `Variable '${variable.key}' is required`
      }
    })
    yOffset += taskSpacing
  }

  // 3. Builtin type check (int, bool, list, dict)
  if (variable.type && variable.type !== 'string' && TYPE_ASSERTIONS[variable.type]) {
    const taskId = `${SYSTEM_TASK_PREFIX}${variable.key}_type`
    const assertion = TYPE_ASSERTIONS[variable.type].replace(/{var}/g, variable.key)
    const fullAssertion = variable.required
      ? assertion
      : `(${variable.key} is not defined) or (${assertion})`

    tasks.push({
      id: taskId,
      collection: 'ansible.builtin',
      name: 'assert',
      taskName: `Type: ${variable.type}`,
      description: `Validate ${variable.type}`,
      x: 10,
      y: yOffset,
      parentId: blockId,
      parentSection: 'normal',
      isSystem: true,
      moduleParameters: {
        that: [fullAssertion],
        fail_msg: `Variable '${variable.key}' must be ${variable.type}`
      }
    })
    yOffset += taskSpacing
  }

  // 4. Custom type check (from custom types)
  if (variable.type && !BUILTIN_TYPES.includes(variable.type)) {
    const customType = customTypes.find(ct => ct.name === variable.type)
    if (customType && customType.pattern) {
      const taskId = `${SYSTEM_TASK_PREFIX}${variable.key}_customtype`
      let assertion: string

      if (customType.is_filter) {
        const filterName = customType.pattern.startsWith('|')
          ? customType.pattern.substring(1).trim()
          : customType.pattern.trim()
        assertion = `${variable.key} | ${filterName} is defined`
        // Mark for conversion
        conversionFilter = filterName
        conversionLabel = customType.label
      } else {
        assertion = `${variable.key} is regex('${customType.pattern.replace(/'/g, "\\'")}')`
      }

      const fullAssertion = variable.required
        ? assertion
        : `(${variable.key} is not defined) or (${assertion})`

      tasks.push({
        id: taskId,
        collection: 'ansible.builtin',
        name: 'assert',
        taskName: `Type: ${customType.label}`,
        description: customType.is_filter ? `Filter: ${customType.pattern}` : `Pattern: ${customType.pattern}`,
        x: 10,
        y: yOffset,
        parentId: blockId,
        parentSection: 'normal',
        isSystem: true,
        moduleParameters: {
          that: [fullAssertion],
          fail_msg: `Variable '${variable.key}' must be valid ${customType.label}`
        }
      })
      yOffset += taskSpacing
    }
  }

  // 5. Variable-specific regexp pattern check
  if (variable.regexp) {
    const taskId = `${SYSTEM_TASK_PREFIX}${variable.key}_pattern`
    const isFilter = variable.regexp.startsWith('|')
    let assertion: string

    if (isFilter) {
      const filterName = variable.regexp.substring(1).trim()
      assertion = `${variable.key} | ${filterName} is defined`
      // Mark for conversion (only if not already set by custom type)
      if (!conversionFilter) {
        conversionFilter = filterName
        conversionLabel = filterName
      }
    } else {
      assertion = `${variable.key} is regex('${variable.regexp.replace(/'/g, "\\'")}')`
    }

    const fullAssertion = variable.required
      ? assertion
      : `(${variable.key} is not defined) or (${assertion})`

    tasks.push({
      id: taskId,
      collection: 'ansible.builtin',
      name: 'assert',
      taskName: 'Pattern',
      description: isFilter ? `Filter: ${variable.regexp}` : `Regexp: ${variable.regexp}`,
      x: 10,
      y: yOffset,
      parentId: blockId,
      parentSection: 'normal',
      isSystem: true,
      moduleParameters: {
        that: [fullAssertion],
        fail_msg: `Variable '${variable.key}' does not match pattern`
      }
    })
    yOffset += taskSpacing
  }

  // 6. Conversion task for filters (apply the filter and store result)
  if (conversionFilter) {
    const taskId = `${SYSTEM_TASK_PREFIX}${variable.key}_convert`
    const whenClause = variable.required ? undefined : `${variable.key} is defined`

    const task: ModuleBlock = {
      id: taskId,
      collection: 'ansible.builtin',
      name: 'set_fact',
      taskName: `Convert: ${conversionLabel}`,
      description: `Apply ${conversionFilter} filter`,
      x: 10,
      y: yOffset,
      parentId: blockId,
      parentSection: 'normal',
      isSystem: true,
      moduleParameters: {
        [variable.key]: `{{ ${variable.key} | ${conversionFilter} }}`
      }
    }

    if (whenClause) {
      task.moduleParameters = {
        ...task.moduleParameters,
        __when: whenClause  // Will be handled by YAML generator
      }
    }

    tasks.push(task)
    yOffset += taskSpacing
  }

  // If no tasks, no block needed
  if (tasks.length === 0) {
    return { block: null, tasks: [], internalLinks: [] }
  }

  const blockHeight = Math.max(BLOCK_MIN_HEIGHT, yOffset + 10)
  const taskIds = tasks.map(t => t.id)

  // Generate internal links: START → first task → second task → ...
  const internalLinks: Link[] = []
  const blockStartId = `${blockId}-normal-start`

  for (let i = 0; i < tasks.length; i++) {
    const fromId = i === 0 ? blockStartId : tasks[i - 1].id
    const toId = tasks[i].id
    internalLinks.push({
      id: `${SYSTEM_LINK_PREFIX}${blockId}_task_${i}`,
      from: fromId,
      to: toId,
      type: 'normal'
    })
  }

  const block: ModuleBlock = {
    id: blockId,
    collection: 'system',
    name: 'assert',
    description: `Assertions for ${variable.key}`,
    taskName: `Assert: ${variable.key}`,
    x: 0,  // Will be set by caller
    y: 0,  // Will be set by caller
    width: BLOCK_WIDTH,
    height: blockHeight,
    // SystemBlock discriminants
    isBlock: true,
    isSystem: true,
    // SystemBlock specific properties
    systemType: 'assertions',
    sourceVariable: variable.key,
    parentSection: 'pre_tasks',
    blockSections: {
      normal: taskIds,
      rescue: [],  // Always empty for system blocks
      always: []   // Always empty for system blocks
    },
    tags: ['always', 'system_assertions']
  }

  return { block, tasks, internalLinks }
}

/**
 * Check if a module ID belongs to system assertions
 */
export function isSystemAssertionsId(id: string): boolean {
  return id.startsWith(SYSTEM_ASSERTIONS_BLOCK_PREFIX) || id.startsWith(SYSTEM_TASK_PREFIX)
}

/**
 * Check if a link ID belongs to system assertions
 */
export function isSystemLink(id: string): boolean {
  return id.startsWith(SYSTEM_LINK_PREFIX)
}

/**
 * Get a summary of what the assertions validate
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
 * Update assertions blocks preserving existing positions.
 */
export function updateAssertionsBlocks(
  existingBlocks: ModuleBlock[],
  variables: PlayVariable[],
  playId: string,
  customTypes: CustomTypeInfo[] = []
): AssertionsResult | null {
  if (!variables || variables.length === 0) {
    return null
  }

  return generateAssertionsBlocks(variables, playId, existingBlocks, customTypes)
}

// Legacy exports for compatibility
export const SYSTEM_ASSERTIONS_BLOCK_ID = SYSTEM_ASSERTIONS_BLOCK_PREFIX
