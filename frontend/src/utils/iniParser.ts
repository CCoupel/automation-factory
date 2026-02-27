export interface IniData {
  sections: Record<string, Record<string, string>>
  sectionOrder: string[]
}

export function parseIni(text: string): IniData {
  const sections: Record<string, Record<string, string>> = {}
  const sectionOrder: string[] = []
  let currentSection: string | null = null

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue
    }

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      if (!sections[currentSection]) {
        sections[currentSection] = {}
        sectionOrder.push(currentSection)
      }
      continue
    }

    if (currentSection) {
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim()
        const value = trimmed.substring(eqIndex + 1).trim()
        sections[currentSection][key] = value
      }
    }
  }

  return { sections, sectionOrder }
}

export function serializeIni(data: IniData): string {
  const lines: string[] = []

  for (const section of data.sectionOrder) {
    const entries = data.sections[section]
    if (!entries) continue

    lines.push(`[${section}]`)
    for (const [key, value] of Object.entries(entries)) {
      lines.push(`${key} = ${value}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
