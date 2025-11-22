import React from 'react'
import { AppBar, Toolbar, Typography, Button, Box, Avatar } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LogoutIcon from '@mui/icons-material/Logout'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PersonIcon from '@mui/icons-material/Person'

/**
 * Application Header Component
 *
 * Displays the application header with:
 * - Application logo and title
 * - User information (email/username)
 * - Logout button
 *
 * Features:
 * - Clean Material-UI design
 * - User avatar with first letter of username
 * - Logout functionality with navigation to login page
 */
const AppHeader: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  /**
   * Handle logout button click
   */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  /**
   * Get initials from username for avatar
   */
  const getUserInitials = (): string => {
    if (!user) return '?'
    return user.username.charAt(0).toUpperCase()
  }

  return (
    <AppBar
      position="static"
      elevation={2}
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        zIndex: 1200
      }}
    >
      <Toolbar sx={{ minHeight: 48, py: 0.5 }}>
        {/* Left side - Logo and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <PlayArrowIcon sx={{ fontSize: 28, mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
            Ansible Builder
          </Typography>
        </Box>

        {/* Right side - User info and Logout */}
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* User info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'rgba(255, 255, 255, 0.3)',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                {getUserInitials()}
              </Avatar>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.2 }}>
                  {user.username}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.9, lineHeight: 1 }}>
                  {user.email}
                </Typography>
              </Box>
            </Box>

            {/* Logout button */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                },
                textTransform: 'none',
                fontSize: '0.85rem'
              }}
            >
              Déconnexion
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default AppHeader
