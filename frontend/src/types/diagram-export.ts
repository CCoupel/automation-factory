/**
 * Automation Factory Diagram Export/Import Types
 * Format version: 1.0.0
 * File extension: .abd (Automation Factory Diagram)
 */

import { Play } from './playbook'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const DIAGRAM_FORMAT = {
  MAGIC: 'AUTOMATION_FACTORY_DIAGRAM',
  VERSION: '1.0.0',
  MIN_APP_VERSION: '2.1.0',
  FILE_EXTENSION: '.abd',
  MIME_TYPE: 'application/vnd.automation-factory.diagram+json',
} as const

// ═══════════════════════════════════════════════════════════════════════════
// HEADER - Identification and control
// ═══════════════════════════════════════════════════════════════════════════

export interface DiagramHeader {
  /** Magic identifier for format recognition */
  magic: typeof DIAGRAM_FORMAT.MAGIC
  /** Format version (semver) */
  formatVersion: string
  /** Minimum app version required for import */
  minAppVersion: string
  /** Maximum app version compatible (optional) */
  maxAppVersion?: string
  /** ISO 8601 creation timestamp */
  createdAt: string
  /** ISO 8601 last modification timestamp */
  modifiedAt: string
  /** Generator information */
  generator: {
    name: string
    version: string
    platform: 'web' | 'desktop' | 'cli'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// METADATA - Playbook information
// ═══════════════════════════════════════════════════════════════════════════

export interface DiagramMetadata {
  /** Playbook UUID (if saved to database) */
  id?: string
  /** Playbook name */
  name: string
  /** Description */
  description?: string
  /** Author username */
  author?: string
  /** Tags for categorization */
  tags?: string[]
  /** Ansible-specific metadata */
  ansible: {
    /** Target Ansible version */
    targetVersion?: string
    /** Collections used in this playbook */
    collections?: string[]
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT - Diagram data
// ═══════════════════════════════════════════════════════════════════════════

export interface DiagramContent {
  /** Array of plays with all modules, links, variables, attributes */
  plays: Play[]
}

// ═══════════════════════════════════════════════════════════════════════════
// UI STATE - Interface state (optional on import)
// ═══════════════════════════════════════════════════════════════════════════

export interface DiagramUIState {
  /** IDs of collapsed blocks */
  collapsedBlocks: string[]
  /** IDs of collapsed block sections */
  collapsedBlockSections: string[]
  /** IDs of collapsed play sections */
  collapsedPlaySections: string[]
  /** Currently active play index */
  activePlayIndex?: number
  /** Viewport state (for future use) */
  viewport?: {
    zoom: number
    panX: number
    panY: number
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRITY - Integrity checks
// ═══════════════════════════════════════════════════════════════════════════

export interface DiagramIntegrity {
  /** SHA-256 checksum of stringified content */
  checksum: string
  /** Total number of modules across all plays */
  moduleCount: number
  /** Total number of links across all plays */
  linkCount: number
  /** Number of plays */
  playCount: number
  /** Total number of variables across all plays */
  variableCount: number
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPATIBILITY - Future migrations
// ═══════════════════════════════════════════════════════════════════════════

export interface DiagramCompatibility {
  /** Features used in this diagram */
  features: DiagramFeature[]
  /** Features required for successful import */
  requiredFeatures: DiagramFeature[]
  /** Deprecated fields present (for migration warnings) */
  deprecatedFields?: string[]
}

export type DiagramFeature =
  | 'blocks'
  | 'roles'
  | 'assertions'
  | 'handlers'
  | 'variables'
  | 'pre_tasks'
  | 'post_tasks'
  | 'system_blocks'
  | 'collaboration'

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT TYPE
// ═══════════════════════════════════════════════════════════════════════════

export interface AutomationFactoryDiagram {
  header: DiagramHeader
  metadata: DiagramMetadata
  content: DiagramContent
  uiState: DiagramUIState
  integrity: DiagramIntegrity
  compatibility: DiagramCompatibility
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ValidationError {
  code: string
  message: string
  field?: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationResult {
  /** Overall validation passed */
  valid: boolean
  /** Can be imported despite warnings */
  canImport: boolean
  /** Requires migration before import */
  needsMigration: boolean
  /** Source format version */
  sourceVersion?: string
  /** Target format version */
  targetVersion?: string
  /** Critical errors preventing import */
  errors: ValidationError[]
  /** Non-critical warnings */
  warnings: ValidationError[]
  /** Informational messages */
  info: ValidationError[]
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ExportOptions {
  /** Include UI state in export */
  includeUIState?: boolean
  /** Include integrity checks */
  includeIntegrity?: boolean
  /** Pretty print JSON (development) */
  prettyPrint?: boolean
  /** Custom filename (without extension) */
  filename?: string
}

export interface MermaidExportOptions {
  /** Include play subgraphs */
  includePlays?: boolean
  /** Include section subgraphs (pre_tasks, tasks, post_tasks, handlers) */
  includeSections?: boolean
  /** Include block subgraphs */
  includeBlocks?: boolean
  /** Direction: TB (top-bottom), LR (left-right) */
  direction?: 'TB' | 'LR' | 'BT' | 'RL'
  /** Theme: default, dark, forest, neutral */
  theme?: 'default' | 'dark' | 'forest' | 'neutral'
}

export interface SVGExportOptions {
  /** Background color (default: transparent) */
  backgroundColor?: string
  /** Padding around content in pixels */
  padding?: number
  /** Scale factor (1 = original size) */
  scale?: number
  /** Include play tabs in export */
  includePlayTabs?: boolean
  /** IDs of collapsed blocks (to respect visual state) */
  collapsedBlocks?: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ImportOptions {
  /** Restore UI state from file */
  restoreUIState?: boolean
  /** Validate integrity checksums */
  validateIntegrity?: boolean
  /** Allow import despite warnings */
  allowWarnings?: boolean
  /** Merge with current playbook instead of replace */
  mergeMode?: boolean
}

export type ExportFormat = 'abd' | 'mermaid' | 'svg'
