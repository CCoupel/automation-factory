import { Box, IconButton, Tooltip } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import React, { useState, useRef, useEffect } from 'react'
import AppHeader from './AppHeader'
import { useCollaboration } from '../../contexts/CollaborationContext'
import { useCollaborationSync } from '../../hooks/useCollaborationSync'
import { usePlaybookPersistence } from '../../hooks/usePlaybookPersistence'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'
import ModulesZoneCached from '../zones/ModulesZoneCached'
import WorkZone, { CollaborationCallbacks } from '../zones/WorkZone'
import ConfigZone from '../zones/ConfigZone'
import SystemZone from '../zones/SystemZone'
import PlaybookManagerDialog from '../dialogs/PlaybookManagerDialog'

const MainLayout = () => {
  // Local UI state (zone widths, collapse states, resize flags)
  const [systemZoneHeight, setSystemZoneHeight] = useState(200)
  const [modulesZoneWidth, setModulesZoneWidth] = useState(280)
  const [configZoneWidth, setConfigZoneWidth] = useState(320)
  const [isResizingSystem, setIsResizingSystem] = useState(false)
  const [isResizingModules, setIsResizingModules] = useState(false)
  const [isResizingConfig, setIsResizingConfig] = useState(false)
  const [isModulesCollapsed, setIsModulesCollapsed] = useState(false)
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false)
  const [isSystemCollapsed, setIsSystemCollapsed] = useState(false)
  const [playbookManagerOpen, setPlaybookManagerOpen] = useState(false)

  // Store state
  const currentPlaybookId = usePlaybookEditorStore(s => s.currentPlaybookId)
  const activeSectionTab = usePlaybookEditorStore(s => s.activeSectionTab)
  const applyCollaborationUpdate = usePlaybookEditorStore(s => s.applyCollaborationUpdate)

  // Persistence hook (handles save/load/cache/auto-save)
  const { loadPlaybook } = usePlaybookPersistence()

  // Collaboration
  const { connectToPlaybook, disconnectFromPlaybook, connectedUsers, isConnected, lastUpdate } = useCollaboration()
  const {
    sendModuleAdd,
    sendModuleMove,
    sendModuleDelete,
    sendModuleConfig,
    sendLinkAdd,
    sendLinkDelete,
    sendPlayUpdate,
    sendVariableAdd,
    sendVariableUpdate,
    sendVariableDelete,
    sendRoleAdd,
    sendRoleDelete,
    sendRoleUpdate,
    sendBlockCollapse,
    sendSectionCollapse,
    sendModuleResize
  } = useCollaborationSync()

  // Create collaboration callbacks object
  const collaborationCallbacks: CollaborationCallbacks = {
    sendModuleAdd,
    sendModuleMove,
    sendModuleDelete,
    sendModuleConfig,
    sendModuleResize,
    sendLinkAdd,
    sendLinkDelete,
    sendPlayUpdate,
    sendVariableAdd,
    sendVariableUpdate,
    sendVariableDelete,
    sendRoleAdd,
    sendRoleDelete,
    sendRoleUpdate,
    sendBlockCollapse,
    sendSectionCollapse
  }

  // Apply received collaboration updates directly to store
  useEffect(() => {
    if (lastUpdate) {
      console.log('[MainLayout] Received collaboration update:', lastUpdate.update_type)
      applyCollaborationUpdate(lastUpdate)
    }
  }, [lastUpdate, applyCollaborationUpdate])

  // Store functions in refs to avoid dependency issues
  const connectToPlaybookRef = useRef(connectToPlaybook)
  const disconnectFromPlaybookRef = useRef(disconnectFromPlaybook)

  // Update refs when functions change
  useEffect(() => {
    connectToPlaybookRef.current = connectToPlaybook
    disconnectFromPlaybookRef.current = disconnectFromPlaybook
  })

  // Connect to playbook collaboration when playbook ID changes
  useEffect(() => {
    console.log('[MainLayout] currentPlaybookId changed to:', currentPlaybookId)
    if (currentPlaybookId) {
      console.log('[MainLayout] Calling connectToPlaybook with:', currentPlaybookId)
      connectToPlaybookRef.current(currentPlaybookId)
    }
    return () => {
      console.log('[MainLayout] Cleanup - disconnecting from playbook')
      disconnectFromPlaybookRef.current()
    }
  }, [currentPlaybookId])

  const handleSystemMouseDown = () => {
    setIsResizingSystem(true)
  }

  const handleModulesMouseDown = () => {
    setIsResizingModules(true)
  }

  const handleConfigMouseDown = () => {
    setIsResizingConfig(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingSystem) {
      const newHeight = window.innerHeight - e.clientY
      if (newHeight >= 100 && newHeight <= 600) {
        setSystemZoneHeight(newHeight)
      }
    } else if (isResizingModules) {
      const newWidth = e.clientX
      if (newWidth >= 200 && newWidth <= 500) {
        setModulesZoneWidth(newWidth)
      }
    } else if (isResizingConfig) {
      const newWidth = window.innerWidth - e.clientX
      if (newWidth >= 250 && newWidth <= 600) {
        setConfigZoneWidth(newWidth)
      }
    }
  }

  const handleMouseUp = () => {
    setIsResizingSystem(false)
    setIsResizingModules(false)
    setIsResizingConfig(false)
  }

  // Ajouter/retirer les event listeners
  React.useEffect(() => {
    if (isResizingSystem || isResizingModules || isResizingConfig) {
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
  }, [isResizingSystem, isResizingModules, isResizingConfig])

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* App Header - reads from store directly */}
      <AppHeader
        connectedUsers={connectedUsers}
        isCollaborationConnected={isConnected}
        onOpenPlaybookManager={() => setPlaybookManagerOpen(true)}
      />

      {/* Zone Centrale - 3 colonnes */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* Zone Modules - Gauche redimensionnable */}
        {!isModulesCollapsed && (
          <Box
            sx={{
              width: `${modulesZoneWidth}px`,
              borderRight: '1px solid #ddd',
              flexShrink: 0,
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <ModulesZoneCached onCollapse={() => setIsModulesCollapsed(true)} activeSectionTab={activeSectionTab} />
            {/* Poignée de redimensionnement */}
            <Box
              onMouseDown={handleModulesMouseDown}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: '6px',
                cursor: 'ew-resize',
                bgcolor: isResizingModules ? 'primary.main' : 'transparent',
                '&:hover': {
                  bgcolor: 'primary.light',
                },
                transition: 'background-color 0.2s',
                zIndex: 10,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '3px',
                  height: '40px',
                  borderRadius: '2px',
                  bgcolor: isResizingModules ? 'white' : '#999',
                }}
              />
            </Box>
          </Box>
        )}

        {/* Zone de Travail - Centre */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            minWidth: 0,
            position: 'relative',
          }}
        >
          {/* Bouton pour rouvrir la zone Modules */}
          {isModulesCollapsed && (
            <Tooltip title="Show Modules" placement="right">
              <IconButton
                onClick={() => setIsModulesCollapsed(false)}
                sx={{
                  position: 'absolute',
                  top: 70,
                  left: 8,
                  zIndex: 1000,
                  bgcolor: 'background.paper',
                  boxShadow: 2,
                  '&:hover': {
                    bgcolor: 'primary.light',
                  },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
          )}
          {/* Bouton pour rouvrir la zone Config */}
          {isConfigCollapsed && (
            <Tooltip title="Show Configuration" placement="left">
              <IconButton
                onClick={() => setIsConfigCollapsed(false)}
                sx={{
                  position: 'absolute',
                  top: 70,
                  right: 8,
                  zIndex: 1000,
                  bgcolor: 'background.paper',
                  boxShadow: 2,
                  '&:hover': {
                    bgcolor: 'primary.light',
                  },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
            </Tooltip>
          )}
          <WorkZone
            collaborationCallbacks={collaborationCallbacks}
          />
        </Box>

        {/* Zone Config - Droite redimensionnable */}
        {!isConfigCollapsed && (
          <Box
            sx={{
              width: `${configZoneWidth}px`,
              borderLeft: '1px solid #ddd',
              flexShrink: 0,
              overflow: 'auto',
              position: 'relative',
            }}
          >
            {/* Poignée de redimensionnement */}
            <Box
              onMouseDown={handleConfigMouseDown}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '6px',
                cursor: 'ew-resize',
                bgcolor: isResizingConfig ? 'primary.main' : 'transparent',
                '&:hover': {
                  bgcolor: 'primary.light',
                },
                transition: 'background-color 0.2s',
                zIndex: 10,
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '3px',
                  height: '40px',
                  borderRadius: '2px',
                  bgcolor: isResizingConfig ? 'white' : '#999',
                }}
              />
            </Box>
            <ConfigZone
              onCollapse={() => setIsConfigCollapsed(true)}
              collaborationCallbacks={{ sendModuleConfig, sendPlayUpdate }}
            />
          </Box>
        )}
      </Box>

      {/* Zone System - Barre basse redimensionnable */}
      {!isSystemCollapsed ? (
        <Box
          sx={{
            height: `${systemZoneHeight}px`,
            borderTop: '1px solid #ddd',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {/* Poignée de redimensionnement */}
          <Box
            onMouseDown={handleSystemMouseDown}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              cursor: 'ns-resize',
              bgcolor: isResizingSystem ? 'primary.main' : 'transparent',
              '&:hover': {
                bgcolor: 'primary.light',
              },
              transition: 'background-color 0.2s',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                width: '40px',
                height: '3px',
                borderRadius: '2px',
                bgcolor: isResizingSystem ? 'white' : '#999',
              }}
            />
            {/* Bouton de collapse */}
            <Tooltip title="Hide System Zone" placement="top">
              <IconButton
                size="small"
                onClick={() => setIsSystemCollapsed(true)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  bgcolor: 'background.paper',
                  boxShadow: 1,
                  '&:hover': {
                    bgcolor: 'primary.light',
                  },
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
            borderTop: '1px solid #ddd',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.paper',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'action.hover',
            },
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
