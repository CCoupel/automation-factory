/**
 * i18n parity test — ensures EN and FR locale files have the same keys.
 *
 * Every key present in one language must exist in the other.
 * This catches forgotten translations during development.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const LOCALES_DIR = path.resolve(__dirname, '../../locales')
const LANGUAGES = ['en', 'fr'] as const

// Recursively extract all leaf keys from a nested object (dot-separated)
function extractKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}

// Load all namespace files for a language
function loadLanguage(lang: string): Record<string, string[]> {
  const langDir = path.join(LOCALES_DIR, lang)
  const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'))
  const result: Record<string, string[]> = {}
  for (const file of files) {
    const namespace = file.replace('.json', '')
    const content = JSON.parse(fs.readFileSync(path.join(langDir, file), 'utf-8'))
    result[namespace] = extractKeys(content)
  }
  return result
}

describe('i18n locale parity (EN/FR)', () => {
  const en = loadLanguage('en')
  const fr = loadLanguage('fr')

  it('EN and FR have the same namespace files', () => {
    const enNamespaces = Object.keys(en).sort()
    const frNamespaces = Object.keys(fr).sort()
    expect(enNamespaces).toEqual(frNamespaces)
  })

  // Generate a test per namespace
  const namespaces = [...new Set([...Object.keys(en), ...Object.keys(fr)])]

  for (const ns of namespaces) {
    it(`namespace "${ns}" has matching keys in EN and FR`, () => {
      const enKeys = en[ns] || []
      const frKeys = fr[ns] || []

      const missingInFR = enKeys.filter(k => !frKeys.includes(k))
      const missingInEN = frKeys.filter(k => !enKeys.includes(k))

      if (missingInFR.length > 0) {
        throw new Error(
          `Keys in EN "${ns}" missing from FR:\n  ${missingInFR.join('\n  ')}`
        )
      }

      if (missingInEN.length > 0) {
        throw new Error(
          `Keys in FR "${ns}" missing from EN:\n  ${missingInEN.join('\n  ')}`
        )
      }
    })
  }
})
