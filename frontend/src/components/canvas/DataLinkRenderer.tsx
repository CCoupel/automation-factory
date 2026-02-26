/**
 * DataLinkRenderer
 *
 * SVG component that renders dashed teal data links between ports.
 * Visual distinction from execution links (solid colored lines).
 */

import React, { useCallback } from 'react'
import { DataLink, ModuleBlock, Port } from '../../types/playbook'
import { portComputationService } from '../../services/portComputationService'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'

interface DataLinkRendererProps {
  dataLinks: DataLink[]
  modules: ModuleBlock[]
  getModuleWidth: (mod: ModuleBlock) => number
  getModuleHeight: (mod: ModuleBlock) => number
}

const DATA_LINK_COLOR = '#00897B'
const DATA_LINK_DASH = '6,4'
const DATA_LINK_WIDTH = 1.5
const DATA_LINK_HOVER_WIDTH = 3

const DataLinkRenderer: React.FC<DataLinkRendererProps> = ({
  dataLinks,
  modules,
  getModuleWidth,
  getModuleHeight,
}) => {
  const removeDataLink = usePlaybookEditorStore(s => s.removeDataLink)

  // Build a map of all ports across all modules for fast lookup
  const portMap = new Map<string, { port: Port; module: ModuleBlock }>()
  for (const mod of modules) {
    if (!mod.ports) continue
    for (const port of mod.ports) {
      portMap.set(port.id, { port, module: mod })
    }
  }

  const getPortPosition = useCallback(
    (portId: string): { x: number; y: number } | null => {
      const entry = portMap.get(portId)
      if (!entry) return null

      const { port, module: mod } = entry
      const moduleWidth = getModuleWidth(mod)
      const moduleHeight = getModuleHeight(mod)

      // Get all ports of same direction to compute Y position
      const sameDirPorts = (mod.ports || []).filter(p => p.direction === port.direction)
      const positions = portComputationService.getPortPositions(sameDirPorts, moduleHeight)
      const idx = sameDirPorts.findIndex(p => p.id === port.id)
      const posY = positions[idx]?.y ?? 20

      const x = port.direction === 'output' ? mod.x + moduleWidth : mod.x
      return { x, y: mod.y + posY }
    },
    [portMap, getModuleWidth, getModuleHeight],
  )

  return (
    <>
      {dataLinks.map(link => {
        const from = getPortPosition(link.fromPortId)
        const to = getPortPosition(link.toPortId)
        if (!from || !to) return null

        const fromEntry = portMap.get(link.fromPortId)
        const toEntry = portMap.get(link.toPortId)
        const tooltipText = `${link.varName}: ${fromEntry?.module.taskName || fromEntry?.module.name || '?'} → ${toEntry?.module.taskName || toEntry?.module.name || '?'}`

        return (
          <line
            key={link.id}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={DATA_LINK_COLOR}
            strokeDasharray={DATA_LINK_DASH}
            strokeWidth={DATA_LINK_WIDTH}
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => {
              const target = e.currentTarget
              target.setAttribute('stroke-width', String(DATA_LINK_HOVER_WIDTH))
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget
              target.setAttribute('stroke-width', String(DATA_LINK_WIDTH))
            }}
            onClick={() => removeDataLink(link.id)}
          >
            <title>{tooltipText}</title>
          </line>
        )
      })}
    </>
  )
}

export default DataLinkRenderer
