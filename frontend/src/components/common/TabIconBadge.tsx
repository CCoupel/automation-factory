import React from 'react'
import CountBadge from './CountBadge'

/**
 * Props for TabIconBadge component
 */
interface TabIconBadgeProps {
  /**
   * Icon element to display inside the badge
   */
  icon: React.ReactNode

  /**
   * Count to display in the badge (0 will show)
   */
  count: number

  /**
   * Primary color for the badge and icon
   */
  color: string

  /**
   * Whether the tab is currently active
   */
  isActive: boolean
}

/**
 * Reusable component for tab badges with icons
 *
 * Used for:
 * - PLAY section tabs (Roles, Pre-Tasks, Tasks, Post-Tasks, Handlers)
 *
 * Features:
 * - Consistent badge styling (18x18px, rounded, white text)
 * - Dynamic colors based on active state
 * - Active: solid color background
 * - Inactive: transparent color (70% opacity - 'b3' suffix)
 */
const TabIconBadge: React.FC<TabIconBadgeProps> = ({
  icon,
  count,
  color,
  isActive
}) => {
  return (
    <CountBadge
      count={count}
      color={color}
      isActive={isActive}
    >
      {icon}
    </CountBadge>
  )
}

export default TabIconBadge
