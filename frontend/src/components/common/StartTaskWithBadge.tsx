import React from 'react'
import { Paper, Typography } from '@mui/material'
import CountBadge from './CountBadge'

/**
 * Props for StartTaskWithBadge component
 */
interface StartTaskWithBadgeProps {
  /**
   * Unique identifier for the START task
   */
  startId: string

  /**
   * Position of the START task
   */
  position: {
    x: number
    y: number
  }

  /**
   * Color theme for the START task and badge
   */
  color: string

  /**
   * Number of tasks in the chain starting from this START
   */
  badgeCount: number

  /**
   * Whether this START is currently being dragged
   */
  isDragged: boolean

  /**
   * Drag start handler
   */
  onDragStart: (e: React.DragEvent) => void

  /**
   * Drag over handler
   */
  onDragOver: (e: React.DragEvent) => void

  /**
   * Drop handler
   */
  onDrop: (e: React.DragEvent) => void
}

/**
 * Reusable component for rendering START tasks with badge
 *
 * Used for:
 * - PLAY section START tasks (pre_tasks, tasks, post_tasks, handlers)
 * - Block mini START tasks (normal, rescue, always sections)
 *
 * Features:
 * - Rounded badge on the left side showing task chain count
 * - Draggable with visual feedback
 * - Consistent styling across all START types
 */
const StartTaskWithBadge: React.FC<StartTaskWithBadgeProps> = ({
  startId,
  position,
  color,
  badgeCount,
  isDragged,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <CountBadge
      count={badgeCount}
      color={color}
      isActive={true}
      sx={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        '& .MuiBadge-badge': {
          fontSize: '0.65rem',
          borderRadius: '50%',
          left: -10,
          top: '50%',
          transform: 'translateY(-50%)',
        }
      }}
    >
      <Paper
        data-task-id={startId}
        elevation={2}
        draggable={true}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        sx={{
          width: 60,
          height: 40,
          p: 0.5,
          cursor: 'move',
          border: `2px solid ${color}`,
          borderRadius: '0 50% 50% 0',
          bgcolor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: isDragged ? 10 : 1,
          opacity: isDragged ? 0.7 : 1,
          '&:hover': {
            boxShadow: 4,
          },
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 'bold', color: color, fontSize: '0.6rem' }}>
          START
        </Typography>
      </Paper>
    </CountBadge>
  )
}

export default StartTaskWithBadge
