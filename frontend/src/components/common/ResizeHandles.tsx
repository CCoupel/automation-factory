import React from 'react'
import { Box } from '@mui/material'

/**
 * Props for ResizeHandles component
 */
interface ResizeHandlesProps {
  /**
   * ID of the block being resized
   */
  blockId: string

  /**
   * Color theme for the resize handles
   */
  color: string

  /**
   * Current resizing state
   */
  resizingBlock: {
    id: string
    direction: string
  } | null

  /**
   * Callback when resize starts
   */
  onResizeStart: (blockId: string, direction: string, e: React.MouseEvent) => void
}

/**
 * Configuration for each resize handle
 */
interface HandleConfig {
  direction: string
  position: {
    top?: number | string
    bottom?: number | string
    left?: number | string
    right?: number | string
    transform?: string
  }
  size: {
    width: number
    height: number
  }
  cursor: string
  borderRadius: number | string
  hoverTransform: string
}

/**
 * Reusable component for 8-direction resize handles
 *
 * Provides resize handles for blocks with:
 * - 4 corner handles (nw, ne, sw, se) - 16x16px, round
 * - 4 edge handles (n, s, w, e) - 40x12px or 12x40px, rectangular
 *
 * Used by:
 * - PlaySectionContent.tsx - Blocks in PLAY sections
 * - BlockSectionContent.tsx - Blocks in block sections
 * - WorkZone.tsx - Blocks on canvas
 *
 * Features:
 * - Consistent styling across all blocks
 * - Visual feedback on hover and active resize
 * - 8-direction resizing (nw, ne, sw, se, n, s, w, e)
 */
const ResizeHandles: React.FC<ResizeHandlesProps> = ({
  blockId,
  color,
  resizingBlock,
  onResizeStart
}) => {
  /**
   * Configuration for all 8 resize handles
   */
  const handles: HandleConfig[] = [
    // Corners (16x16px, round)
    {
      direction: 'nw',
      position: { top: -6, left: -6 },
      size: { width: 16, height: 16 },
      cursor: 'nwse-resize',
      borderRadius: '50%',
      hoverTransform: 'scale(1.3)'
    },
    {
      direction: 'ne',
      position: { top: -6, right: -6 },
      size: { width: 16, height: 16 },
      cursor: 'nesw-resize',
      borderRadius: '50%',
      hoverTransform: 'scale(1.3)'
    },
    {
      direction: 'sw',
      position: { bottom: -6, left: -6 },
      size: { width: 16, height: 16 },
      cursor: 'nesw-resize',
      borderRadius: '50%',
      hoverTransform: 'scale(1.3)'
    },
    {
      direction: 'se',
      position: { bottom: -6, right: -6 },
      size: { width: 16, height: 16 },
      cursor: 'nwse-resize',
      borderRadius: '50%',
      hoverTransform: 'scale(1.3)'
    },

    // Edges (40x12px or 12x40px, rectangular)
    {
      direction: 'n',
      position: { top: -6, left: '50%', transform: 'translateX(-50%)' },
      size: { width: 40, height: 12 },
      cursor: 'ns-resize',
      borderRadius: 2,
      hoverTransform: 'translateX(-50%) scaleY(1.4)'
    },
    {
      direction: 's',
      position: { bottom: -6, left: '50%', transform: 'translateX(-50%)' },
      size: { width: 40, height: 12 },
      cursor: 'ns-resize',
      borderRadius: 2,
      hoverTransform: 'translateX(-50%) scaleY(1.4)'
    },
    {
      direction: 'w',
      position: { left: -6, top: '50%', transform: 'translateY(-50%)' },
      size: { width: 12, height: 40 },
      cursor: 'ew-resize',
      borderRadius: 2,
      hoverTransform: 'translateY(-50%) scaleX(1.4)'
    },
    {
      direction: 'e',
      position: { right: -6, top: '50%', transform: 'translateY(-50%)' },
      size: { width: 12, height: 40 },
      cursor: 'ew-resize',
      borderRadius: 2,
      hoverTransform: 'translateY(-50%) scaleX(1.4)'
    }
  ]

  /**
   * Check if a handle is currently being used for resizing
   */
  const isActiveHandle = (direction: string): boolean => {
    return resizingBlock?.id === blockId && resizingBlock?.direction === direction
  }

  return (
    <>
      {handles.map((handle) => (
        <Box
          key={handle.direction}
          onMouseDown={(e) => onResizeStart(blockId, handle.direction, e)}
          sx={{
            position: 'absolute',
            ...handle.position,
            width: handle.size.width,
            height: handle.size.height,
            cursor: handle.cursor,
            bgcolor: isActiveHandle(handle.direction) ? color : `${color}CC`,
            border: `2px solid white`,
            borderRadius: handle.borderRadius,
            opacity: 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            '&:hover': {
              bgcolor: color,
              transform: handle.hoverTransform
            },
            transition: 'all 0.2s',
            zIndex: 20,
          }}
        />
      ))}
    </>
  )
}

export default ResizeHandles
