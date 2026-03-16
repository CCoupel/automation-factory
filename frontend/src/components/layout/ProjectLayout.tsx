import React, { useEffect, useState } from 'react'
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import ProjectHeader from '../project/ProjectHeader'
import ProjectTree from '../project/ProjectTree'
import ModulesZoneCached from '../zones/ModulesZoneCached'
import SystemZone from '../zones/SystemZone'

const ProjectLayout: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('project')
  const { t: tc } = useTranslation('common')

  const currentProject = useProjectStore(s => s.currentProject)
  const isLoading = useProjectStore(s => s.isLoading)
  const error = useProjectStore(s => s.error)
  const fetchProject = useProjectStore(s => s.fetchProject)
  const fetchArtifacts = useProjectStore(s => s.fetchArtifacts)
  const clearCurrentProject = useProjectStore(s => s.clearCurrentProject)
  const clearError = useProjectStore(s => s.clearError)

  // Left panel state
  const [leftTab, setLeftTab] = useState(0)
  const [leftPanelWidth, setLeftPanelWidth] = useState(280)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const [isResizingLeft, setIsResizingLeft] = useState(false)

  // Bottom panel state
  const [systemZoneHeight, setSystemZoneHeight] = useState(200)
  const [isSystemCollapsed, setIsSystemCollapsed] = useState(true)
  const [isResizingSystem, setIsResizingSystem] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId)
      fetchArtifacts(projectId)
    }
    return () => { clearCurrentProject() }
  }, [projectId])

  // Resize handlers
  const handleLeftMouseDown = () => setIsResizingLeft(true)
  const handleSystemMouseDown = () => setIsResizingSystem(true)

  const handleMouseMove: EventListener = (evt) => {
    const e = evt as MouseEvent
    if (isResizingLeft) {
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 500) setLeftPanelWidth(newWidth)
    } else if (isResizingSystem) {
      const newHeight = window.innerHeight - e.clientY
      if (newHeight >= 100 && newHeight <= 600) setSystemZoneHeight(newHeight)
    }
  }

  const handleMouseUp = () => {
    setIsResizingLeft(false)
    setIsResizingSystem(false)
  }

  React.useEffect(() => {
    if (isResizingLeft || isResizingSystem) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingLeft, isResizingSystem])

  // 404: project not found after loading
  const isNotFound = !isLoading && !currentProject && !!projectId

  useEffect(() => {
    if (isNotFound) {
      const timer = setTimeout(() => navigate('/'), 3000)
      return () => clearTimeout(timer)
    }
  }, [isNotFound, navigate])

  if (isLoading && !currentProject) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isNotFound) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">{t('projectNotFound')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('projectNotFoundDesc')}</Typography>
        <Typography variant="caption" color="text.secondary">{t('redirectingHome')}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <ProjectHeader projectName={currentProject?.name || '...'} />

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left panel */}
        {!isLeftCollapsed && (
          <Box
            sx={{
              width: `${leftPanelWidth}px`,
              borderRight: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <Tabs
              value={leftTab}
              onChange={(_e, v) => setLeftTab(v)}
              variant="fullWidth"
              sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem' } }}
            >
              <Tab label={t('projectTree')} />
              <Tab label={t('modules')} />
            </Tabs>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {leftTab === 0 && <ProjectTree />}
              {leftTab === 1 && <ModulesZoneCached />}
            </Box>

            {/* Resize handle */}
            <Box
              onMouseDown={handleLeftMouseDown}
              sx={{
                position: 'absolute',
                top: 0, right: 0, bottom: 0,
                width: '6px',
                cursor: 'ew-resize',
                bgcolor: isResizingLeft ? 'primary.main' : 'transparent',
                '&:hover': { bgcolor: 'primary.light' },
                transition: 'background-color 0.2s',
                zIndex: 10,
              }}
            >
              <Box sx={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '3px', height: '40px',
                borderRadius: '2px',
                bgcolor: isResizingLeft ? 'white' : '#999',
              }} />
            </Box>
          </Box>
        )}

        {/* Center area */}
        <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0, position: 'relative' }}>
          {isLeftCollapsed && (
            <Tooltip title={t('projectTree')} placement="right">
              <IconButton
                onClick={() => setIsLeftCollapsed(false)}
                sx={{
                  position: 'absolute', top: 8, left: 8, zIndex: 1000,
                  bgcolor: 'background.paper', boxShadow: 2,
                  '&:hover': { bgcolor: 'primary.light' },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
          )}

          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            p: 4,
          }}>
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
              {t('selectArtifact')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* System zone (bottom) */}
      {!isSystemCollapsed ? (
        <Box
          sx={{
            height: `${systemZoneHeight}px`,
            borderTop: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <Box
            onMouseDown={handleSystemMouseDown}
            sx={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: '6px',
              cursor: 'ns-resize',
              bgcolor: isResizingSystem ? 'primary.main' : 'transparent',
              '&:hover': { bgcolor: 'primary.light' },
              transition: 'background-color 0.2s',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ width: '40px', height: '3px', borderRadius: '2px', bgcolor: isResizingSystem ? 'white' : '#999' }} />
            <Tooltip title={t('modules')} placement="top">
              <IconButton
                size="small"
                onClick={() => setIsSystemCollapsed(true)}
                sx={{
                  position: 'absolute', right: 8,
                  bgcolor: 'background.paper', boxShadow: 1,
                  '&:hover': { bgcolor: 'primary.light' },
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <SystemZone />
        </Box>
      ) : (
        <Box
          sx={{
            height: '30px',
            borderTop: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => setIsSystemCollapsed(false)}
        >
          <Tooltip title={tc('showSystemZone')} placement="top">
            <IconButton size="small">
              <ExpandLessIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ProjectLayout
