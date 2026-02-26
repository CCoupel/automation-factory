import React, { useEffect, useState } from 'react'
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useEditorStore } from '../../stores/editorStore'
import ProjectHeader from '../project/ProjectHeader'
import ProjectTree from '../project/ProjectTree'
import ModulesZoneCached from '../zones/ModulesZoneCached'
import SystemZone from '../zones/SystemZone'
import RoleEditor from '../editors/RoleEditor'

const ProjectLayout: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const { t } = useTranslation('project')

  const currentProject = useProjectStore(s => s.currentProject)
  const isLoading = useProjectStore(s => s.isLoading)
  const fetchProject = useProjectStore(s => s.fetchProject)
  const fetchArtifacts = useProjectStore(s => s.fetchArtifacts)
  const clearCurrentProject = useProjectStore(s => s.clearCurrentProject)

  // Editor tabs
  const editorTabs = useEditorStore(s => s.tabs)
  const activeTabIndex = useEditorStore(s => s.activeTabIndex)
  const setActiveTab = useEditorStore(s => s.setActiveTab)
  const closeTab = useEditorStore(s => s.closeTab)
  const closeAllTabs = useEditorStore(s => s.closeAllTabs)

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
    return () => { clearCurrentProject(); closeAllTabs() }
  }, [projectId])

  // Resize handlers
  const handleLeftMouseDown = () => setIsResizingLeft(true)
  const handleSystemMouseDown = () => setIsResizingSystem(true)

  const handleMouseMove = (e: MouseEvent) => {
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
      document.addEventListener('mousemove', handleMouseMove as any)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.removeEventListener('mousemove', handleMouseMove as any)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingLeft, isResizingSystem])

  if (isLoading && !currentProject) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
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
        <Box sx={{ flex: 1, overflow: 'hidden', minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
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

          {editorTabs.length > 0 ? (
            <>
              {/* Editor tab bar */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
                <Tabs
                  value={activeTabIndex}
                  onChange={(_e, v) => setActiveTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ minHeight: 32, flex: 1, '& .MuiTab-root': { minHeight: 32, py: 0, px: 1.5, fontSize: '0.8rem', textTransform: 'none' } }}
                >
                  {editorTabs.map(tab => (
                    <Tab
                      key={tab.id}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <span>{tab.title}</span>
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                            sx={{ p: 0.25, ml: 0.5, '& .MuiSvgIcon-root': { fontSize: '0.9rem' } }}
                          >
                            <CloseIcon />
                          </IconButton>
                        </Box>
                      }
                    />
                  ))}
                </Tabs>
              </Box>

              {/* Active editor content */}
              <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {editorTabs[activeTabIndex]?.type === 'role' && projectId ? (
                  <RoleEditor
                    artifactPath={editorTabs[activeTabIndex].artifactPath}
                    projectId={projectId}
                  />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {t('comingSoon')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          ) : (
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
          )}
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
          <SystemZone projectId={projectId} />
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
          <Tooltip title="Show System Zone" placement="top">
            <IconButton size="small">
              <ExpandLessIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
}

export default ProjectLayout
