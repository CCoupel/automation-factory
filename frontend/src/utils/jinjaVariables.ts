const JINJA_VAR_REGEX = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)/g
const BUILTINS = new Set(['loop', 'true', 'false', 'none', 'item', 'ansible_managed'])

export function extractJinjaVariables(template: string): string[] {
  const vars = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = JINJA_VAR_REGEX.exec(template)) !== null) {
    const name = match[1]
    if (!BUILTINS.has(name)) {
      vars.add(name)
    }
  }
  return Array.from(vars).sort()
}

const YAML_KEY_REGEX = /^([a-zA-Z_][a-zA-Z0-9_]*):/gm

export function extractYamlVariableNames(yamlContent: string): string[] {
  const keys = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = YAML_KEY_REGEX.exec(yamlContent)) !== null) {
    keys.add(match[1])
  }
  return Array.from(keys).sort()
}
