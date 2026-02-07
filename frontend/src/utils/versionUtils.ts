/**
 * Version comparison utilities for Ansible compatibility
 */

/**
 * Parse a version string into numeric components
 * @param version Version string like "2.15.0", ">=2.17.0", etc.
 * @returns Parsed version object
 */
export interface ParsedVersion {
  major: number
  minor: number
  patch: number
  operator?: string
  original: string
}

/**
 * Parse version string into components
 */
export function parseVersion(versionStr: string): ParsedVersion {
  if (!versionStr) {
    return { major: 0, minor: 0, patch: 0, original: versionStr }
  }

  // Remove operator prefix (>=, >, <, <=, ==)
  const operatorMatch = versionStr.match(/^(>=|<=|==|>|<|~)?(.+)/)
  const operator = operatorMatch?.[1]
  const cleanVersion = operatorMatch?.[2] || versionStr

  // Split version into parts
  const parts = cleanVersion.split('.').map(p => parseInt(p.replace(/[^\d]/g, ''), 10) || 0)
  
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0, 
    patch: parts[2] || 0,
    operator,
    original: versionStr
  }
}

/**
 * Compare two version numbers
 * @param version1 First version to compare
 * @param version2 Second version to compare  
 * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(version1: string, version2: string): number {
  const v1 = parseVersion(version1)
  const v2 = parseVersion(version2)

  if (v1.major !== v2.major) {
    return v1.major - v2.major
  }
  if (v1.minor !== v2.minor) {
    return v1.minor - v2.minor
  }
  return v1.patch - v2.patch
}

/**
 * Check if current Ansible version satisfies the requirement
 * @param currentVersion Current Ansible version (e.g. "2.15")
 * @param requiredVersion Required version with operator (e.g. ">=2.17.0")
 * @returns true if compatible, false if incompatible
 */
export function isVersionCompatible(currentVersion: string, requiredVersion: string): boolean {
  if (!requiredVersion || !currentVersion) {
    return true // If no requirement specified, assume compatible
  }

  const required = parseVersion(requiredVersion)
  const current = parseVersion(currentVersion)
  
  const comparison = compareVersions(currentVersion, `${required.major}.${required.minor}.${required.patch}`)

  switch (required.operator) {
    case '>=':
      return comparison >= 0
    case '>':
      return comparison > 0
    case '<=':
      return comparison <= 0
    case '<':
      return comparison < 0
    case '==':
    case '=':
      return comparison === 0
    case '~':
      // Compatible release (~=2.15.0 means >=2.15.0, <2.16.0)
      return comparison >= 0 && current.major === required.major && current.minor === required.minor
    default:
      // No operator, assume >=
      return comparison >= 0
  }
}

/**
 * Get incompatibility reason for display
 * @param currentVersion Current Ansible version
 * @param requiredVersion Required version string  
 * @returns User-friendly incompatibility message
 */
export function getIncompatibilityReason(currentVersion: string, requiredVersion: string): string | null {
  if (isVersionCompatible(currentVersion, requiredVersion)) {
    return null
  }

  const required = parseVersion(requiredVersion)
  const operator = required.operator || '>='
  
  return `Requires Ansible ${operator}${required.major}.${required.minor}.${required.patch}, current: ${currentVersion}`
}