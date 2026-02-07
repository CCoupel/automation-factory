/**
 * SVG Export Service
 * Handles export of playbook diagrams to SVG format
 *
 * Key features:
 * - Uses actual canvas positions (x, y coordinates) from modules
 * - Respects collapsed/expanded state of blocks
 * - Renders block children INSIDE their parent block (relative coordinates)
 * - Renders internal links within blocks
 * - Supports all play sections (pre_tasks, tasks, post_tasks, handlers)
 */

import { Play, ModuleBlock as Module, Link } from '../types/playbook'
import { SVGExportOptions } from '../types/diagram-export'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
  module: '#1976d2',
  block: '#7b1fa2',
  play: '#388e3c',
  system: '#9e9e9e',
  pre_tasks: '#2196f3',
  tasks: '#4caf50',
  post_tasks: '#ff9800',
  handlers: '#9c27b0',
  normal: '#7b1fa2',
  rescue: '#f44336',
  always: '#2196f3',
  link_normal: '#666666',
  link_rescue: '#f44336',
  link_always: '#2196f3',
  background: '#ffffff',
  text: '#333333',
  textLight: '#666666',
}

const DEFAULT_WIDTH = 200
const DEFAULT_HEIGHT = 40
const COLLAPSED_BLOCK_HEIGHT = 36
const BLOCK_HEADER_HEIGHT = 28
const SECTION_HEADER_HEIGHT = 20

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncateText(text: string, maxWidth: number, fontSize: number): string {
  const maxChars = Math.floor(maxWidth / (fontSize * 0.6))
  if (text.length <= maxChars) return text
  return text.substring(0, maxChars - 2) + '…'
}

function getModuleLabel(module: Module): string {
  if (module.taskName) return module.taskName
  if (module.collection && module.name) return `${module.collection}.${module.name}`
  return module.name || 'module'
}

function getLinkColor(type?: string): string {
  switch (type) {
    case 'rescue': return COLORS.link_rescue
    case 'always': return COLORS.link_always
    default: return COLORS.link_normal
  }
}

function getSectionColor(section: string): string {
  switch (section) {
    case 'pre_tasks': return COLORS.pre_tasks
    case 'tasks': return COLORS.tasks
    case 'post_tasks': return COLORS.post_tasks
    case 'handlers': return COLORS.handlers
    default: return COLORS.tasks
  }
}

