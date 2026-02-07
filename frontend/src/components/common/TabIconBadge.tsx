import React from 'react'
import { Box } from '@mui/material'

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
 * Note: Uses a simple div-based badge instead of Material-UI Badge
 * to avoid DOM nesting issues when used inside Tab components
 * (Tab renders as button, Badge can contain interactive elements)
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
    <Box 
      sx={{ 
        position: 'relative', 
        display: 'inline-flex', 
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {icon}
      <Box
        sx={{
          position: 'absolute',
          top: -8,
          right: -8,
          minWidth: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: isActive ? color : `${color}b3`,
          color: '#fff',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 4px'
        }}
      >
        {count}
      </Box>
    </Box>
  )
}

export default TabIconBadge
