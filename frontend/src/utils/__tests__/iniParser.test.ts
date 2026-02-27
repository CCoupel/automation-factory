import { describe, it, expect } from 'vitest'
import { parseIni, serializeIni } from '../iniParser'

describe('parseIni', () => {
  it('parses sections with key-value pairs', () => {
    const ini = `[defaults]
remote_user = ansible
timeout = 30`
    const result = parseIni(ini)
    expect(result.sectionOrder).toEqual(['defaults'])
    expect(result.sections.defaults).toEqual({
      remote_user: 'ansible',
      timeout: '30',
    })
  })

  it('parses multiple sections', () => {
    const ini = `[defaults]
remote_user = ansible

[privilege_escalation]
become = true`
    const result = parseIni(ini)
    expect(result.sectionOrder).toEqual(['defaults', 'privilege_escalation'])
    expect(result.sections.privilege_escalation).toEqual({ become: 'true' })
  })

  it('ignores comments', () => {
    const ini = `# This is a comment
; Another comment
[defaults]
key = value`
    const result = parseIni(ini)
    expect(result.sections.defaults).toEqual({ key: 'value' })
  })

  it('ignores empty lines', () => {
    const ini = `[defaults]

key = value

`
    const result = parseIni(ini)
    expect(result.sections.defaults).toEqual({ key: 'value' })
  })

  it('handles empty input', () => {
    const result = parseIni('')
    expect(result.sectionOrder).toEqual([])
    expect(result.sections).toEqual({})
  })

  it('handles values with equals signs', () => {
    const ini = `[defaults]
callback_whitelist = profile_tasks, timer`
    const result = parseIni(ini)
    expect(result.sections.defaults.callback_whitelist).toBe('profile_tasks, timer')
  })
})

describe('serializeIni', () => {
  it('serializes sections with key-value pairs', () => {
    const data = {
      sections: { defaults: { remote_user: 'ansible' } },
      sectionOrder: ['defaults'],
    }
    const result = serializeIni(data)
    expect(result).toBe('[defaults]\nremote_user = ansible\n')
  })

  it('serializes multiple sections', () => {
    const data = {
      sections: {
        defaults: { timeout: '30' },
        connection: { pipelining: 'true' },
      },
      sectionOrder: ['defaults', 'connection'],
    }
    const result = serializeIni(data)
    expect(result).toContain('[defaults]')
    expect(result).toContain('[connection]')
    expect(result).toContain('timeout = 30')
    expect(result).toContain('pipelining = true')
  })

  it('roundtrips correctly', () => {
    const original = `[defaults]
remote_user = ansible
timeout = 30

[privilege_escalation]
become = true
`
    const parsed = parseIni(original)
    const serialized = serializeIni(parsed)
    const reparsed = parseIni(serialized)
    expect(reparsed.sections).toEqual(parsed.sections)
    expect(reparsed.sectionOrder).toEqual(parsed.sectionOrder)
  })

  it('skips sections not in sectionOrder', () => {
    const data = {
      sections: { defaults: { key: 'val' }, extra: { foo: 'bar' } },
      sectionOrder: ['defaults'],
    }
    const result = serializeIni(data)
    expect(result).not.toContain('[extra]')
  })
})
