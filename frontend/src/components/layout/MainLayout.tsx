import { Box, IconButton, Tooltip, Tabs, Tab } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AppHeader from './AppHeader'
import { useCollaboration } from '../../contexts/CollaborationContext'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'
import { usePlaybookPersistence } from '../../hooks/usePlaybookPersistence'
import { useProjectStore } from '../../stores/projectStore'
import { projectService } from '../../services/projectService'
import ModulesZoneCached from '../zones/ModulesZoneCached'
import ProjectTree from '../project/ProjectTree'
import PlaybookEditor from '../editor/PlaybookEditor'
import PlaybookManagerDialog from '../dialogs/PlaybookManagerDialog'

const MainLayout = () => {
  const { playbookId: routePlaybookId } = useParams<{ playbookId: string }>()
  const { t } = useTranslation('project')

  // Left panel state
  const [modulesZoneWidth, setModulesZoneWidth] = useState(280)
  const [isResizingModules, setIsResizingModules] = useState(false)
  const [isModulesCollapsed, setIsModulesCollapsed] = useState(false)
  const [playbookManagerOpen, setPlaybookManagerOpen] = useState(false)
  const [leftTab, setLeftTab] = useState(0)
  const [linkedProjectId, setLinkedProjectId] = useState<string | null>(null)

  // Store state (for AppHeader + PlaybookManagerDialog)
  const currentPlaybookId = usePlaybookEditorStore(s => s.currentPlaybookId)
  const activeSectionTab = usePlaybookEditorStore(s => s.activeSectionTab)

  // Collaboration state (for AppHeader display only)
  const { connectedUsers, isConnected } = useCollaboration()

  // Persistence (for PlaybookManagerDialog callback)
  const { loadPlaybook } = usePlaybookPersistence()

  // Project store (for ProjectTree tab)
  const fetchProject = useProjectStore(s => s.fetchProject)
  const fetchArtifacts = useProjectStore(s => s.fetchArtifacts)
  const clearCurrentProject = useProjectStore(s => s.clearCurrentProject)

  // Lookup which project this playbook belongs to
  useEffect(() => {
    if (!routePlaybookId) {
      setLinkedProjectId(null)
      return
    }

    let cancelled = false
    const lookup = async () => {
      try {
        const projects = await projectService.listProjects()
        for (const project of projects) {
          const artifacts = await projectService.listArtifacts(project.id)
          const match = artifacts.find(a =>
            a.artifact_type === 'playbook' && a.content?.playbook_id === routePlaybookId
          )
          if (match && !cancelled) {
            setLinkedProjectId(project.id)
            await fetchProject(project.id)
            if (!cancelled) await fetchArtifacts(project.id)
            return
          }
        }
        if (!cancelled) {
          setLinkedProjectId(null)
        }
      } catch {
        if (!cancelled) {
          setLinkedProjectId(null)
        }
      }
    }
    lookup()

    return () => {
      cancelled = true
      clearCurrentProject()
    }
  }, [routePlaybookId])

  // Left panel resize handlers
  const handleModulesMouseDown = () => setIsResizingModules(true)

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingModules) {
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 500) {
        setModulesZoneWidth(newWidth)
      }
    }
  }

  const handleMouseUp = () => setIsResizingModules(false)

  React.useEffect(() => {
    if (isResizingModules) {
      document.addEventListener('mousemove', handleMouseMove as EventListener)
      document.addEventListener('mouseup', handleMouseUp)
    } else {
      document.removeEventListener('mousemove', handleMouseMove as EventListener)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove as EventListener)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingModules])

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* App Header */}
      <AppHeader
        connectedUsers={connectedUsers}
        isCollaborationConnected={isConnected}
        onOpenPlaybookManager={() => setPlaybookManagerOpen(true)}
      />

      {/* Main content: left panel + editor */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left panel (Project + Modules tabs) */}
        {!isModulesCollapsed && (
          <Box
            sx={{
              width: `${modulesZoneWidth}px`,
              borderRight: '1px solid #ddd',
              flexShrink: 0,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Tabs header */}
            {linkedProjectId && (
              <Tabs
                value={leftTab}
                onChange={(_e, v) => setLeftTab(v)}
                variant="fullWidth"
                sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem' } }}
              >
                <Tab label={t('projectTree')} />
                <Tab label={t('modules')} />
              </Tabs>
            )}

            {/* Tab content */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {linkedProjectId && leftTab === 0 ? (
                <ProjectTree />
              ) : (
                <ModulesZoneCached onCollapse={() => setIsModulesCollapsed(true)} activeSectionTab={activeSectionTab} />
              )}
            </Box>

            {/* Resize handle */}
            <Box
              onMouseDown={handleModulesMouseDown}
              sx={{
                position: 'absolute',
                top: 0, right: 0, bottom: 0,
                width: '6px',
                cursor: 'ew-resize',
                bgcolor: isResizingModules ? 'primary.main' : 'transparent',
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
                bgcolor: isResizingModules ? 'white' : '#999',
              }} />
            </Box>
          </Box>
        )}

        {/* Editor area (WorkZone + ConfigZone + SystemZone) */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
          {/* Button to reopen left panel */}
          {isModulesCollapsed && (
            <Tooltip title="Show Modules" placement="right">
              <IconButton
                onClick={() => setIsModulesCollapsed(false)}
                sx={{
                  position: 'absolute',
                  top: 70, left: 8, zIndex: 1000,
                  bgcolor: 'background.paper', boxShadow: 2,
                  '&:hover': { bgcolor: 'primary.light' },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
          )}

          {routePlaybookId && (
            <PlaybookEditor playbookId={routePlaybookId} />
          )}
        </Box>
      </Box>

      {/* Playbook Manager Dialog */}
      <PlaybookManagerDialog
        open={playbookManagerOpen}
        onClose={() => setPlaybookManagerOpen(false)}
        onSelectPlaybook={async (playbookId) => {
          console.log('[MainLayout] onSelectPlaybook called with:', playbookId)
          await loadPlaybook(playbookId)
          console.log('[MainLayout] Playbook loaded:', playbookId)
        }}
        currentPlaybookId={currentPlaybookId}
      />
    </Box>
  )
}

export default MainLayout
