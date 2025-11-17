import React from 'react'
import { Box, Tooltip } from '@mui/material'
import DnsIcon from '@mui/icons-material/Dns'
import PersonIcon from '@mui/icons-material/Person'
import AssessmentIcon from '@mui/icons-material/Assessment'
import SecurityIcon from '@mui/icons-material/Security'
import CableIcon from '@mui/icons-material/Cable'
import ExtensionIcon from '@mui/icons-material/Extension'

/**
 * Props for PlayAttributeIcons component
 */
interface PlayAttributeIconsProps {
  /**
   * PLAY attributes to display
   */
  attributes: {
    hosts?: string
    remoteUser?: string
    gatherFacts?: boolean
    become?: boolean
    connection?: string
    roles?: string[]
  }

  /**
   * Size variant for the icons
   * - 'small': 14px (used on PLAY tabs)
   * - 'medium': 16px (used on PLAY headers)
   */
  size?: 'small' | 'medium'

  /**
   * Additional sx props for the container Box
   */
  sx?: any
}

/**
 * Reusable component to display PLAY attribute icons
 *
 * Displays 6 icons representing Ansible PLAY attributes:
 * - DnsIcon (blue) - hosts pattern
 * - PersonIcon (purple) - remote_user
 * - AssessmentIcon (teal) - gather_facts
 * - SecurityIcon (red) - become (sudo)
 * - CableIcon (orange) - connection type
 * - ExtensionIcon (green) - roles
 *
 * Icons are colored when the attribute is set, gray when not set.
 */
const PlayAttributeIcons: React.FC<PlayAttributeIconsProps> = ({
  attributes,
  size = 'small',
  sx = {}
}) => {
  const fontSize = size === 'small' ? 14 : 16

  return (
    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ...sx }}>
      {/* Hosts pattern */}
      <Tooltip title={attributes.hosts ? `Hosts: ${attributes.hosts}` : 'Hosts: not set'}>
        <DnsIcon sx={{ fontSize, color: attributes.hosts ? '#1976d2' : '#ccc' }} />
      </Tooltip>

      {/* Remote user */}
      <Tooltip title={attributes.remoteUser ? `Remote user: ${attributes.remoteUser}` : 'Remote user: not set'}>
        <PersonIcon sx={{ fontSize, color: attributes.remoteUser ? '#9c27b0' : '#ccc' }} />
      </Tooltip>

      {/* Gather facts */}
      <Tooltip title={attributes.gatherFacts !== false ? 'Gather facts: yes' : 'Gather facts: no'}>
        <AssessmentIcon sx={{ fontSize, color: attributes.gatherFacts !== false ? '#009688' : '#ccc' }} />
      </Tooltip>

      {/* Become (sudo) */}
      <Tooltip title={attributes.become ? 'Become: yes (sudo)' : 'Become: no'}>
        <SecurityIcon sx={{ fontSize, color: attributes.become ? '#d32f2f' : '#ccc' }} />
      </Tooltip>

      {/* Connection type */}
      <Tooltip title={attributes.connection ? `Connection: ${attributes.connection}` : 'Connection: ssh (default)'}>
        <CableIcon sx={{ fontSize, color: attributes.connection ? '#f57c00' : '#ccc' }} />
      </Tooltip>

      {/* Roles */}
      <Tooltip title={attributes.roles && attributes.roles.length > 0 ? `Roles: ${attributes.roles.join(', ')}` : 'Roles: none'}>
        <ExtensionIcon sx={{ fontSize, color: attributes.roles && attributes.roles.length > 0 ? '#4caf50' : '#ccc' }} />
      </Tooltip>
    </Box>
  )
}

export default PlayAttributeIcons
