/**
 * usePortWiring
 *
 * Hook for drag-from-port manual wiring interaction.
 * Drag from an output port circle, temporary SVG line follows cursor,
 * drop on an input port to create a DataLink.
 */

import { useState, useEffect, useCallback } from 'react'
import { Port, DataLink } from '../types/playbook'
import { usePlaybookEditorStore } from '../stores/playbookEditorStore'

interface WiringState {
  wiringFrom: Port | null
  mousePos: { x: number; y: number } | null
  startWiring: (port: Port, initialPos: { x: number; y: number }) => void
  completeWiring: (targetPort: Port) => void
  cancelWiring: () => void
}

export function usePortWiring(): WiringState {
  const [wiringFrom, setWiringFrom] = useState<Port | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  const addDataLink = usePlaybookEditorStore(s => s.addDataLink)

  const startWiring = useCallback((port: Port, initialPos: { x: number; y: number }) => {
    if (port.direction !== 'output') return
    setWiringFrom(port)
    setMousePos(initialPos)
  }, [])

  const completeWiring = useCallback((targetPort: Port) => {
    if (!wiringFrom) return
    if (targetPort.direction !== 'input') return
    if (targetPort.moduleId === wiringFrom.moduleId) return

    const link: DataLink = {
      id: `dl:${wiringFrom.id}:${targetPort.id}`,
      fromPortId: wiringFrom.id,
      toPortId: targetPort.id,
      varName: targetPort.varName,
      autoInferred: false,
    }

    addDataLink(link)
    setWiringFrom(null)
    setMousePos(null)
  }, [wiringFrom, addDataLink])

  const cancelWiring = useCallback(() => {
    setWiringFrom(null)
    setMousePos(null)
  }, [])

  // Track mouse movement and Escape key during wiring
  useEffect(() => {
    if (!wiringFrom) return

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelWiring()
      }
    }

    const handleMouseUp = () => {
      // If released outside a port, cancel
      cancelWiring()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [wiringFrom, cancelWiring])

  return { wiringFrom, mousePos, startWiring, completeWiring, cancelWiring }
}
