import React, { useState, useEffect } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Avatar,
  TextField,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Switch,
  Alert,
  Chip,
  CircularProgress,
  Tooltip
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useAnsibleVersion } from '../../contexts/AnsibleVersionContext'
import LogoutIcon from '@mui/icons-material/Logout'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DescriptionIcon from '@mui/icons-material/Description'
import LockIcon from '@mui/icons-material/Lock'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import SaveIcon from '@mui/icons-material/Save'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import { getHttpClient } from '../../utils/httpClient'

interface AppHeaderProps {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  playbookName: string
  onOpenPlaybookManager: () => void
}

/**
 * Application Header Component
 *
 * Displays the application header with:
 * - Application logo and title
 * - Playbook information and save status
 * - User information (email/username)
 * - Logout button
 *
 * Features:
 * - Clean Material-UI design
 * - User avatar with first letter of username
 * - Logout functionality with navigation to login page
 * - Auto-save status indicator
 */
const AppHeader: React.FC<AppHeaderProps> = ({ saveStatus, playbookName: playbookNameProp, onOpenPlaybookManager }) => {
  const navigate = useNavigate()
  const { user, logout, authLost } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const { ansibleVersion, setAnsibleVersion } = useAnsibleVersion()

  // Version state
  const [versions, setVersions] = useState<{
    frontend: { version: string; name: string }
    backend: { version: string; name: string }
    environment: string
  } | null>(null)

  // Playbook fields state (local for other fields)
  const [playbookVersion, setPlaybookVersion] = useState('1.0.0')
  const [inventory, setInventory] = useState('hosts')

  // User menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const menuOpen = Boolean(anchorEl)

  // Change password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  /**
   * Fetch versions on component mount
   */
  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const http = getHttpClient()
        const response = await http.get('/version')
        setVersions(response.data)
      } catch (error) {
        console.error('Failed to fetch versions:', error)
      }
    }

    fetchVersions()
  }, [])

  /**
   * Handle user menu open
   */
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  /**
   * Handle user menu close
   */
  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  /**
   * Handle logout
   */
  const handleLogout = () => {
    handleMenuClose()
    logout()
    navigate('/login')
  }

  /**
   * Handle change password dialog
   */
  const handleOpenPasswordDialog = () => {
    handleMenuClose()
    setPasswordDialogOpen(true)
  }

  const handleClosePasswordDialog = () => {
    setPasswordDialogOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
    setPasswordSuccess(false)
  }

  const handleChangePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    try {
      const token = localStorage.getItem('authToken')
      const http = getHttpClient()
      await http.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setPasswordSuccess(true)

      // Close dialog after 1.5 seconds
      setTimeout(() => {
        handleClosePasswordDialog()
      }, 1500)
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password')
      console.error('Error changing password:', err)
    }
  }

  /**
   * Handle accounts management navigation
   */
  const handleAccountsManagement = () => {
    handleMenuClose()
    navigate('/admin/accounts')
  }

  /**
   * Handle dark mode toggle
   */
  const handleDarkModeToggle = () => {
    toggleDarkMode()
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
      <Toolbar sx={{ minHeight: 'calc(48px * var(--spacing-scale, 1))', py: 'var(--spacing-xs, 4px)' }}>
        {/* Left side - Logo and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs, 4px)', mr: 'var(--spacing-sm, 8px)' }}>
          <PlayArrowIcon sx={{ fontSize: 'var(--icon-lg, 24px)' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: 'var(--font-base, 14px)' }}>
            Ansible Builder
          </Typography>
        </Box>

        {/* Center - Playbook Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm, 8px)', flexGrow: 1 }}>
          <Tooltip title="Open Playbook Manager" placement="bottom">
            <IconButton
              onClick={onOpenPlaybookManager}
              size="small"
              sx={{
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <FolderOpenIcon sx={{ fontSize: 'var(--icon-lg, 24px)' }} />
            </IconButton>
          </Tooltip>
          <DescriptionIcon sx={{ fontSize: 'var(--icon-lg, 24px)', opacity: 0.9 }} />
          <TextField
            label="Name"
            variant="outlined"
            size="small"
            value={playbookNameProp}
            disabled
            sx={{
              minWidth: 'calc(150px * var(--spacing-scale, 1))',
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 'var(--font-xs, 12px)',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'rgba(255, 255, 255, 0.9)',
              },
              '& .MuiOutlinedInput-input': {
                fontSize: 'var(--font-sm, 13px)',
                py: 'var(--spacing-xs, 4px)',
              },
            }}
          />
          <TextField
            label="Version"
            variant="outlined"
            size="small"
            value={playbookVersion}
            onChange={(e) => setPlaybookVersion(e.target.value)}
            sx={{
              width: 'calc(100px * var(--spacing-scale, 1))',
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 'var(--font-xs, 12px)',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'rgba(255, 255, 255, 0.9)',
              },
              '& .MuiOutlinedInput-input': {
                fontSize: 'var(--font-sm, 13px)',
                py: 'var(--spacing-xs, 4px)',
              },
            }}
          />
          <TextField
            label="Inventory"
            variant="outlined"
            size="small"
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            sx={{
              minWidth: 'calc(120px * var(--spacing-scale, 1))',
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 'var(--font-xs, 12px)',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'rgba(255, 255, 255, 0.9)',
              },
              '& .MuiOutlinedInput-input': {
                fontSize: 'var(--font-sm, 13px)',
                py: 'var(--spacing-xs, 4px)',
              },
            }}
          />
          <TextField
            label="Ansible Version"
            variant="outlined"
            size="small"
            value={ansibleVersion}
            onChange={(e) => setAnsibleVersion(e.target.value)}
            sx={{
              width: 'calc(100px * var(--spacing-scale, 1))',
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 'var(--font-xs, 12px)',
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: 'rgba(255, 255, 255, 0.9)',
              },
              '& .MuiOutlinedInput-input': {
                fontSize: 'var(--font-sm, 13px)',
                py: 'var(--spacing-xs, 4px)',
              },
            }}
          />
        </Box>

        {/* Save Status Indicator */}
        {saveStatus !== 'idle' && (
          <Chip
            icon={
              saveStatus === 'saving' ? (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              ) : saveStatus === 'saved' ? (
                <CheckCircleIcon sx={{ fontSize: 16 }} />
              ) : (
                <ErrorIcon sx={{ fontSize: 16 }} />
              )
            }
            label={
              saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                ? 'Saved'
                : 'Error'
            }
            size="small"
            sx={{
              bgcolor:
                saveStatus === 'saving'
                  ? 'rgba(33, 150, 243, 0.9)'
                  : saveStatus === 'saved'
                  ? 'rgba(76, 175, 80, 0.9)'
                  : 'rgba(244, 67, 54, 0.9)',
              color: 'white',
              fontWeight: 'bold',
              '& .MuiChip-icon': {
                color: 'white'
              }
            }}
          />
        )}

        {/* Right side - User info and Menu */}
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs, 4px)' }}>
            {/* Version info */}
            {versions?.frontend?.version && versions?.backend?.version && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mr: 2 }}>
                <Typography variant="caption" sx={{ fontSize: 'var(--font-xs, 12px)', opacity: 0.9, lineHeight: 1 }}>
                  Frontend: {versions.frontend.version}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 'var(--font-xs, 12px)', opacity: 0.9, lineHeight: 1 }}>
                  Backend: {versions.backend.version}
                </Typography>
              </Box>
            )}

            {/* User info */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Typography variant="body2" sx={{ fontSize: 'var(--font-sm, 13px)', lineHeight: 1.2 }}>
                {user.username}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 'var(--font-xs, 12px)', opacity: 0.9, lineHeight: 1 }}>
                {user.email}
              </Typography>
            </Box>

            {/* User Avatar - Clickable */}
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              sx={{
                ml: 'var(--spacing-xs, 4px)',
                p: 0
              }}
              aria-controls={menuOpen ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? 'true' : undefined}
            >
              <Avatar
                sx={{
                  width: 'var(--icon-xl, 32px)',
                  height: 'var(--icon-xl, 32px)',
                  bgcolor: authLost ? 'rgba(244, 67, 54, 0.9)' : 'rgba(255, 255, 255, 0.3)',
                  fontSize: 'var(--font-sm, 13px)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: authLost ? '2px solid #f44336' : 'none',
                  boxShadow: authLost ? '0 0 8px rgba(244, 67, 54, 0.6)' : 'none',
                  '&:hover': {
                    bgcolor: authLost ? 'rgba(244, 67, 54, 1)' : 'rgba(255, 255, 255, 0.4)'
                  }
                }}
                title={authLost ? '🔒 Authentication lost - Please re-login' : undefined}
              >
                {getUserInitials()}
              </Avatar>
            </IconButton>

            {/* User Menu */}
            <Menu
              id="account-menu"
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                elevation: 3,
                sx: {
                  mt: 1.5,
                  minWidth: 220,
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                }
              }}
            >
              {/* Change Password */}
              <MenuItem onClick={handleOpenPasswordDialog}>
                <ListItemIcon>
                  <LockIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Change Password</ListItemText>
              </MenuItem>

              {/* Accounts Management (Admin only) */}
              {user.role === 'admin' && (
                <MenuItem onClick={handleAccountsManagement}>
                  <ListItemIcon>
                    <SupervisorAccountIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Accounts Management</ListItemText>
                </MenuItem>
              )}

              <Divider />

              {/* Dark Mode Toggle */}
              <MenuItem onClick={handleDarkModeToggle}>
                <ListItemIcon>
                  {darkMode ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{darkMode ? 'Light Mode' : 'Dark Mode'}</ListItemText>
                <Switch
                  edge="end"
                  checked={darkMode}
                  size="small"
                />
              </MenuItem>

              <Divider />

              {/* Logout */}
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Déconnexion</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={handleClosePasswordDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {passwordError && (
              <Alert severity="error" onClose={() => setPasswordError(null)}>
                {passwordError}
              </Alert>
            )}
            {passwordSuccess && (
              <Alert severity="success">
                Password changed successfully!
              </Alert>
            )}
            <TextField
              label="Current Password"
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              size="small"
              disabled={passwordSuccess}
            />
            <TextField
              label="New Password"
              type="password"
              fullWidth
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              size="small"
              disabled={passwordSuccess}
            />
            <TextField
              label="Confirm New Password"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              size="small"
              error={newPassword !== confirmPassword && confirmPassword !== ''}
              helperText={
                newPassword !== confirmPassword && confirmPassword !== ''
                  ? 'Passwords do not match'
                  : ''
              }
              disabled={passwordSuccess}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog}>Cancel</Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={
              !currentPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword ||
              passwordSuccess
            }
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  )
}

export default AppHeader
