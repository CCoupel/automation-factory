/**
 * Playbook Traversal Service
 *
 * Provides a unified way to traverse playbook structure for all export formats.
 * This ensures consistent handling of plays, sections, blocks, and tasks.
 */

import { Play, ModuleBlock, Link } from '../types/playbook'

// Alias for convenience
type Module = ModuleBlock

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type SectionType = 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'
export type BlockSectionType = 'normal' | 'rescue' | 'always'

export interface TraversedTask {
  module: Module
  depth: number
  section: SectionType
  blockSection?: BlockSectionType
  parentBlock?: Module
}

export interface TraversedBlock {
  block: Module
  depth: number
  section: SectionType
  sections: {
    normal: TraversedTask[]
    rescue: TraversedTask[]
    always: TraversedTask[]
  }
}

export interface TraversedSection {
  name: SectionType
  startNode: Module | null
  items: Array<TraversedTask | TraversedBlock>
}

export interface TraversedPlay {
  play: Play
  index: number
  sections: TraversedSection[]
}

export interface TraversalResult {
  plays: TraversedPlay[]
}

// ═══════════════════════════════════════════════════════════════════════════
// TRAVERSAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a map of module ID to module for quick lookup
 */
function buildModuleMap(modules: Module[]): Map<string, Module> {
  const map = new Map<string, Module>()
  modules.forEach(m => map.set(m.id, m))
  return map
}

/**
 * Build adjacency list from links for a specific section
 */
function buildAdjacencyList(links: Link[], sectionType: SectionType): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()

  links
    .filter(link => link.type === sectionType)
    .forEach(link => {
      if (!adjacency.has(link.from)) {
        adjacency.set(link.from, [])
      }
      adjacency.get(link.from)!.push(link.to)
    })

  return adjacency
}

/**
 * Get tasks for a block section (normal, rescue, always)
 */
function getBlockSectionTasks(
  block: Module,
  blockSectionType: BlockSectionType,
  moduleMap: Map<string, Module>,
  sectionType: SectionType,
  depth: number
): TraversedTask[] {
  const tasks: TraversedTask[] = []
  const taskIds = block.blockSections?.[blockSectionType] || []

  for (const taskId of taskIds) {
    const module = moduleMap.get(taskId)
    if (module && !module.isPlay && !module.isBlock) {
      tasks.push({
        module,
        depth: depth + 1,
        section: sectionType,
        blockSection: blockSectionType,
        parentBlock: block
      })
    }
  }

  return tasks
}

/**
 * Traverse a block and return its structure
 */
function traverseBlock(
  block: Module,
  moduleMap: Map<string, Module>,
  sectionType: SectionType,
  depth: number
): TraversedBlock {
  return {
    block,
    depth,
    section: sectionType,
    sections: {
      normal: getBlockSectionTasks(block, 'normal', moduleMap, sectionType, depth),
      rescue: getBlockSectionTasks(block, 'rescue', moduleMap, sectionType, depth),
      always: getBlockSectionTasks(block, 'always', moduleMap, sectionType, depth)
    }
  }
}

/**
 * Traverse a section of a play, following links from START node
 */
function traverseSection(
  play: Play,
  sectionType: SectionType,
  moduleMap: Map<string, Module>
): TraversedSection {
  const result: TraversedSection = {
    name: sectionType,
    startNode: null,
    items: []
  }

  // Find the START node for this section
  const startNode = play.modules.find(m =>
    m.isPlay === true &&
    m.parentSection === sectionType
  )

  if (!startNode) {
    return result
  }

  result.startNode = startNode

  // Build adjacency list for this section
  const adjacency = buildAdjacencyList(play.links, sectionType)

  // Traverse links starting from START node
  const visited = new Set<string>()

  function traverse(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const nextNodes = adjacency.get(nodeId) || []

    for (const nextId of nextNodes) {
      const module = moduleMap.get(nextId)

      // Skip if module not found or is inside a block (handled by block traversal)
      if (!module || module.parentId) {
        traverse(nextId, depth)
        continue
      }

      if (module.isBlock) {
        // Traverse block with its sections
        const traversedBlock = traverseBlock(module, moduleMap, sectionType, depth)
        result.items.push(traversedBlock)
      } else if (module.isSystem) {
        // System block (assertions)
        result.items.push({
          module,
          depth,
          section: sectionType
        })
      } else if (!module.isPlay) {
        // Regular task
        result.items.push({
          module,
          depth,
          section: sectionType
        })
      }

      traverse(nextId, depth)
    }
  }

  traverse(startNode.id, 0)

  return result
}

/**
 * Traverse a single play
 */
function traversePlay(play: Play, index: number): TraversedPlay {
  const moduleMap = buildModuleMap(play.modules)

  const sections: SectionType[] = ['pre_tasks', 'tasks', 'post_tasks', 'handlers']

  return {
    play,
    index,
    sections: sections.map(sectionType => traverseSection(play, sectionType, moduleMap))
  }
}

/**
 * Main traversal function - traverse entire playbook structure
 */
export function traversePlaybook(plays: Play[]): TraversalResult {
  return {
    plays: plays.map((play, index) => traversePlay(play, index))
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════

export function isTraversedBlock(item: TraversedTask | TraversedBlock): item is TraversedBlock {
  return 'sections' in item
}

export function isTraversedTask(item: TraversedTask | TraversedBlock): item is TraversedTask {
  return !('sections' in item)
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all tasks from a traversal result (flattened)
 */
export function getAllTasks(result: TraversalResult): TraversedTask[] {
  const tasks: TraversedTask[] = []

  for (const play of result.plays) {
    for (const section of play.sections) {
      for (const item of section.items) {
        if (isTraversedTask(item)) {
          tasks.push(item)
        } else {
          // Add tasks from block sections
          tasks.push(...item.sections.normal)
          tasks.push(...item.sections.rescue)
          tasks.push(...item.sections.always)
        }
      }
    }
  }

  return tasks
}

/**
 * Get display label for a module
 */
export function getModuleLabel(module: Module): string {
  if (module.isSystem) {
    return `[${module.systemType || 'system'}]`
  }
  if (module.isBlock) {
    return module.taskName || module.name || 'Block'
  }
  return module.taskName || `${module.collection}.${module.name}`
}

/**
 * Get section display name
 */
export function getSectionDisplayName(section: SectionType): string {
  const names: Record<SectionType, string> = {
    pre_tasks: 'pre_tasks',
    tasks: 'tasks',
    post_tasks: 'post_tasks',
    handlers: 'handlers'
  }
  return names[section]
}

/**
 * Get block section display name
 */
export function getBlockSectionDisplayName(section: BlockSectionType): string {
  const names: Record<BlockSectionType, string> = {
    normal: 'block',
    rescue: 'rescue',
    always: 'always'
  }
  return names[section]
}
