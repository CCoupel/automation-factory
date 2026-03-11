/**
 * Pure helper functions for the visual canvas.
 * Extracted from WorkZone to be reusable by VisualCanvas and future role editor.
 * All functions are pure — no store access, no side effects.
 */

import { ModuleBlock, Link, PlaySectionName } from '../types/playbook'

// =====================================================
// Constants
// =====================================================

export const GRID_SIZE = 50

// =====================================================
// Grid
// =====================================================

export const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

// =====================================================
// Dimensions
// =====================================================

/**
 * Check whether a block section is collapsed.
 */
export const isSectionCollapsed = (
  blockId: string,
  section: 'normal' | 'rescue' | 'always',
  collapsedBlockSections: Set<string>,
): boolean => {
  const key = `${blockId}:${section}`
  const wildcardKey = `*:${section}`
  return collapsedBlockSections.has(key) || collapsedBlockSections.has(wildcardKey)
}

/**
 * Check whether a play section is collapsed.
 */
export const isPlaySectionCollapsed = (
  playId: string,
  section: PlaySectionName,
  collapsedPlaySections: Set<string>,
): boolean => {
  const key = `${playId}:${section}`
  const wildcardKey = `*:${section}`
  return collapsedPlaySections.has(key) || collapsedPlaySections.has(wildcardKey)
}

/**
 * Calculate dimensions of a block based on its children.
 * Recursive — calls itself for nested blocks.
 */
export const getBlockDimensions = (
  block: ModuleBlock,
  modules: ModuleBlock[],
  collapsedBlocks: Set<string>,
  collapsedBlockSections: Set<string>,
): { width: number; height: number } => {
  // PLAY START tasks have fixed small size
  if (block.isPlay) {
    return { width: 150, height: 50 }
  }

  // Collapsed blocks have fixed small size
  if (collapsedBlocks.has(block.id)) {
    return { width: 140, height: 60 }
  }

  // Normal blocks — compute from content
  const baseWidth = 250
  const headerHeight = 50
  const sectionHeaderHeight = 25
  const minSectionContentHeight = 200
  const sectionPadding = 4
  const bottomPadding = 20

  const manualWidth = block.width || baseWidth
  const manualHeight = block.height || 0

  let totalHeight = headerHeight

  const sections: Array<'normal' | 'rescue' | 'always'> = ['normal', 'rescue', 'always']

  // All section headers contribute height
  totalHeight += sections.length * sectionHeaderHeight

  // Content of the open section
  const openSection = sections.find(
    section => !isSectionCollapsed(block.id, section, collapsedBlockSections),
  )

  if (openSection && block.blockSections) {
    const taskIds = block.blockSections[openSection] || []

    if (taskIds.length === 0) {
      totalHeight += minSectionContentHeight
    } else {
      let maxBottomY = 0
      let maxRightX = 0

      taskIds.forEach(taskId => {
        const task = modules.find(m => m.id === taskId)
        if (task) {
          const taskY = task.y || 10
          let taskHeight = 60

          if (task.isBlock) {
            const nestedBlockDims = getBlockDimensions(task, modules, collapsedBlocks, collapsedBlockSections)
            taskHeight = nestedBlockDims.height
            maxRightX = Math.max(maxRightX, (task.x || 10) + nestedBlockDims.width)
          } else {
            maxRightX = Math.max(maxRightX, (task.x || 10) + 140)
          }

          maxBottomY = Math.max(maxBottomY, taskY + taskHeight)
        }
      })

      const sectionContentHeight = Math.max(
        maxBottomY + bottomPadding,
        minSectionContentHeight,
      )
      totalHeight += sectionContentHeight

      const calculatedWidth = Math.max(
        baseWidth,
        maxRightX + sectionPadding * 2 + 20,
      )

      return {
        width: Math.max(manualWidth, calculatedWidth),
        height: Math.max(manualHeight, totalHeight),
      }
    }
  }

  // Empty or no blockSections
  const defaultHeight = totalHeight + minSectionContentHeight

  return {
    width: Math.max(manualWidth, baseWidth),
    height: Math.max(manualHeight, defaultHeight),
  }
}

