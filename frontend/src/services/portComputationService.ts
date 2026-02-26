/**
 * Port Computation Service
 *
 * Computes ports on modules, extracts Jinja2 variable references,
 * and auto-infers data links between output and input ports.
 */

import { ModuleBlock, Port, DataLink } from '../types/playbook'
import { ReturnSpecEntry } from './returnSpecService'

/** Regex to extract Jinja2 variable names from any string value */
const JINJA_VAR_RE = /\{\{\s*([a-zA-Z_]\w*)/g

export const portComputationService = {
  /**
   * Check if a module is a role task (include_role or import_role).
   */
  isRoleTask(module: ModuleBlock): boolean {
    return (
      module.collection === 'ansible.builtin' &&
      (module.name === 'include_role' || module.name === 'import_role')
    )
  },

  /**
   * Create output ports from a role's return_specs.
   */
  computeOutputPorts(
    module: ModuleBlock,
    returnSpecs: Record<string, ReturnSpecEntry>,
  ): Port[] {
    return Object.entries(returnSpecs).map(([varName, spec]) => ({
      id: `${module.id}:output:${varName}`,
      moduleId: module.id,
      direction: 'output' as const,
      varName,
      type: spec.type || 'any',
      description: spec.description || undefined,
      scope: spec.scope || 'host',
      alwaysSet: spec.always_set,
    }))
  },

  /**
   * Scan moduleParameters for {{ var }} refs, create input ports for vars
   * that match available upstream outputs.
   */
  computeInputPorts(
    module: ModuleBlock,
    availableVars: Map<string, Port>,
  ): Port[] {
    const referencedVars = this.extractJinjaVariables(module.moduleParameters || {})
    const ports: Port[] = []

    for (const varName of referencedVars) {
      const sourcePort = availableVars.get(varName)
      if (sourcePort) {
        ports.push({
          id: `${module.id}:input:${varName}`,
          moduleId: module.id,
          direction: 'input',
          varName,
          type: sourcePort.type,
          description: sourcePort.description,
        })
      }
    }

    return ports
  },

  /**
   * Regex-extract variable names from any value (recursively handles objects/arrays).
   */
  extractJinjaVariables(params: Record<string, any>): Set<string> {
    const found = new Set<string>()

    const scan = (value: any): void => {
      if (typeof value === 'string') {
        let match: RegExpExecArray | null
        const re = new RegExp(JINJA_VAR_RE.source, 'g')
        while ((match = re.exec(value)) !== null) {
          found.add(match[1])
        }
      } else if (Array.isArray(value)) {
        value.forEach(scan)
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach(scan)
      }
    }

    scan(params)
    return found
  },

  /**
   * Match output ports → input ports by variable name to auto-infer data links.
   */
  inferDataLinks(modules: ModuleBlock[]): DataLink[] {
    const links: DataLink[] = []
    // Collect all output ports across all modules
    const outputsByVar = new Map<string, Port>()

    for (const mod of modules) {
      if (!mod.ports) continue
      for (const port of mod.ports) {
        if (port.direction === 'output') {
          outputsByVar.set(port.varName, port)
        }
      }
    }

    // Match input ports against output ports
    for (const mod of modules) {
      if (!mod.ports) continue
      for (const port of mod.ports) {
        if (port.direction === 'input') {
          const sourcePort = outputsByVar.get(port.varName)
          if (sourcePort && sourcePort.moduleId !== mod.id) {
            links.push({
              id: `dl:${sourcePort.id}:${port.id}`,
              fromPortId: sourcePort.id,
              toPortId: port.id,
              varName: port.varName,
              autoInferred: true,
            })
          }
        }
      }
    }

    return links
  },

  /**
   * Calculate port Y positions (evenly spaced on module edge).
   */
  getPortPositions(
    ports: Port[],
    moduleHeight: number,
  ): { portId: string; y: number }[] {
    if (ports.length === 0) return []
    const startY = 20
    const step = 16
    return ports.map((port, i) => ({
      portId: port.id,
      y: startY + i * step,
    }))
  },
}
