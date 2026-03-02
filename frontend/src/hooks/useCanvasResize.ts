import { useEffect, useRef, useCallback } from 'react'
import { usePlaybookEditorStore } from '../stores/playbookEditorStore'
import { getBlockDimensions } from '../utils/canvasHelpers'
import { CollaborationCallbacks } from '../components/zones/WorkZone'

interface UseCanvasResizeParams {
  collaborationCallbacks?: CollaborationCallbacks
}

export const useCanvasResize = ({ collaborationCallbacks }: UseCanvasResizeParams) => {
  const resizingBlock = usePlaybookEditorStore(s => s.resizingBlock)
  const setResizingBlock = usePlaybookEditorStore(s => s.setResizingBlock)
  const setModules = usePlaybookEditorStore(s => s.setModulesForActivePlay)
  const modules = usePlaybookEditorStore(s => s.plays[s.activePlayIndex]?.modules || [])
  const collapsedBlocks = usePlaybookEditorStore(s => s.collapsedBlocks)
  const collapsedBlockSections = usePlaybookEditorStore(s => s.collapsedBlockSections)

  const lastResizedModuleRef = useRef<{ id: string; width: number; height: number; x: number; y: number } | null>(null)

  const handleResizeStart = useCallback((blockId: string, direction: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const block = modules.find(m => m.id === blockId)
    if (!block || !block.isBlock) return

    const blockDims = getBlockDimensions(block, modules, collapsedBlocks, collapsedBlockSections)

    setResizingBlock({
      id: blockId,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: block.width || blockDims.width,
      startHeight: block.height || blockDims.height,
      startBlockX: block.x,
      startBlockY: block.y,
      direction,
    })
  }, [modules, collapsedBlocks, collapsedBlockSections, setResizingBlock])

  // Mouse move/up during resize
  useEffect(() => {
    if (!resizingBlock) return

    const handleResizeMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizingBlock.startX
      const deltaY = e.clientY - resizingBlock.startY

      let newWidth = resizingBlock.startWidth
      let newHeight = resizingBlock.startHeight
      let newX = resizingBlock.startBlockX
      let newY = resizingBlock.startBlockY

      const minWidth = 300
      const minHeight = 250

      if (resizingBlock.direction.includes('e')) {
        newWidth = Math.max(minWidth, resizingBlock.startWidth + deltaX)
      }
      if (resizingBlock.direction.includes('w')) {
        const potentialWidth = Math.max(minWidth, resizingBlock.startWidth - deltaX)
        if (potentialWidth >= minWidth) {
          newWidth = potentialWidth
          newX = resizingBlock.startBlockX + (resizingBlock.startWidth - newWidth)
        }
      }
      if (resizingBlock.direction.includes('s')) {
        newHeight = Math.max(minHeight, resizingBlock.startHeight + deltaY)
      }
      if (resizingBlock.direction.includes('n')) {
        const potentialHeight = Math.max(minHeight, resizingBlock.startHeight - deltaY)
        if (potentialHeight >= minHeight) {
          newHeight = potentialHeight
          newY = resizingBlock.startBlockY + (resizingBlock.startHeight - newHeight)
        }
      }

      setModules(prev => prev.map(m =>
        m.id === resizingBlock.id
          ? { ...m, width: newWidth, height: newHeight, x: newX, y: newY }
          : m
      ))

      lastResizedModuleRef.current = {
        id: resizingBlock.id,
        width: newWidth,
        height: newHeight,
        x: newX,
        y: newY,
      }
    }

    const handleResizeEnd = () => {
      setResizingBlock(null)
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [resizingBlock, setModules, setResizingBlock])

  // Send resize sync when resizing ends
  useEffect(() => {
    if (resizingBlock === null && lastResizedModuleRef.current) {
      const { id, width, height, x, y } = lastResizedModuleRef.current
      collaborationCallbacks?.sendModuleResize?.({ moduleId: id, width, height, x, y })
      lastResizedModuleRef.current = null
    }
  }, [resizingBlock, collaborationCallbacks])

  return { handleResizeStart }
}
