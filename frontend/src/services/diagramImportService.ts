/**
 * Diagram Import Service
 * Handles import and validation of .abd diagram files
 */

import { Play } from '../types/playbook'
import {
  AutomationFactoryDiagram,
  DiagramContent,
  DiagramFeature,
  ValidationResult,
  ValidationError,
  DIAGRAM_FORMAT,
  ImportOptions,
} from '../types/diagram-export'

// ═══════════════════════════════════════════════════════════════════════════
// VERSION COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compare semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = partsA[i] || 0
    const partB = partsB[i] || 0
    if (partA < partB) return -1
    if (partA > partB) return 1
  }
  return 0
}

/**
 * Get current app version
 */
function getCurrentAppVersion(): string {
  return DIAGRAM_FORMAT.MIN_APP_VERSION
}

/**
 * Get current format version
 */
function getCurrentFormatVersion(): string {
  return DIAGRAM_FORMAT.VERSION
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKSUM VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate SHA-256 checksum of content
 */
async function calculateChecksum(content: DiagramContent): Promise<string> {
  const text = JSON.stringify(content)
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURE SUPPORT
// ═══════════════════════════════════════════════════════════════════════════

const SUPPORTED_FEATURES: DiagramFeature[] = [
  'blocks',
  'roles',
  'assertions',
  'handlers',
  'variables',
  'pre_tasks',
  'post_tasks',
  'system_blocks',
]

function getUnsupportedFeatures(required: DiagramFeature[]): DiagramFeature[] {
  return required.filter(f => !SUPPORTED_FEATURES.includes(f))
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate diagram data structure
 */
export async function validateDiagram(
  data: unknown,
  options: ImportOptions = {}
): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const info: ValidationError[] = []

  // Type guard
  if (!data || typeof data !== 'object') {
    errors.push({
      code: 'INVALID_JSON',
      message: 'Invalid JSON structure',
      severity: 'error',
    })
    return { valid: false, canImport: false, needsMigration: false, errors, warnings, info }
  }

  const diagram = data as Partial<AutomationFactoryDiagram>

  // 1. Check magic number
  if (diagram.header?.magic !== DIAGRAM_FORMAT.MAGIC) {
    errors.push({
      code: 'INVALID_MAGIC',
      message: 'File format not recognized. Expected Automation Factory Diagram format.',
      field: 'header.magic',
      severity: 'error',
    })
    return { valid: false, canImport: false, needsMigration: false, errors, warnings, info }
  }

  // 2. Check format version
  const formatVersion = diagram.header?.formatVersion
  if (!formatVersion) {
    errors.push({
      code: 'MISSING_VERSION',
      message: 'Format version is missing',
      field: 'header.formatVersion',
      severity: 'error',
    })
  } else {
    const currentFormat = getCurrentFormatVersion()
    const versionCompare = compareVersions(formatVersion, currentFormat)

    if (versionCompare > 0) {
      // File is from a newer version
      warnings.push({
        code: 'NEWER_FORMAT',
        message: `File was created with a newer format version (${formatVersion}). Some features may not be imported correctly.`,
        field: 'header.formatVersion',
        severity: 'warning',
      })
    }
  }

  // 3. Check minimum app version
  const minAppVersion = diagram.header?.minAppVersion
  if (minAppVersion) {
    const currentApp = getCurrentAppVersion()
    if (compareVersions(currentApp, minAppVersion) < 0) {
      errors.push({
        code: 'APP_TOO_OLD',
        message: `This file requires Automation Factory ${minAppVersion} or later. Current version: ${currentApp}`,
        field: 'header.minAppVersion',
        severity: 'error',
      })
    }
  }

  // 4. Check maximum app version (if defined)
  const maxAppVersion = diagram.header?.maxAppVersion
  if (maxAppVersion) {
    const currentApp = getCurrentAppVersion()
    if (compareVersions(currentApp, maxAppVersion) > 0) {
      warnings.push({
        code: 'APP_TOO_NEW',
        message: `This file was created for an older version of Automation Factory (max: ${maxAppVersion}). Some features may have changed.`,
        field: 'header.maxAppVersion',
        severity: 'warning',
      })
    }
  }

  // 5. Check required structures
  if (!diagram.content) {
    errors.push({
      code: 'MISSING_CONTENT',
      message: 'Content section is missing',
      field: 'content',
      severity: 'error',
    })
  }

  if (!diagram.content?.plays || !Array.isArray(diagram.content.plays)) {
    errors.push({
      code: 'MISSING_PLAYS',
      message: 'Plays array is missing or invalid',
      field: 'content.plays',
      severity: 'error',
    })
  }

  // 6. Validate integrity if requested
  if (options.validateIntegrity !== false && diagram.integrity?.checksum) {
    try {
      const calculatedChecksum = await calculateChecksum(diagram.content as DiagramContent)
      if (calculatedChecksum !== diagram.integrity.checksum) {
        warnings.push({
          code: 'CHECKSUM_MISMATCH',
          message: 'File integrity check failed. The file may have been modified manually.',
          field: 'integrity.checksum',
          severity: 'warning',
        })
      }
    } catch {
      warnings.push({
        code: 'CHECKSUM_ERROR',
        message: 'Could not verify file integrity',
        field: 'integrity.checksum',
        severity: 'warning',
      })
    }
  }

  // 7. Verify counts
  if (diagram.integrity && diagram.content?.plays) {
    const actualModuleCount = diagram.content.plays.reduce((sum, p) => sum + (p.modules?.length || 0), 0)
    const actualLinkCount = diagram.content.plays.reduce((sum, p) => sum + (p.links?.length || 0), 0)
    const actualPlayCount = diagram.content.plays.length
    const actualVarCount = diagram.content.plays.reduce((sum, p) => sum + (p.variables?.length || 0), 0)

    if (diagram.integrity.moduleCount !== actualModuleCount ||
        diagram.integrity.linkCount !== actualLinkCount ||
        diagram.integrity.playCount !== actualPlayCount ||
        diagram.integrity.variableCount !== actualVarCount) {
      warnings.push({
        code: 'COUNT_MISMATCH',
        message: 'Element counts do not match. The file may have been modified manually.',
        field: 'integrity',
        severity: 'warning',
      })
    }
  }

  // 8. Check required features
  if (diagram.compatibility?.requiredFeatures) {
    const unsupported = getUnsupportedFeatures(diagram.compatibility.requiredFeatures)
    if (unsupported.length > 0) {
      errors.push({
        code: 'UNSUPPORTED_FEATURES',
        message: `Unsupported features required: ${unsupported.join(', ')}`,
        field: 'compatibility.requiredFeatures',
        severity: 'error',
      })
    }
  }

  // 9. Check deprecated fields
  if (diagram.compatibility?.deprecatedFields && diagram.compatibility.deprecatedFields.length > 0) {
    info.push({
      code: 'DEPRECATED_FIELDS',
      message: `Deprecated fields will be ignored: ${diagram.compatibility.deprecatedFields.join(', ')}`,
      field: 'compatibility.deprecatedFields',
      severity: 'info',
    })
  }

  // 10. Validate plays structure
  if (diagram.content?.plays) {
    for (let i = 0; i < diagram.content.plays.length; i++) {
      const play = diagram.content.plays[i]
      if (!play.id) {
        warnings.push({
          code: 'MISSING_PLAY_ID',
          message: `Play ${i + 1} is missing an ID. A new ID will be generated.`,
          field: `content.plays[${i}].id`,
          severity: 'warning',
        })
      }
      if (!play.modules || !Array.isArray(play.modules)) {
        errors.push({
          code: 'INVALID_PLAY_MODULES',
          message: `Play ${i + 1} has invalid modules array`,
          field: `content.plays[${i}].modules`,
          severity: 'error',
        })
      }
      if (!play.links || !Array.isArray(play.links)) {
        warnings.push({
          code: 'MISSING_PLAY_LINKS',
          message: `Play ${i + 1} is missing links array. An empty array will be used.`,
          field: `content.plays[${i}].links`,
          severity: 'warning',
        })
      }
    }
  }

  // Determine migration need
  const needsMigration = formatVersion ? compareVersions(formatVersion, getCurrentFormatVersion()) < 0 : false

  return {
    valid: errors.length === 0,
    canImport: errors.length === 0 || (options.allowWarnings === true && errors.every(e => e.severity === 'warning')),
    needsMigration,
    sourceVersion: formatVersion,
    targetVersion: getCurrentFormatVersion(),
    errors,
    warnings,
    info,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION
// ═══════════════════════════════════════════════════════════════════════════

type MigrationFunction = (data: AutomationFactoryDiagram) => AutomationFactoryDiagram

const migrations: Record<string, MigrationFunction> = {
  // Example migration from 1.0.0 to 1.1.0
  // '1.0.0_to_1.1.0': (data) => {
  //   // Add new fields with defaults
  //   data.header.formatVersion = '1.1.0'
  //   return data
  // },
}

/**
 * Get next version in migration chain
 */
function getNextVersion(version: string): string | null {
  const versions = ['1.0.0'] // Add future versions here
  const index = versions.indexOf(version)
  if (index === -1 || index === versions.length - 1) {
    return null
  }
  return versions[index + 1]
}

/**
 * Migrate diagram to latest format version
 */
export function migrateDiagram(data: AutomationFactoryDiagram): AutomationFactoryDiagram {
  let current = { ...data }
  const targetVersion = getCurrentFormatVersion()

  while (current.header.formatVersion !== targetVersion) {
    const nextVersion = getNextVersion(current.header.formatVersion)
    if (!nextVersion) break

    const migrationKey = `${current.header.formatVersion}_to_${nextVersion}`
    const migration = migrations[migrationKey]

    if (migration) {
      current = migration(current)
    } else {
      // No migration needed, just update version
      current.header.formatVersion = nextVersion
    }
  }

  return current
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT
// ═══════════════════════════════════════════════════════════════════════════

export interface ImportResult {
  success: boolean
  plays: Play[]
  uiState: {
    collapsedBlocks: string[]
    collapsedBlockSections: string[]
    collapsedPlaySections: string[]
    activePlayIndex: number
  }
  metadata: {
    name: string
    id?: string
  }
  validation: ValidationResult
}

/**
 * Parse and import diagram from file content
 */
export async function importDiagram(
  fileContent: string,
  options: ImportOptions = {}
): Promise<ImportResult> {
  // Parse JSON
  let data: unknown
  try {
    data = JSON.parse(fileContent)
  } catch (e) {
    return {
      success: false,
      plays: [],
      uiState: {
        collapsedBlocks: [],
        collapsedBlockSections: [],
        collapsedPlaySections: [],
        activePlayIndex: 0,
      },
      metadata: { name: 'Import Error' },
      validation: {
        valid: false,
        canImport: false,
        needsMigration: false,
        errors: [{
          code: 'PARSE_ERROR',
          message: `Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}`,
          severity: 'error',
        }],
        warnings: [],
        info: [],
      },
    }
  }

  // Validate
  const validation = await validateDiagram(data, options)

  if (!validation.canImport) {
    return {
      success: false,
      plays: [],
      uiState: {
        collapsedBlocks: [],
        collapsedBlockSections: [],
        collapsedPlaySections: [],
        activePlayIndex: 0,
      },
      metadata: { name: 'Import Error' },
      validation,
    }
  }

  let diagram = data as AutomationFactoryDiagram

  // Migrate if needed
  if (validation.needsMigration) {
    diagram = migrateDiagram(diagram)
  }

  // Extract data
  const plays = diagram.content.plays.map(play => ({
    ...play,
    id: play.id || crypto.randomUUID(),
    modules: play.modules || [],
    links: play.links || [],
    variables: play.variables || [],
  }))

  const uiState = options.restoreUIState !== false && diagram.uiState
    ? {
        collapsedBlocks: diagram.uiState.collapsedBlocks || [],
        collapsedBlockSections: diagram.uiState.collapsedBlockSections || [],
        collapsedPlaySections: diagram.uiState.collapsedPlaySections || [],
        activePlayIndex: diagram.uiState.activePlayIndex || 0,
      }
    : {
        collapsedBlocks: [],
        collapsedBlockSections: [],
        collapsedPlaySections: [],
        activePlayIndex: 0,
      }

  return {
    success: true,
    plays,
    uiState,
    metadata: {
      name: diagram.metadata.name,
      id: diagram.metadata.id,
    },
    validation,
  }
}

/**
 * Read file and import diagram
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
