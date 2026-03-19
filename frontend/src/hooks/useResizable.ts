import { useState, useEffect, useCallback } from 'react'

type Direction = 'horizontal' | 'vertical'

interface ResizableConfig {
  direction: Direction
  initialSize: number
  minSize: number
  maxSize: number
}

interface ResizableResult {
  size: number
  isResizing: boolean
  onMouseDown: () => void
}

/**
 * Hook to manage resizable panel behavior.
 * Handles mouse events for drag-to-resize in horizontal (left panel) or vertical (bottom panel) direction.
 */
export function useResizable(config: ResizableConfig): ResizableResult {
  const { direction, initialSize, minSize, maxSize } = config
  const [size, setSize] = useState(initialSize)
  const [isResizing, setIsResizing] = useState(false)

  const onMouseDown = useCallback(() => {
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove: EventListener = (evt) => {
      const e = evt as MouseEvent
      let newSize: number
      if (direction === 'horizontal') {
        newSize = e.clientX
      } else {
        newSize = window.innerHeight - e.clientY
      }
      if (newSize >= minSize && newSize <= maxSize) {
        setSize(newSize)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, direction, minSize, maxSize])

  return { size, isResizing, onMouseDown }
}
