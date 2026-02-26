/**
 * PortRenderer
 *
 * SVG component that renders port circles on module edges.
 * Output ports (green) on the right edge, input ports (blue) on the left edge.
 */

import React from 'react'
import { ModuleBlock, Port } from '../../types/playbook'
import { portComputationService } from '../../services/portComputationService'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'

interface PortRendererProps {
  modules: ModuleBlock[]
  getModuleWidth: (mod: ModuleBlock) => number
  getModuleHeight: (mod: ModuleBlock) => number
  onPortMouseDown?: (port: Port, event: React.MouseEvent) => void
  onPortMouseUp?: (port: Port, event: React.MouseEvent) => void
}

const PORT_RADIUS = 5
const PORT_HOVER_RADIUS = 7
const OUTPUT_COLOR = '#4CAF50'
const INPUT_COLOR = '#2196F3'

const PortRenderer: React.FC<PortRendererProps> = ({
  modules,
  getModuleWidth,
  getModuleHeight,
  onPortMouseDown,
  onPortMouseUp,
}) => {
  const hoveredPortId = usePlaybookEditorStore(s => s.hoveredPortId)
  const setHoveredPortId = usePlaybookEditorStore(s => s.setHoveredPortId)

  return (
    <>
      {modules.map(mod => {
        if (!mod.ports || mod.ports.length === 0) return null

        const moduleWidth = getModuleWidth(mod)
        const moduleHeight = getModuleHeight(mod)

        const outputPorts = mod.ports.filter(p => p.direction === 'output')
        const inputPorts = mod.ports.filter(p => p.direction === 'input')

        const outputPositions = portComputationService.getPortPositions(outputPorts, moduleHeight)
        const inputPositions = portComputationService.getPortPositions(inputPorts, moduleHeight)

        return (
          <g key={`ports-${mod.id}`}>
            {/* Output ports (right edge) */}
            {outputPorts.map((port, i) => {
              const pos = outputPositions[i]
              if (!pos) return null
              const isHovered = hoveredPortId === port.id
              return (
                <circle
                  key={port.id}
                  cx={mod.x + moduleWidth}
                  cy={mod.y + pos.y}
                  r={isHovered ? PORT_HOVER_RADIUS : PORT_RADIUS}
                  fill={OUTPUT_COLOR}
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: 'crosshair', transition: 'r 0.15s' }}
                  onMouseEnter={() => setHoveredPortId(port.id)}
                  onMouseLeave={() => setHoveredPortId(null)}
                  onMouseDown={(e) => onPortMouseDown?.(port, e)}
                >
                  <title>{`${port.varName}: ${port.type}${port.scope ? ` (${port.scope})` : ''}`}</title>
                </circle>
              )
            })}

            {/* Input ports (left edge) */}
            {inputPorts.map((port, i) => {
              const pos = inputPositions[i]
              if (!pos) return null
              const isHovered = hoveredPortId === port.id
              return (
                <circle
                  key={port.id}
                  cx={mod.x}
                  cy={mod.y + pos.y}
                  r={isHovered ? PORT_HOVER_RADIUS : PORT_RADIUS}
                  fill={INPUT_COLOR}
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: 'crosshair', transition: 'r 0.15s' }}
                  onMouseEnter={() => setHoveredPortId(port.id)}
                  onMouseLeave={() => setHoveredPortId(null)}
                  onMouseUp={(e) => onPortMouseUp?.(port, e)}
                >
                  <title>{`${port.varName}: ${port.type}`}</title>
                </circle>
              )
            })}
          </g>
        )
      })}
    </>
  )
}

export default PortRenderer
