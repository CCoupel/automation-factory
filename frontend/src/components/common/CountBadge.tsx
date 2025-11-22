import React from 'react'
import { Badge } from '@mui/material'

/**
 * Props for CountBadge component
 */
interface CountBadgeProps {
  /**
   * Count to display in the badge
   */
  count: number

  /**
   * Primary color for the badge
   */
  color: string

  /**
   * Whether the badge is in active state
   * - Active: full opacity color
   * - Inactive: 70% opacity (appends 'b3' to color)
   */
  isActive?: boolean

  /**
   * Content to wrap with the badge
   */
  children: React.ReactNode

  /**
   * Additional sx props for positioning
   */
  sx?: any
}

/**
 * Base reusable badge component with unified styling
 *
 * Used by:
 * - StartTaskWithBadge: Badges on START tasks showing chain count
 * - TabIconBadge: Badges on PLAY section tabs showing item count
 *
 * Features:
 * - Consistent badge styling (18x18px, rounded, white text, bold)
 * - Automatic opacity handling based on active state
 * - Configurable color with active/inactive variants
 */
const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  color,
  isActive = true,
  children,
  sx = {}
}) => {
  return (
    <Badge
      badgeContent={count}
      sx={{
        ...sx,
        '& .MuiBadge-badge': {
          fontSize: '0.7rem',
          height: 18,
          minWidth: 18,
          fontWeight: 'bold',
          bgcolor: isActive ? color : `${color}b3`,
          color: '#fff'
        }
      }}
    >
      {children}
    </Badge>
  )
}

export default CountBadge
