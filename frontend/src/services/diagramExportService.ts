/**
 * Diagram Export Service
 * Handles export of playbook diagrams to various formats
 */

import { Play } from '../types/playbook'
import {
  AutomationFactoryDiagram,
  DiagramHeader,
  DiagramMetadata,
  DiagramContent,
  DiagramUIState,
  DiagramIntegrity,
  DiagramCompatibility,
  DiagramFeature,
  DIAGRAM_FORMAT,
  ExportOptions,
  MermaidExportOptions,
} from '../types/diagram-export'
import {
  traversePlaybook,
  isTraversedBlock,
  getModuleLabel,
  getSectionDisplayName,
  getBlockSectionDisplayName,
  TraversedTask,
  TraversedBlock,
} from './playbookTraversalService'

// ═══════════════════════════════════════════════════════════════════════════
// CHECKSUM CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate SHA-256 checksum of content
 * Falls back to simple hash if crypto.subtle is not available
 */
async function calculateChecksum(content: DiagramContent): Promise<string> {
  const text = JSON.stringify(content)

  // Try Web Crypto API first
  try {
    if (crypto?.subtle?.digest) {
      const encoder = new TextEncoder()
      const data = encoder.encode(text)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }
  } catch {
    // Fallback below
  }

  // Simple fallback hash (djb2 algorithm)
  let hash = 5381
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  return 'fallback-' + Math.abs(hash).toString(16).padStart(8, '0')
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect features used in the diagram
 */
function detectFeatures(plays: Play[]): DiagramFeature[] {
  const features = new Set<DiagramFeature>()

  for (const play of plays) {
    // Check for variables
    if (play.variables && play.variables.length > 0) {
      features.add('variables')
    }

    // Check for roles
    if (play.attributes?.roles && play.attributes.roles.length > 0) {
      features.add('roles')
    }

    // Check modules for various features
    for (const module of play.modules) {
      // Check for blocks
      if (module.isBlock) {
        features.add('blocks')
      }

      // Check for system blocks (assertions)
      if (module.isSystem) {
        features.add('system_blocks')
        if (module.systemType === 'assertions') {
          features.add('assertions')
        }
      }

      // Check for section types
      if (module.parentSection === 'handlers') {
        features.add('handlers')
      }
      if (module.parentSection === 'pre_tasks') {
        features.add('pre_tasks')
      }
      if (module.parentSection === 'post_tasks') {
        features.add('post_tasks')
      }
    }
  }

  return Array.from(features)
}

/**
 * Determine required features for import
 */
function getRequiredFeatures(features: DiagramFeature[]): DiagramFeature[] {
  // Features that are essential for proper import
  const essential: DiagramFeature[] = ['blocks', 'system_blocks', 'assertions']
  return features.filter(f => essential.includes(f))
}

// ═══════════════════════════════════════════════════════════════════════════
// COUNT CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

function countModules(plays: Play[]): number {
  return plays.reduce((sum, play) => sum + play.modules.length, 0)
}

function countLinks(plays: Play[]): number {
  return plays.reduce((sum, play) => sum + play.links.length, 0)
}

function countVariables(plays: Play[]): number {
  return plays.reduce((sum, play) => sum + (play.variables?.length || 0), 0)
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT TO ABD FORMAT
// ═══════════════════════════════════════════════════════════════════════════

export interface ExportContext {
  plays: Play[]
  playbookName: string
  playbookId?: string
  author?: string
  collapsedBlocks: string[]
  collapsedBlockSections: string[]
  collapsedPlaySections: string[]
  activePlayIndex: number
}

/**
 * Create AutomationFactoryDiagram object from current state
 */
export async function createDiagramExport(
  context: ExportContext,
  options: ExportOptions = {}
): Promise<AutomationFactoryDiagram> {
  const now = new Date().toISOString()
  const features = detectFeatures(context.plays)

  // Build header
  const header: DiagramHeader = {
    magic: DIAGRAM_FORMAT.MAGIC,
    formatVersion: DIAGRAM_FORMAT.VERSION,
    minAppVersion: DIAGRAM_FORMAT.MIN_APP_VERSION,
    createdAt: now,
    modifiedAt: now,
    generator: {
      name: 'Automation Factory',
      version: DIAGRAM_FORMAT.MIN_APP_VERSION,
      platform: 'web',
    },
  }

  // Build metadata
  const collections = new Set<string>()
  for (const play of context.plays) {
    for (const module of play.modules) {
      if (module.collection) {
        collections.add(module.collection)
      }
    }
  }

  const metadata: DiagramMetadata = {
    id: context.playbookId,
    name: context.playbookName || 'Untitled Playbook',
    author: context.author,
    ansible: {
      collections: Array.from(collections),
    },
  }

  // Build content
  const content: DiagramContent = {
    plays: context.plays,
  }

  // Build UI state
  const uiState: DiagramUIState = {
    collapsedBlocks: options.includeUIState !== false ? context.collapsedBlocks : [],
    collapsedBlockSections: options.includeUIState !== false ? context.collapsedBlockSections : [],
    collapsedPlaySections: options.includeUIState !== false ? context.collapsedPlaySections : [],
    activePlayIndex: options.includeUIState !== false ? context.activePlayIndex : 0,
  }

  // Build integrity
  const integrity: DiagramIntegrity = {
    checksum: options.includeIntegrity !== false ? await calculateChecksum(content) : '',
    moduleCount: countModules(context.plays),
    linkCount: countLinks(context.plays),
    playCount: context.plays.length,
    variableCount: countVariables(context.plays),
  }

  // Build compatibility
  const compatibility: DiagramCompatibility = {
    features,
    requiredFeatures: getRequiredFeatures(features),
    deprecatedFields: [],
  }

  return {
    header,
    metadata,
    content,
    uiState,
    integrity,
    compatibility,
  }
}

/**
 * Export diagram to .abd file and trigger download
 */
export async function exportToABD(
  context: ExportContext,
  options: ExportOptions = {}
): Promise<void> {
  const diagram = await createDiagramExport(context, options)

  const jsonString = options.prettyPrint
    ? JSON.stringify(diagram, null, 2)
    : JSON.stringify(diagram)

  const blob = new Blob([jsonString], { type: DIAGRAM_FORMAT.MIME_TYPE })
  const url = URL.createObjectURL(blob)

  const filename = options.filename || generateFilename(context.playbookName)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}${DIAGRAM_FORMAT.FILE_EXTENSION}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT TO MERMAID FORMAT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate Mermaid node ID from module ID
 */
function mermaidNodeId(id: string): string {
  return `task_${id.replace(/-/g, '_')}`
}

/**
 * Render a task node in Mermaid format
 */
function renderMermaidTask(task: TraversedTask, indent: string): string {
  const nodeId = mermaidNodeId(task.module.id)
  const label = escapeLabel(getModuleLabel(task.module))
  return `${indent}${nodeId}["${label}"]`
}

/**
 * Render a block with its sections in Mermaid format
 */
function renderMermaidBlock(
  block: TraversedBlock,
  indent: string,
  options: MermaidExportOptions
): string[] {
  const lines: string[] = []
  const blockId = `block_${block.block.id.replace(/-/g, '_')}`
  const blockLabel = escapeLabel(getModuleLabel(block.block))

  if (options.includeBlocks !== false) {
    lines.push(`${indent}subgraph ${blockId}["${blockLabel}"]`)

    const innerIndent = indent + '    '
    const taskIndent = innerIndent + '    '

    // Render each block section
    const blockSections: Array<{ key: 'normal' | 'rescue' | 'always', name: string }> = [
      { key: 'normal', name: 'block' },
      { key: 'rescue', name: 'rescue' },
      { key: 'always', name: 'always' }
    ]

    for (const { key, name } of blockSections) {
      const tasks = block.sections[key]
      if (tasks.length > 0) {
        lines.push(`${innerIndent}subgraph ${blockId}_${key}["${name}"]`)
        for (const task of tasks) {
          lines.push(renderMermaidTask(task, taskIndent))
        }
        lines.push(`${innerIndent}end`)
      }
    }

    lines.push(`${indent}end`)
  } else {
    // If blocks disabled, just render tasks flat
    for (const sectionKey of ['normal', 'rescue', 'always'] as const) {
      for (const task of block.sections[sectionKey]) {
        lines.push(renderMermaidTask(task, indent))
      }
    }
  }

  return lines
}

/**
 * Generate Mermaid flowchart from plays using traversal service
 */
export function generateMermaid(
  plays: Play[],
  options: MermaidExportOptions = {}
): string {
  const direction = options.direction || 'TD'
  const lines: string[] = []

  // Header
  lines.push(`flowchart ${direction}`)

  // Traverse playbook structure
  const traversal = traversePlaybook(plays)

  // Process each play
  for (const traversedPlay of traversal.plays) {
    const playId = `play${traversedPlay.index}`

    if (options.includePlays !== false) {
      lines.push(`    subgraph ${playId}["${escapeLabel(traversedPlay.play.name || `Play ${traversedPlay.index + 1}`)}"]`)
      lines.push(`        direction ${direction}`)
    }

    // Process each section
    for (const section of traversedPlay.sections) {
      if (section.items.length === 0) continue

      const sectionId = `${playId}_${section.name}`

      if (options.includeSections !== false) {
        const sectionLabel = getSectionDisplayName(section.name)
        lines.push(`        subgraph ${sectionId}["${sectionLabel}"]`)
      }

      const itemIndent = options.includeSections !== false ? '            ' : '        '

      // Render items (tasks and blocks)
      for (const item of section.items) {
        if (isTraversedBlock(item)) {
          lines.push(...renderMermaidBlock(item, itemIndent, options))
        } else {
          lines.push(renderMermaidTask(item, itemIndent))
        }
      }

      if (options.includeSections !== false) {
        lines.push(`        end`)
      }
    }

    // Add links between tasks (following the link order)
    const addedLinks = new Set<string>()
    for (const link of traversedPlay.play.links) {
      const fromModule = traversedPlay.play.modules.find(m => m.id === link.from)
      const toModule = traversedPlay.play.modules.find(m => m.id === link.to)

      if (!fromModule || !toModule) continue
      if (fromModule.isPlay) continue // Skip links from START nodes
      if (toModule.isPlay) continue

      const fromId = mermaidNodeId(link.from)
      const toId = mermaidNodeId(link.to)
      const linkKey = `${fromId}->${toId}`

      if (!addedLinks.has(linkKey)) {
        addedLinks.add(linkKey)
        if (link.type === 'rescue') {
          lines.push(`        ${fromId} -.->|rescue| ${toId}`)
        } else if (link.type === 'always') {
          lines.push(`        ${fromId} ==>|always| ${toId}`)
        } else {
          lines.push(`        ${fromId} --> ${toId}`)
        }
      }
    }

    if (options.includePlays !== false) {
      lines.push(`    end`)
    }
  }

  return lines.join('\n')
}

/**
 * Escape special characters for Mermaid labels
 */
function escapeLabel(text: string): string {
  return text
    .replace(/"/g, "'")
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
}

/**
 * Export diagram to Mermaid .md file and trigger download
 */
export function exportToMermaid(
  plays: Play[],
  playbookName: string,
  options: MermaidExportOptions = {}
): void {
  const mermaid = generateMermaid(plays, options)

  const content = `# ${playbookName || 'Playbook'} - Diagram

\`\`\`mermaid
${mermaid}
\`\`\`

---
*Generated by Automation Factory on ${new Date().toISOString()}*
`

  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)

  const filename = generateFilename(playbookName)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate filename from playbook name
 */
function generateFilename(name: string): string {
  const safeName = (name || 'playbook')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const date = new Date().toISOString().split('T')[0]
  return `${safeName}-${date}`
}
