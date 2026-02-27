import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  AppBar,
  Badge,
  Button,
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
  CircularProgress,
  Divider,
  Snackbar,
  Tooltip,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LogoutIcon from '@mui/icons-material/Logout'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import LanguageIcon from '@mui/icons-material/Language'
import CommitIcon from '@mui/icons-material/SaveAlt'
import PublishIcon from '@mui/icons-material/Publish'
import CallMergeIcon from '@mui/icons-material/CallMerge'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import { gitOperationsService } from '../../services/gitOperationsService'
import { GitSyncResponse } from '../../services/gitSyncService'
import BranchPicker from './BranchPicker'
import CommitDialog from './CommitDialog'
import SyncButton from './SyncButton'
import ConflictResolver from './ConflictResolver'
import CreatePRDialog from './CreatePRDialog'

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

  const currentProject = useProjectStore(s => s.currentProject)
  const fetchArtifacts = useProjectStore(s => s.fetchArtifacts)
  const closeAllTabs = useEditorStore(s => s.closeAllTabs)

  const [commitDialogOpen, setCommitDialogOpen] = useState(false)
  const [prDialogOpen, setPrDialogOpen] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [changeCount, setChangeCount] = useState(0)
  const [syncResult, setSyncResult] = useState<GitSyncResponse | null>(null)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const hasGit = Boolean(currentProject?.git_url)
  const projectId = currentProject?.id || ''
  const currentBranch = currentProject?.git_branch || 'main'

  const refreshChangeCount = useCallback(async () => {
    if (!hasGit || !projectId) return
    try {
      const data = await gitOperationsService.getChanges(projectId)
      setChangeCount(data.changes.length)
    } catch {
      // Silently fail
    }
  }, [hasGit, projectId])

  useEffect(() => {
    refreshChangeCount()
  }, [refreshChangeCount])

  const handlePush = async () => {
    setPushing(true)
    try {
      const result = await gitOperationsService.push(projectId)
      setSnackbar({ open: true, message: t('pushSuccess'), severity: 'success' })
      refreshChangeCount()
    } catch (err: any) {
      if (err.response?.status === 409) {
        setSnackbar({ open: true, message: t('pushRejected'), severity: 'error' })
        // Auto-trigger sync
        try {
          const { gitSyncService } = await import('../../services/gitSyncService')
          const syncData = await gitSyncService.sync(projectId)
          handleSyncResult(syncData)
        } catch {
          // Sync also failed, just show the push error
        }
      } else {
        setSnackbar({ open: true, message: err.message || t('pushError'), severity: 'error' })
      }
    } finally {
      setPushing(false)
    }
  }

  const handleSyncResult = (result: GitSyncResponse) => {
    setSyncResult(result)

    if (result.status === 'up_to_date') {
      setSnackbar({ open: true, message: t('syncUpToDate'), severity: 'success' })
    } else if (result.status === 'fast_forward' || result.status === 'auto_merged') {
      setSnackbar({
        open: true,
        message: result.status === 'fast_forward' ? t('syncFastForward') : t('syncAutoMerged'),
        severity: 'success',
      })
      if (projectId) fetchArtifacts(projectId)
      refreshChangeCount()
    } else if (result.status === 'conflicts') {
      setConflictDialogOpen(true)
    }
  }

  const handleConflictResolved = () => {
    setSnackbar({ open: true, message: t('resolveSuccess'), severity: 'success' })
    if (projectId) fetchArtifacts(projectId)
    refreshChangeCount()
  }

  const handleCommitSuccess = () => {
    refreshChangeCount()
  }

  const handleBranchSwitch = (branch: string, artifactsImported: number) => {
    closeAllTabs()
    if (projectId) {
      fetchArtifacts(projectId)
    }
    setSnackbar({
      open: true,
      message: t('switchBranchSuccess', { branch, count: artifactsImported }),
      severity: 'success',
    })
    refreshChangeCount()
  }

  const handleLogout = async () => {
    setUserMenuAnchor(null)
    await logout()
    navigate('/login')
  }

  return (
    <>
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
          <Typography variant="body1" fontWeight="bold" noWrap sx={{ mr: 1 }}>
            {projectName}
          </Typography>

          {/* Git controls */}
          {hasGit && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 'auto' }}>
              <BranchPicker
                projectId={projectId}
                currentBranch={currentBranch}
                onBranchSwitch={handleBranchSwitch}
              />

              {changeCount > 0 && (
                <Chip
                  label={t('changedFiles', { count: changeCount })}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 22 }}
                />
              )}

              <Tooltip title={t('commit')}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CommitIcon />}
                  onClick={() => setCommitDialogOpen(true)}
                  sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                >
                  {t('commit')}
                </Button>
              </Tooltip>

              <Tooltip title={t('push')}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={pushing ? <CircularProgress size={14} /> : <PublishIcon />}
                  onClick={handlePush}
                  disabled={pushing}
                  sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                >
                  {pushing ? t('pushing') : t('push')}
                </Button>
              </Tooltip>

              <SyncButton
                projectId={projectId}
                onSyncResult={handleSyncResult}
                onError={(msg) => setSnackbar({ open: true, message: msg, severity: 'error' })}
              />

              <Tooltip title={t('createPR')}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CallMergeIcon />}
                  onClick={() => setPrDialogOpen(true)}
                  sx={{ fontSize: '0.75rem', textTransform: 'none' }}
                >
                  {t('createPR')}
                </Button>
              </Tooltip>
            </Box>
          )}

          {!hasGit && <Box sx={{ flex: 1 }} />}

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

      {/* Commit dialog */}
      {hasGit && (
        <CommitDialog
          open={commitDialogOpen}
          onClose={() => setCommitDialogOpen(false)}
          projectId={projectId}
          onCommitSuccess={handleCommitSuccess}
        />
      )}

      {/* Conflict resolver dialog */}
      {hasGit && syncResult && syncResult.status === 'conflicts' && (
        <ConflictResolver
          open={conflictDialogOpen}
          onClose={() => setConflictDialogOpen(false)}
          projectId={projectId}
          syncResult={syncResult}
          onResolved={handleConflictResolved}
        />
      )}

      {/* Create PR dialog */}
      {hasGit && (
        <CreatePRDialog
          open={prDialogOpen}
          onClose={() => setPrDialogOpen(false)}
          projectId={projectId}
          onPRCreated={(pr) => {
            setSnackbar({ open: true, message: `${t('prCreateSuccess')} — #${pr.number}`, severity: 'success' })
          }}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default ProjectHeader
