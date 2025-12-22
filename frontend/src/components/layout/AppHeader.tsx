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
  Tooltip,
  Snackbar
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useGalaxyCache } from '../../contexts/GalaxyCacheContext'
import { VersionSelector } from '../VersionSelector'
import LogoutIcon from '@mui/icons-material/Logout'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DescriptionIcon from '@mui/icons-material/Description'
import LockIcon from '@mui/icons-material/Lock'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import SettingsIcon from '@mui/icons-material/Settings'
import InfoIcon from '@mui/icons-material/Info'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import { getHttpClient } from '../../utils/httpClient'
import axios from 'axios'
import packageJson from '../../../package.json'

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
  const { forceRefreshCache, isLoading: cacheLoading, currentVersion } = useGalaxyCache()

  // Version state (simplified like LoginPage)
  const [backendVersion, setBackendVersion] = useState<string>('...')
  const [backendVersionInfo, setBackendVersionInfo] = useState<any>(null)
  // Remove -rc.X suffix for display (production shows clean version)
  const frontendVersion = packageJson.version.replace(/-rc\.\d+$/, '')

  // Playbook fields state (local for other fields)
  const [inventory, setInventory] = useState('hosts')

  // Refresh notification state
  const [refreshSnackbar, setRefreshSnackbar] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')

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

  // About dialog state
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false)


  /**
   * Fetch backend version on component mount (simplified like LoginPage)
   */
  useEffect(() => {
    const fetchBackendVersion = async () => {
      try {
        const apiUrl = (window as any).__API_URL__ || '/api'
        const response = await axios.get(`${apiUrl}/version`)
        
        // Store simple version string
        setBackendVersion(response.data.version || 'N/A')
        
        // Store complete version info for About dialog
        setBackendVersionInfo(response.data)
      } catch (err) {
        console.error('Failed to fetch backend version:', err)
        setBackendVersion('N/A')
        setBackendVersionInfo(null)
      }
    }

    fetchBackendVersion()
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
   * Handle configuration page navigation (Admin only)
   */
  const handleConfigurationPage = () => {
    handleMenuClose()
    navigate('/admin/configuration')
  }

  /**
   * Handle About dialog
   */
  const handleOpenAbout = () => {
    handleMenuClose()
    setAboutDialogOpen(true)
  }

  const handleCloseAboutDialog = () => {
    setAboutDialogOpen(false)
  }

  /**
   * Handle dark mode toggle
   */
  const handleDarkModeToggle = () => {
    toggleDarkMode()
  }

  /**
   * Handle logo click - Ctrl+Click triggers force refresh of all caches
   */
  const handleLogoClick = async (event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      console.log('🔄 Force refresh triggered via Ctrl+Click on logo')

      setRefreshMessage('Force refreshing namespaces/collections from Ansible docs...')
      setRefreshSnackbar(true)

      try {
        await forceRefreshCache()
        setRefreshMessage(`✅ Cache refreshed successfully for Ansible ${currentVersion}`)
      } catch (error) {
        setRefreshMessage('❌ Failed to refresh cache')
        console.error('Force refresh failed:', error)
      }
    }
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
        <Tooltip title="Ctrl+Click to force refresh namespaces/collections" placement="bottom">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs, 4px)',
              mr: 'var(--spacing-sm, 8px)',
              cursor: 'pointer',
              '&:hover': { opacity: 0.9 }
            }}
            onClick={handleLogoClick}
          >
            <PlayArrowIcon sx={{ fontSize: 'var(--icon-lg, 24px)' }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: 'var(--font-base, 14px)' }}>
              Ansible Builder
            </Typography>
            {cacheLoading && (
              <CircularProgress size={16} sx={{ color: 'white', ml: 1 }} />
            )}
          </Box>
        </Tooltip>

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
          <VersionSelector 
            variant="header"
            onChange={() => {
              // Optionnel: action après changement de version
              console.log('Ansible version changed in header');
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
                  bgcolor: authLost
                    ? 'rgba(244, 67, 54, 0.9)'  // Red when auth lost
                    : 'rgba(76, 175, 80, 0.9)', // Green when authenticated
                  fontSize: 'var(--font-sm, 13px)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: authLost ? '2px solid #f44336' : '2px solid #4caf50',
                  boxShadow: authLost
                    ? '0 0 8px rgba(244, 67, 54, 0.6)'
                    : '0 0 8px rgba(76, 175, 80, 0.4)',
                  '&:hover': {
                    bgcolor: authLost
                      ? 'rgba(244, 67, 54, 1)'
                      : 'rgba(76, 175, 80, 1)'
                  }
                }}
                title={authLost ? '🔒 Authentication lost - Please re-login' : '✓ Authenticated'}
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

              {/* Configuration (Admin only) */}
              {user.role === 'admin' && (
                <MenuItem onClick={handleConfigurationPage}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Configuration</ListItemText>
                </MenuItem>
              )}

              {user.role === 'admin' && <Divider />}

              {/* About */}
              <MenuItem onClick={handleOpenAbout}>
                <ListItemIcon>
                  <InfoIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>About</ListItemText>
              </MenuItem>

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

      {/* About Dialog - Enriched with dynamic version info */}
      <Dialog
        open={aboutDialogOpen}
        onClose={handleCloseAboutDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" />
          About Ansible Builder
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="h6" gutterBottom>
              Ansible Builder
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Constructeur graphique de playbooks Ansible en mode SaaS. 
              Cette application permet de construire des playbooks Ansible de manière visuelle 
              via un système de drag & drop.
            </Typography>
            
            {/* Versions des composants */}
            <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Versions des composants :
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                • Frontend: {frontendVersion} (ansible-builder-frontend)
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                • Backend: {backendVersion} ({backendVersionInfo?.name || 'Ansible Builder API'})
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                • Environment: {backendVersionInfo?.environment || 'N/A'}
              </Typography>
              {backendVersionInfo?.is_rc && (
                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'orange', fontWeight: 'bold' }}>
                  ⚠️ Release Candidate - Version de test
                </Typography>
              )}
            </Box>

            {/* Nouvelles fonctionnalités de la version actuelle */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 2 }}>
                Nouvelles fonctionnalités version {backendVersionInfo?.base_version || frontendVersion.split('_')[0]} :
              </Typography>

              {/* Backend Features */}
              {backendVersionInfo?.features?.features?.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }}></Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                      Backend API - {backendVersionInfo.features.title}
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ pl: 3, m: 0, mb: 2 }}>
                    {backendVersionInfo.features.features.map((feature: string, index: number) => (
                      <Typography key={index} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        🔧 {feature}
                      </Typography>
                    ))}
                  </Box>
                </>
              )}

              {/* Frontend Features */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }}></Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Frontend Interface
                </Typography>
              </Box>
              <Box component="ul" sx={{ pl: 3, m: 0, mb: 2 }}>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  🎨 Interface utilisateur avec Material-UI v6
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  📱 Design responsive et navigation intuitive
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  ⚡ Popup About dynamique avec récupération temps réel
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  🔗 Intégration rationalisée avec pattern LoginPage
                </Typography>
              </Box>

              {/* Backend Improvements */}
              {backendVersionInfo?.features?.improvements?.length > 0 && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main' }}></Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                      Améliorations Backend
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ pl: 3, m: 0, mb: 2 }}>
                    {backendVersionInfo.features.improvements.map((improvement: string, index: number) => (
                      <Typography key={index} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        ⚙️ {improvement}
                      </Typography>
                    ))}
                  </Box>
                </>
              )}

              {/* Full Stack Features */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'info.main' }}></Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Fonctionnalités Full Stack
                </Typography>
              </Box>
              <Box component="ul" sx={{ pl: 3, m: 0, mb: 1 }}>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  🔄 Synchronisation automatique des versions Frontend ↔ Backend
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  📊 API enrichie pour affichage dynamique des fonctionnalités
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  🐳 Déploiement Docker coordonné avec versions alignées
                </Typography>
              </Box>

              {/* Release date */}
              {backendVersionInfo?.features?.release_date && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  📅 Date de release: {backendVersionInfo.features.release_date}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                Utilisateur connecté : <strong>{user?.username}</strong> ({user?.email})
              </Typography>
              {user?.role === 'admin' && (
                <Chip 
                  label="Admin" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAboutDialog} variant="contained">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Force Refresh Snackbar */}
      <Snackbar
        open={refreshSnackbar}
        autoHideDuration={4000}
        onClose={() => setRefreshSnackbar(false)}
        message={refreshMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

    </AppBar>
  )
}

export default AppHeader
