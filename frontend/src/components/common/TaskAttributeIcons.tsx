import React from 'react'
import { Box, Tooltip } from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import SecurityIcon from '@mui/icons-material/Security'
import LoopIcon from '@mui/icons-material/Loop'
import SendIcon from '@mui/icons-material/Send'

/**
 * Props for TaskAttributeIcons component
 */
interface TaskAttributeIconsProps {
  /**
   * Task attributes to display
   */
  attributes: {
    when?: string
    ignoreErrors?: boolean
    become?: boolean
    loop?: string
    delegateTo?: string
  }

  /**
   * Size variant for the icons
   * - 'small': 12px (used on tasks)
   * - 'medium': 14px (used on section headers)
   */
  size?: 'small' | 'medium'

  /**
   * Additional sx props for the container Box
   */
  sx?: any
}

/**
 * Reusable component to display task attribute icons
 *
 * Displays 5 icons representing Ansible task attributes:
 * - HelpOutlineIcon (blue) - when condition
 * - ErrorOutlineIcon (orange) - ignoreErrors
 * - SecurityIcon (red) - become (sudo)
 * - LoopIcon (green) - loop
 * - SendIcon (cyan) - delegateTo
 *
 * Icons are colored when the attribute is set, gray when not set.
 */
const TaskAttributeIcons: React.FC<TaskAttributeIconsProps> = ({
  attributes,
  size = 'small',
  sx = {}
}) => {
  const fontSize = size === 'small' ? 12 : 14

  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ...sx }}>
      {/* When condition */}
      <Tooltip title={attributes.when ? `Condition: ${attributes.when}` : 'No condition'}>
        <HelpOutlineIcon sx={{ fontSize, color: attributes.when ? '#1976d2' : '#ccc' }} />
      </Tooltip>

      {/* Ignore errors */}
      <Tooltip title={attributes.ignoreErrors ? 'Ignore errors: yes' : 'Ignore errors: no'}>
        <ErrorOutlineIcon sx={{ fontSize, color: attributes.ignoreErrors ? '#f57c00' : '#ccc' }} />
      </Tooltip>

      {/* Become (sudo) */}
      <Tooltip title={attributes.become ? 'Become: yes (sudo)' : 'Become: no'}>
        <SecurityIcon sx={{ fontSize, color: attributes.become ? '#d32f2f' : '#ccc' }} />
      </Tooltip>

      {/* Loop */}
      <Tooltip title={attributes.loop ? `Loop: ${attributes.loop}` : 'No loop'}>
        <LoopIcon sx={{ fontSize, color: attributes.loop ? '#388e3c' : '#ccc' }} />
      </Tooltip>

      {/* Delegate to */}
      <Tooltip title={attributes.delegateTo ? `Delegate to: ${attributes.delegateTo}` : 'No delegation'}>
        <SendIcon sx={{ fontSize, color: attributes.delegateTo ? '#00bcd4' : '#ccc' }} />
      </Tooltip>
    </Box>
  )
}

export default TaskAttributeIcons
