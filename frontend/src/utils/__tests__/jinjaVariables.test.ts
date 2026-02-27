import { describe, it, expect } from 'vitest'
import { extractJinjaVariables, extractYamlVariableNames } from '../jinjaVariables'

describe('extractJinjaVariables', () => {
  it('extracts simple variables', () => {
    expect(extractJinjaVariables('Hello {{ name }}')).toEqual(['name'])
  })

  it('extracts multiple variables', () => {
    const result = extractJinjaVariables('{{ host }}:{{ port }}')
    expect(result).toEqual(['host', 'port'])
  })

  it('deduplicates variables', () => {
    const result = extractJinjaVariables('{{ name }} and {{ name }}')
    expect(result).toEqual(['name'])
  })

  it('extracts variables with filters', () => {
    const result = extractJinjaVariables('{{ name | upper }}')
    expect(result).toEqual(['name'])
  })

  it('excludes builtins', () => {
    const result = extractJinjaVariables('{{ loop.index }} {{ item }} {{ true }}')
    expect(result).toEqual([])
  })

  it('handles no variables', () => {
    expect(extractJinjaVariables('plain text')).toEqual([])
  })

  it('handles variables with underscores and numbers', () => {
    const result = extractJinjaVariables('{{ my_var2 }}')
    expect(result).toEqual(['my_var2'])
  })

  it('returns sorted results', () => {
    const result = extractJinjaVariables('{{ zebra }} {{ alpha }}')
    expect(result).toEqual(['alpha', 'zebra'])
  })

  it('handles variables without spaces', () => {
    const result = extractJinjaVariables('{{name}}')
    expect(result).toEqual(['name'])
  })
})

describe('extractYamlVariableNames', () => {
  it('extracts top-level keys', () => {
    const yaml = 'name: John\nage: 30\nhost: localhost'
    expect(extractYamlVariableNames(yaml)).toEqual(['age', 'host', 'name'])
  })

  it('ignores nested content', () => {
    const yaml = 'parent:\n  child: value'
    expect(extractYamlVariableNames(yaml)).toEqual(['parent'])
  })

  it('handles empty input', () => {
    expect(extractYamlVariableNames('')).toEqual([])
  })

  it('ignores comments', () => {
    const yaml = '# comment\nname: value'
    // Comments start with # which won't match the regex
    expect(extractYamlVariableNames(yaml)).toEqual(['name'])
  })

  it('handles keys with underscores', () => {
    const yaml = 'my_var: value\nanother_one: test'
    expect(extractYamlVariableNames(yaml)).toEqual(['another_one', 'my_var'])
  })
})