function getEffectiveHeight(module: Module, collapsedBlocks: Set<string>): number {
  if (module.isBlock && collapsedBlocks.has(module.id)) {
    return COLLAPSED_BLOCK_HEIGHT
  }
  return module.height || DEFAULT_HEIGHT
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render a task at given coordinates
 * @param offsetX - offset to add to module.x (for relative positioning inside blocks)
 * @param offsetY - offset to add to module.y
 */
function renderTask(
  module: Module,
  scale: number,
  offsetX: number = 0,
  offsetY: number = 0
): string {
  const x = ((module.x || 0) + offsetX) * scale
  const y = ((module.y || 0) + offsetY) * scale
  const width = (module.width || DEFAULT_WIDTH) * scale
  const height = (module.height || DEFAULT_HEIGHT) * scale
  const radius = 4 * scale
  const fontSize = 11 * scale
  const padding = 8 * scale

  const label = truncateText(getModuleLabel(module), width - padding * 2, fontSize)

  let fillColor = 'white'
  let strokeColor = COLORS.module
  let textColor = COLORS.text
  let fontWeight = 'normal'

  if (module.isPlay) {
    fillColor = COLORS.play
    strokeColor = COLORS.play
    textColor = 'white'
    fontWeight = 'bold'
  } else if (module.isSystem) {
    fillColor = '#f5f5f5'
    strokeColor = COLORS.system
    textColor = COLORS.textLight
  }

  const textX = module.isPlay ? x + width / 2 : x + padding
  const textAnchor = module.isPlay ? 'middle' : 'start'

  return `
    <g class="task" data-id="${module.id}">
      <rect x="${x}" y="${y}" width="${width}" height="${height}"
        rx="${radius}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${1.5 * scale}"/>
      <text x="${textX}" y="${y + height / 2 + fontSize / 3}"
        font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}"
        fill="${textColor}" text-anchor="${textAnchor}">${escapeXml(label)}</text>
    </g>`
}

// ═══════════════════════════════════════════════════════════════════════════
// LINK RENDERING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render links between modules
 * @param offsetX - offset for relative positioning
 * @param offsetY - offset for relative positioning
 */
function renderLinks(
  links: Link[],
  modules: Module[],
  collapsedBlocks: Set<string>,
  scale: number,
  offsetX: number = 0,
  offsetY: number = 0
): string {
  const elements: string[] = []
  const moduleMap = new Map(modules.map(m => [m.id, m]))
  const arrowSize = 6 * scale

  for (const link of links) {
    const from = moduleMap.get(link.from)
    const to = moduleMap.get(link.to)
    if (!from || !to) continue

    const fromHeight = getEffectiveHeight(from, collapsedBlocks)
    const toHeight = getEffectiveHeight(to, collapsedBlocks)

    const fromX = ((from.x || 0) + offsetX + (from.width || DEFAULT_WIDTH)) * scale
    const fromY = ((from.y || 0) + offsetY + fromHeight / 2) * scale
    const toX = ((to.x || 0) + offsetX) * scale
    const toY = ((to.y || 0) + offsetY + toHeight / 2) * scale

    const color = getLinkColor(link.type)
    const dx = toX - fromX
    const cpOffset = Math.max(20 * scale, Math.abs(dx) * 0.3)
    const markerId = `arr_${link.from.slice(-6)}_${link.to.slice(-6)}`
    const isDashed = link.type === 'rescue'

    elements.push(`
      <defs>
        <marker id="${markerId}" markerWidth="${arrowSize}" markerHeight="${arrowSize}"
          refX="${arrowSize - 1}" refY="${arrowSize / 2}" orient="auto" markerUnits="userSpaceOnUse">
          <polygon points="0 0, ${arrowSize} ${arrowSize / 2}, 0 ${arrowSize}" fill="${color}"/>
        </marker>
      </defs>
      <path d="M ${fromX} ${fromY} C ${fromX + cpOffset} ${fromY}, ${toX - cpOffset} ${toY}, ${toX} ${toY}"
        fill="none" stroke="${color}" stroke-width="${1.5 * scale}"
        marker-end="url(#${markerId})" ${isDashed ? `stroke-dasharray="${4 * scale} ${2 * scale}"` : ''}/>`)
  }

  return elements.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK RENDERING
// ═══════════════════════════════════════════════════════════════════════════

function renderBlockCollapsed(block: Module, scale: number): string {
  const x = (block.x || 0) * scale
  const y = (block.y || 0) * scale
  const width = (block.width || DEFAULT_WIDTH) * scale
  const height = COLLAPSED_BLOCK_HEIGHT * scale
  const radius = 4 * scale
  const fontSize = 11 * scale
  const padding = 8 * scale

  const color = block.isSystem ? COLORS.system : COLORS.block
  const label = truncateText(getModuleLabel(block), width - padding * 4, fontSize)
  const lockIcon = block.isSystem ? ' 🔒' : ''

  return `
    <g class="block-collapsed" data-id="${block.id}">
      <rect x="${x}" y="${y}" width="${width}" height="${height}"
        rx="${radius}" fill="${color}15" stroke="${color}" stroke-width="${1.5 * scale}"
        ${block.isSystem ? `stroke-dasharray="${4 * scale} ${2 * scale}"` : ''}/>
      <text x="${x + padding}" y="${y + height / 2 + fontSize / 3}"
        font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
        fill="${color}">${escapeXml(label)}${lockIcon} ▶</text>
    </g>`
}

function renderBlockExpanded(
  block: Module,
  allModules: Module[],
  allLinks: Link[],
  scale: number
): string {
  const blockX = block.x || 0
  const blockY = block.y || 0
  const x = blockX * scale
  const y = blockY * scale
  const width = (block.width || DEFAULT_WIDTH) * scale
  const height = (block.height || 200) * scale
  const radius = 4 * scale
  const fontSize = 11 * scale
  const padding = 8 * scale
  const headerHeight = BLOCK_HEADER_HEIGHT * scale
  const sectionHeaderHeight = SECTION_HEADER_HEIGHT * scale

  const color = block.isSystem ? COLORS.system : COLORS.block
  const label = truncateText(getModuleLabel(block), width - padding * 3, fontSize)
  const lockIcon = block.isSystem ? ' 🔒' : ''

  const elements: string[] = []

  // Block container
  elements.push(`
    <g class="block-expanded" data-id="${block.id}">
      <rect x="${x}" y="${y}" width="${width}" height="${height}"
        rx="${radius}" fill="${color}05" stroke="${color}" stroke-width="${1.5 * scale}"
        ${block.isSystem ? `stroke-dasharray="${4 * scale} ${2 * scale}"` : ''}/>
      <rect x="${x}" y="${y}" width="${width}" height="${headerHeight}"
        rx="${radius}" fill="${color}20"/>
      <text x="${x + padding}" y="${y + headerHeight / 2 + fontSize / 3}"
        font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
        fill="${color}">${escapeXml(label)}${lockIcon} ▼</text>
    </g>`)

  // Get block sections
  const blockSections = block.blockSections || { normal: [], rescue: [], always: [] }

  // Collect all children (by blockSections or parentId)
  const childrenByParentId = allModules.filter(m => m.parentId === block.id)

  // Create child map
  const childMap = new Map<string, Module>()
  for (const child of allModules) {
    childMap.set(child.id, child)
  }

  // Build sections config
  const sectionsConfig = [
    { name: 'normal', ids: [...(blockSections.normal || [])], color: COLORS.normal, label: '' },
    { name: 'rescue', ids: [...(blockSections.rescue || [])], color: COLORS.rescue, label: 'RESCUE' },
    { name: 'always', ids: [...(blockSections.always || [])], color: COLORS.always, label: 'ALWAYS' },
  ]

  // If blockSections empty, use parentId children
  const hasBlockSections = sectionsConfig.some(s => s.ids.length > 0)
  if (!hasBlockSections && childrenByParentId.length > 0) {
    for (const child of childrenByParentId) {
      const section = child.parentSection || 'normal'
      const config = sectionsConfig.find(s => s.name === section)
      if (config) {
        config.ids.push(child.id)
      } else {
        sectionsConfig[0].ids.push(child.id) // default to normal
      }
    }
  }

  // Collect all child IDs for internal links
  const allChildIds = new Set<string>()
  sectionsConfig.forEach(s => s.ids.forEach(id => allChildIds.add(id)))

  // Internal links (both from and to are children of this block)
  const internalLinks = allLinks.filter(l => allChildIds.has(l.from) && allChildIds.has(l.to))

  // Render links inside block (children have relative coordinates to block)
  if (internalLinks.length > 0) {
    const childModules = Array.from(allChildIds).map(id => childMap.get(id)).filter((m): m is Module => !!m)
    elements.push(renderLinks(internalLinks, childModules, new Set(), scale, blockX, blockY))
  }

  // Current Y position inside block (relative to block top)
  let currentY = headerHeight + 4 * scale

  for (const section of sectionsConfig) {
    const children = section.ids.map(id => childMap.get(id)).filter((c): c is Module => !!c)

    if (children.length === 0 && section.name !== 'normal') continue

    // Section header for rescue/always
    if (section.label && children.length > 0) {
      elements.push(`
        <rect x="${x + 4 * scale}" y="${y + currentY}"
          width="${width - 8 * scale}" height="${sectionHeaderHeight}"
          fill="${section.color}20" rx="${2 * scale}"/>
        <text x="${x + padding}" y="${y + currentY + sectionHeaderHeight / 2 + 4 * scale}"
          font-family="Arial, sans-serif" font-size="${9 * scale}" font-weight="bold"
          fill="${section.color}">${section.label}</text>`)
      currentY += sectionHeaderHeight + 2 * scale
    }

    // Render children - coordinates are RELATIVE to block
    for (const child of children) {
      elements.push(renderTask(child, scale, blockX, blockY))
    }

    // Update currentY based on children bounds
    if (children.length > 0) {
      const maxChildBottom = Math.max(...children.map(c => (c.y || 0) + (c.height || DEFAULT_HEIGHT)))
      currentY = Math.max(currentY, maxChildBottom * scale + 8 * scale)
    }
  }

  return elements.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION RENDERING
// ═══════════════════════════════════════════════════════════════════════════

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function calculateBounds(modules: Module[], collapsedBlocks: Set<string>): Bounds | null {
  if (modules.length === 0) return null

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const m of modules) {
    const x = m.x || 0
    const y = m.y || 0
    const width = m.width || DEFAULT_WIDTH
    const height = getEffectiveHeight(m, collapsedBlocks)

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }

  return { minX, minY, maxX, maxY }
}

function renderSection(
  sectionName: string,
  modules: Module[],
  links: Link[],
  collapsedBlocks: Set<string>,
  offsetY: number,
  scale: number,
  svgWidth: number
): { svg: string; height: number } {
  // Get top-level modules (not children of blocks)
  const topLevel = modules.filter(m => m.parentSection === sectionName && !m.parentId)
  if (topLevel.length === 0) return { svg: '', height: 0 }

  const color = getSectionColor(sectionName)
  const padding = 20 * scale
  const headerHeight = 24 * scale
  const fontSize = 11 * scale

  const elements: string[] = []

  // Section header
  elements.push(`
    <rect x="${padding / 2}" y="${offsetY}" width="${svgWidth - padding}" height="${headerHeight}"
      fill="${color}20" rx="${4 * scale}"/>
    <text x="${padding}" y="${offsetY + headerHeight / 2 + 4 * scale}"
      font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
      fill="${color}">${sectionName.replace('_', ' ').toUpperCase()}</text>`)

  // Calculate bounds
  const bounds = calculateBounds(topLevel, collapsedBlocks)
  if (!bounds) return { svg: elements.join('\n'), height: headerHeight }

  // Content positioning
  const contentStartY = offsetY + headerHeight + padding / 2
  const translateX = padding - bounds.minX * scale
  const translateY = contentStartY - bounds.minY * scale

  elements.push(`<g transform="translate(${translateX}, ${translateY})">`)

  // Links between top-level modules (not inside blocks)
  const topLevelIds = new Set(topLevel.map(m => m.id))
  const sectionLinks = links.filter(l => topLevelIds.has(l.from) || topLevelIds.has(l.to))

  // Filter out internal block links (handled by block rendering)
  const blockIds = new Set(topLevel.filter(m => m.isBlock).map(m => m.id))
  const childIds = new Set(modules.filter(m => m.parentId && blockIds.has(m.parentId)).map(m => m.id))
  const externalLinks = sectionLinks.filter(l => !childIds.has(l.from) || !childIds.has(l.to))

  elements.push(renderLinks(externalLinks, modules, collapsedBlocks, scale))

  // Render modules
  for (const module of topLevel) {
    if (module.isBlock) {
      if (collapsedBlocks.has(module.id)) {
        elements.push(renderBlockCollapsed(module, scale))
      } else {
        elements.push(renderBlockExpanded(module, modules, links, scale))
      }
    } else {
      elements.push(renderTask(module, scale))
    }
  }

  elements.push('</g>')

  const contentHeight = (bounds.maxY - bounds.minY) * scale + padding
  return { svg: elements.join('\n'), height: headerHeight + contentHeight }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAY RENDERING
// ═══════════════════════════════════════════════════════════════════════════

function renderPlay(
  play: Play,
  playIndex: number,
  collapsedBlocks: Set<string>,
  startY: number,
  scale: number,
  svgWidth: number
): { svg: string; height: number } {
  const padding = 20 * scale
  const headerHeight = 32 * scale
  const fontSize = 13 * scale

  const elements: string[] = []
  let currentY = startY

  elements.push(`
    <rect x="${padding / 2}" y="${currentY}" width="${svgWidth - padding}" height="${headerHeight}"
      fill="${COLORS.play}15" rx="${6 * scale}"/>
    <text x="${padding}" y="${currentY + headerHeight / 2 + 5 * scale}"
      font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
      fill="${COLORS.play}">▶ ${escapeXml(play.name || `Play ${playIndex + 1}`)}</text>`)

  currentY += headerHeight + padding / 2

  for (const section of ['pre_tasks', 'tasks', 'post_tasks', 'handlers']) {
    const { svg, height } = renderSection(
      section, play.modules, play.links,
      collapsedBlocks, currentY, scale, svgWidth
    )
    if (svg && height > 0) {
      elements.push(svg)
      currentY += height + padding / 3
    }
  }

  return { svg: elements.join('\n'), height: currentY - startY }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════

function calculateTotalWidth(plays: Play[], scale: number): number {
  let maxX = 0
  for (const play of plays) {
    for (const m of play.modules) {
      // For blocks, also consider children bounds
      if (m.isBlock) {
        maxX = Math.max(maxX, (m.x || 0) + (m.width || DEFAULT_WIDTH))
      } else if (!m.parentId) {
        maxX = Math.max(maxX, (m.x || 0) + (m.width || DEFAULT_WIDTH))
      }
    }
  }
  return Math.max(800, maxX + 100) * scale
}

export function generateSVG(
  plays: Play[],
  playbookName: string,
  options: SVGExportOptions = {}
): string {
  const scale = options.scale || 1
  const padding = (options.padding || 20) * scale
  const bgColor = options.backgroundColor || COLORS.background
  const collapsedBlocks = new Set(options.collapsedBlocks || [])

  const svgWidth = calculateTotalWidth(plays, scale)
  const elements: string[] = []
  let currentY = padding + 25 * scale

  elements.push(`
    <text x="${padding}" y="${padding + 14 * scale}"
      font-family="Arial, sans-serif" font-size="${15 * scale}" font-weight="bold"
      fill="${COLORS.text}">📋 ${escapeXml(playbookName || 'Playbook')}</text>`)

  for (let i = 0; i < plays.length; i++) {
    const { svg, height } = renderPlay(plays[i], i, collapsedBlocks, currentY, scale, svgWidth)
    elements.push(svg)
    currentY += height + padding
  }

  const totalHeight = currentY + padding

  elements.push(`
    <text x="${padding}" y="${totalHeight - 8 * scale}"
      font-family="Arial, sans-serif" font-size="${9 * scale}"
      fill="${COLORS.textLight}">Automation Factory v2.1.0 • ${new Date().toISOString().split('T')[0]}</text>`)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${totalHeight}"
  viewBox="0 0 ${svgWidth} ${totalHeight}">
  <defs><style>text { user-select: none; font-family: Arial, sans-serif; }</style></defs>
  <rect width="100%" height="100%" fill="${bgColor}"/>
  ${elements.join('\n')}
</svg>`
}

export function exportToSVG(
  plays: Play[],
  playbookName: string,
  options: SVGExportOptions = {}
): void {
  const svg = generateSVG(plays, playbookName, options)
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)

  const safeName = (playbookName || 'playbook')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const date = new Date().toISOString().split('T')[0]

  const link = document.createElement('a')
  link.href = url
  link.download = `${safeName}-${date}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