/**
 * Get dimensions of any module (block, START, virtual, or normal task).
 */
export const getModuleDimensions = (
  module: ModuleBlock,
  modules: ModuleBlock[],
  collapsedBlocks: Set<string>,
  collapsedBlockSections: Set<string>,
): { width: number; height: number } => {
  if (module.isBlock) {
    return getBlockDimensions(module, modules, collapsedBlocks, collapsedBlockSections)
  }
  if (module.collection === 'virtual') {
    return { width: 60, height: 40 }
  }
  if (module.isPlay) {
    return { width: 60, height: 40 }
  }
  return { width: 140, height: 60 }
}

// =====================================================
// Colors & Themes
// =====================================================

/**
 * Color for a block section (normal/rescue/always).
 */
export const getSectionColor = (section: 'normal' | 'rescue' | 'always'): string => {
  switch (section) {
    case 'normal':
      return '#1976d2'
    case 'rescue':
      return '#ff9800'
    case 'always':
      return '#4caf50'
  }
}

/**
 * Color for a play section.
 */
export const getPlaySectionColor = (section: PlaySectionName): string => {
  switch (section) {
    case 'variables':
      return '#673ab7'
    case 'roles':
      return '#4caf50'
    case 'pre_tasks':
      return '#9c27b0'
    case 'tasks':
      return '#1976d2'
    case 'post_tasks':
      return '#00796b'
    case 'handlers':
      return '#ff9800'
    default:
      return '#757575'
  }
}

/**
 * Get the play theme (always green).
 */
export const getPlayTheme = () => ({
  borderColor: '#2e7d32',
  bgColor: 'rgba(46, 125, 50, 0.08)',
  iconColor: '#2e7d32',
})

/**
 * Check if a module is orphan (no connected path to a START).
 */
export const isOrphan = (
  moduleId: string,
  modules: ModuleBlock[],
  links: Link[],
  visited = new Set<string>(),
): boolean => {
  const module = modules.find(m => m.id === moduleId)
  if (module?.isPlay) return false
  if (visited.has(moduleId)) return true
  visited.add(moduleId)

  const incomingLink = links.find(l => l.to === moduleId)
  if (!incomingLink) return true

  return isOrphan(incomingLink.from, modules, links, visited)
}

/**
 * Get block theme colors based on incoming link type and orphan status.
 */
export const getBlockTheme = (
  blockId: string,
  modules: ModuleBlock[],
  links: Link[],
): { borderColor: string; bgColor: string; iconColor: string } => {
  if (isOrphan(blockId, modules, links)) {
    return {
      borderColor: '#757575',
      bgColor: 'rgba(117, 117, 117, 0.05)',
      iconColor: '#757575',
    }
  }

  const incomingLink = links.find(l => l.to === blockId)

  if (!incomingLink) {
    return {
      borderColor: '#9c27b0',
      bgColor: 'rgba(156, 39, 176, 0.05)',
      iconColor: '#9c27b0',
    }
  }

  switch (incomingLink.type) {
    case 'rescue':
      return {
        borderColor: '#ff9800',
        bgColor: 'rgba(255, 152, 0, 0.05)',
        iconColor: '#ff9800',
      }
    case 'always':
      return {
        borderColor: '#4caf50',
        bgColor: 'rgba(76, 175, 80, 0.05)',
        iconColor: '#4caf50',
      }
    default:
      return {
        borderColor: '#1976d2',
        bgColor: 'rgba(25, 118, 210, 0.05)',
        iconColor: '#1976d2',
      }
  }
}

/**
 * Get task theme based on orphan status.
 */
export const getTaskTheme = (
  taskId: string,
  modules: ModuleBlock[],
  links: Link[],
): { numberBgColor: string; moduleNameColor: string; borderColor: string } => {
  if (isOrphan(taskId, modules, links)) {
    return {
      numberBgColor: '#757575',
      moduleNameColor: '#757575',
      borderColor: '#757575',
    }
  }
  return {
    numberBgColor: '#1976d2',
    moduleNameColor: '#1976d2',
    borderColor: '#1976d2',
  }
}

