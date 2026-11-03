/**
 * Regression test for #95: `npm run lint` must exit 0.
 * ESLint 9 requires a flat config (eslint.config.js); without it the lint
 * step of scripts/ci.sh and ci-branch.yml fails.
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const frontendRoot = path.resolve(__dirname, '../..')

describe('frontend lint (#95)', () => {
  it('has an ESLint flat config', () => {
    const candidates = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs', 'eslint.config.ts']
    expect(candidates.some((f) => existsSync(path.join(frontendRoot, f)))).toBe(true)
  })

  it('npm run lint exits with code 0', () => {
    let status = 0
    let output = ''
    try {
      execSync('npm run lint', { cwd: frontendRoot, stdio: 'pipe', encoding: 'utf8' })
    } catch (e) {
      const err = e as { status?: number; stdout?: string; stderr?: string }
      status = err.status ?? 1
      output = `${err.stdout ?? ''}${err.stderr ?? ''}`
    }
    expect(status, output).toBe(0)
  }, 300_000)
})
