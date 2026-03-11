import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LogoutIcon from '@mui/icons-material/Logout'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import LanguageIcon from '@mui/icons-material/Language'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

interface ProjectHeaderProps {
  projectName: string
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ projectName }) => {
  const navigate = useNavigate()
  const { t } = useTranslation('project')
  const { t: tc } = useTranslation('common')
  const { i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { themeMode, darkMode, cycleThemeMode } = useTheme()
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)

  const handleLogout = async () => {
    setUserMenuAnchor(null)
    await logout()
    navigate('/login')
  }

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense">
        <Tooltip title={t('backToHome')}>
          <IconButton edge="start" onClick={() => navigate('/')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>

        <Typography variant="body1" color="text.secondary" sx={{ mr: 0.5 }}>
          AF
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mr: 0.5 }}>
          &gt;
        </Typography>
        <Typography variant="body1" fontWeight="bold" noWrap sx={{ flex: 1 }}>
          {projectName}
        </Typography>

        {user && (
          <Box>
            <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)}>
              <Avatar sx={{ width: 28, height: 28, fontSize: '0.8rem', bgcolor: 'primary.main' }}>
                {user.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
            >
              <MenuItem disabled>
                <ListItemText primary={user.username} />
              </MenuItem>
              <Divider />

              <MenuItem onClick={() => { cycleThemeMode() }}>
                <ListItemIcon>
                  {themeMode === 'light' && <Brightness7Icon fontSize="small" />}
                  {themeMode === 'dark' && <Brightness4Icon fontSize="small" />}
                  {themeMode === 'system' && <SettingsBrightnessIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                  primary={
                    themeMode === 'light' ? tc('lightMode') :
                    themeMode === 'dark' ? tc('darkMode') :
                    tc('systemAuto')
                  }
                />
                <Chip
                  label={themeMode === 'light' ? 'Light' : themeMode === 'dark' ? 'Dark' : 'Auto'}
                  size="small" variant="outlined"
                  sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                />
              </MenuItem>

              <MenuItem onClick={() => {
                const next = i18n.language?.startsWith('fr') ? 'en' : 'fr'
                i18n.changeLanguage(next)
              }}>
                <ListItemIcon><LanguageIcon fontSize="small" /></ListItemIcon>
                <ListItemText primary={tc('language')} />
                <Chip
                  label={i18n.language?.startsWith('fr') ? 'FR' : 'EN'}
                  size="small" variant="outlined"
                  sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                />
              </MenuItem>

              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                <ListItemText>{tc('logout')}</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  )
}

export default ProjectHeader