/**
 * Get link style based on link type.
 */
export const getLinkStyle = (
  type: string,
): { stroke: string; strokeWidth?: string; strokeDasharray?: string; label?: string } => {
  switch (type) {
    case 'rescue':
      return { stroke: '#ff9800', strokeDasharray: '5,5', label: 'rescue' }
    case 'always':
      return { stroke: '#4caf50', strokeDasharray: '0', strokeWidth: '3', label: 'always' }
    case 'pre_tasks':
      return { stroke: '#9c27b0', strokeDasharray: '0', label: '' }
    case 'tasks':
      return { stroke: '#1976d2', strokeDasharray: '0', label: '' }
    case 'post_tasks':
      return { stroke: '#00796b', strokeDasharray: '0', label: '' }
    case 'handlers':
      return { stroke: '#f57c00', strokeDasharray: '8,4', label: '' }
    default:
      return { stroke: '#1976d2', strokeDasharray: '0', label: '' }
  }
}

// =====================================================
// Link helpers
// =====================================================

/**
 * Determine link type from the source module's section.
 */
export const getLinkTypeFromSource = (
  sourceId: string,
  modules: ModuleBlock[],
): 'normal' | 'rescue' | 'always' | 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers' => {
  // Mini START tasks of block sections
  if (sourceId.endsWith('-start')) {
    if (sourceId.includes('-normal-start')) return 'normal'
    if (sourceId.includes('-rescue-start')) return 'rescue'
    if (sourceId.includes('-always-start')) return 'always'
  }

  const sourceModule = modules.find(m => m.id === sourceId)

  // Task in a play section (no parentId)
  if (sourceModule?.parentSection && !sourceModule.parentId) {
    if (sourceModule.parentSection === 'pre_tasks') return 'pre_tasks'
    if (sourceModule.parentSection === 'tasks') return 'tasks'
    if (sourceModule.parentSection === 'post_tasks') return 'post_tasks'
    if (sourceModule.parentSection === 'handlers') return 'handlers'
  }

  // Task in a block section
  if (sourceModule?.parentSection && sourceModule.parentId) {
    if (sourceModule.parentSection === 'rescue') return 'rescue'
    if (sourceModule.parentSection === 'always') return 'always'
  }

  return 'normal'
}

/**
 * Count tasks in a chain starting from a START module (BFS traversal).
 */
export const getStartChainCount = (startId: string, links: Link[]): number => {
  const visited = new Set<string>()
  const queue = [startId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    if (visited.has(currentId)) continue
    visited.add(currentId)

    const outgoingLinks = links.filter(link => link.from === currentId)
    for (const link of outgoingLinks) {
      if (!visited.has(link.to)) {
        queue.push(link.to)
      }
    }
  }

  return Math.max(0, visited.size - 1)
}

/**
 * Get a module or create a virtual mini-START task object.
 */
export const getModuleOrVirtual = (
  moduleId: string,
  modules: ModuleBlock[],
): ModuleBlock | undefined => {
  const module = modules.find(m => m.id === moduleId)
  if (module) return module

  if (moduleId.endsWith('-start')) {
    const parts = moduleId.split('-')
    if (parts.length >= 3 && parts[parts.length - 1] === 'start') {
      const section = parts[parts.length - 2] as 'normal' | 'rescue' | 'always'
      const blockId = parts.slice(0, -2).join('-')

      const parentBlock = modules.find(m => m.id === blockId)
      if (parentBlock) {
        return {
          id: moduleId,
          collection: 'virtual',
          name: 'mini-start',
          description: 'Mini START task',
          taskName: 'START',
          x: 20,
          y: 10,
          isBlock: false,
          isPlay: false,
          parentId: blockId,
          parentSection: section,
        }
      }
    }
  }

  return undefined
}
