/**
 * Presence Indicator Component
 *
 * Displays avatars of users currently connected to a playbook.
 * Used in AppHeader to show real-time collaboration.
 */

import React from 'react'
import {
  Box,
  Avatar,
  AvatarGroup,
  Tooltip,
  Typography,
  Chip
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'

interface ConnectedUser {
  user_id: string
  username: string
  connected_at: string
}

interface PresenceIndicatorProps {
  users: ConnectedUser[]
  currentUserId?: string
  maxVisible?: number
}

/**
 * Get a consistent color for a user based on their ID
 */
const getUserColor = (userId: string): string => {
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7',
    '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39',
    '#ffc107', '#ff9800', '#ff5722', '#795548'
  ]

  // Simple hash based on userId
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

/**
 * Get user initials for avatar
 */
const getUserInitials = (username: string): string => {
  if (!username) return '?'
  const parts = username.split(/[\s._-]+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return username.substring(0, 2).toUpperCase()
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  users,
  currentUserId,
  maxVisible = 4
}) => {
  // Filter out current user from the list
  const otherUsers = users.filter(u => u.user_id !== currentUserId)

  if (otherUsers.length === 0) {
    return null
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mx: 1 }}>
      <Tooltip
        title={
          <Box sx={{ p: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
              Collaborateurs connectés :
            </Typography>
            {otherUsers.map(user => (
              <Typography key={user.user_id} variant="caption" sx={{ display: 'block' }}>
                • {user.username}
              </Typography>
            ))}
          </Box>
        }
        arrow
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AvatarGroup
            max={maxVisible}
            sx={{
              '& .MuiAvatar-root': {
                width: 28,
                height: 28,
                fontSize: '0.75rem',
                fontWeight: 'bold',
                border: '2px solid white',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'scale(1.1)',
                  zIndex: 10
                }
              }
            }}
          >
            {otherUsers.map(user => (
              <Avatar
                key={user.user_id}
                sx={{
                  bgcolor: getUserColor(user.user_id),
                  animation: 'pulse 2s infinite'
                }}
                title={user.username}
              >
                {getUserInitials(user.username)}
              </Avatar>
            ))}
          </AvatarGroup>

          {otherUsers.length > 0 && (
            <Chip
              icon={<PeopleIcon sx={{ fontSize: 14 }} />}
              label={otherUsers.length}
              size="small"
              sx={{
                ml: 0.5,
                height: 22,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                '& .MuiChip-icon': {
                  color: 'white'
                },
                '& .MuiChip-label': {
                  px: 0.5,
                  fontSize: '0.7rem'
                }
              }}
            />
          )}
        </Box>
      </Tooltip>
    </Box>
  )
}

export default PresenceIndicator
