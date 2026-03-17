import React, { useState, useRef, useEffect } from 'react'
import { Box, IconButton, Tooltip } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useCollaboration } from '../../contexts/CollaborationContext'
import { useCollaborationSync } from '../../hooks/useCollaborationSync'
import { usePlaybookPersistence } from '../../hooks/usePlaybookPersistence'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'
import WorkZone, { CollaborationCallbacks } from '../zones/WorkZone'
import ConfigZone from '../zones/ConfigZone'
import SystemZone from '../zones/SystemZone'

interface PlaybookEditorProps {
  playbookId: string
}

const PlaybookEditor: React.FC<PlaybookEditorProps> = ({ playbookId }) => {
  // Resize state for config and system panels
  const [systemZoneHeight, setSystemZoneHeight] = useState(200)
  const [configZoneWidth, setConfigZoneWidth] = useState(320)
  const [isResizingSystem, setIsResizingSystem] = useState(false)
  const [isResizingConfig, setIsResizingConfig] = useState(false)
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false)
  const [isSystemCollapsed, setIsSystemCollapsed] = useState(false)

  // Store state
  const currentPlaybookId = usePlaybookEditorStore(s => s.currentPlaybookId)
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
    sendModuleResize,
  } = useCollaborationSync()

  // Collaboration callbacks object
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
    sendSectionCollapse,
  }

  // Auto-load playbook
  const loadPlaybookRef = useRef(loadPlaybook)
  useEffect(() => { loadPlaybookRef.current = loadPlaybook })
  useEffect(() => {
    if (playbookId && playbookId !== currentPlaybookId) {
      loadPlaybookRef.current(playbookId)
    }
  }, [playbookId])

  // Apply received collaboration updates
  const applyCollaborationUpdateRef = useRef(applyCollaborationUpdate)
  applyCollaborationUpdateRef.current = applyCollaborationUpdate

  useEffect(() => {
    if (lastUpdate) {
      console.log('[PlaybookEditor] Received collaboration update:', lastUpdate.update_type)
      applyCollaborationUpdateRef.current(lastUpdate)
    }
  }, [lastUpdate])

  // Connect to playbook collaboration
  const connectToPlaybookRef = useRef(connectToPlaybook)
  const disconnectFromPlaybookRef = useRef(disconnectFromPlaybook)

  useEffect(() => {
    connectToPlaybookRef.current = connectToPlaybook
    disconnectFromPlaybookRef.current = disconnectFromPlaybook
  })

  useEffect(() => {
    console.log('[PlaybookEditor] currentPlaybookId changed to:', currentPlaybookId)
    if (currentPlaybookId) {
      console.log('[PlaybookEditor] Calling connectToPlaybook with:', currentPlaybookId)
      connectToPlaybookRef.current(currentPlaybookId)
    }
    return () => {
      console.log('[PlaybookEditor] Cleanup - disconnecting from playbook')
      disconnectFromPlaybookRef.current()
    }
  }, [currentPlaybookId])

  // Resize handlers
  const handleSystemMouseDown = () => setIsResizingSystem(true)
  const handleConfigMouseDown = () => setIsResizingConfig(true)

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingSystem) {
      const newHeight = window.innerHeight - e.clientY
      if (newHeight >= 100 && newHeight <= 600) {
        setSystemZoneHeight(newHeight)
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
    setIsResizingConfig(false)
  }

  useEffect(() => {
    if (isResizingSystem || isResizingConfig) {
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
  }, [isResizingSystem, isResizingConfig])

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Editor area: WorkZone + ConfigZone */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* WorkZone - Center */}
        <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0, position: 'relative' }}>
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
                  '&:hover': { bgcolor: 'primary.light' },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
            </Tooltip>
          )}
          <WorkZone collaborationCallbacks={collaborationCallbacks} />
        </Box>

        {/* ConfigZone - Right */}
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
            {/* Resize handle */}
            <Box
              onMouseDown={handleConfigMouseDown}
              sx={{
                position: 'absolute',
                top: 0, left: 0, bottom: 0,
                width: '6px',
                cursor: 'ew-resize',
                bgcolor: isResizingConfig ? 'primary.main' : 'transparent',
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
                bgcolor: isResizingConfig ? 'white' : '#999',
              }} />
            </Box>
            <ConfigZone
              onCollapse={() => setIsConfigCollapsed(true)}
              collaborationCallbacks={{ sendModuleConfig, sendPlayUpdate }}
            />
          </Box>
        )}
      </Box>

      {/* SystemZone - Bottom */}
      {!isSystemCollapsed ? (
        <Box
          sx={{
            height: `${systemZoneHeight}px`,
            borderTop: '1px solid #ddd',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {/* Resize handle */}
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
            <Box sx={{
              width: '40px', height: '3px',
              borderRadius: '2px',
              bgcolor: isResizingSystem ? 'white' : '#999',
            }} />
            <Tooltip title="Hide System Zone" placement="top">
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
            borderTop: '1px solid #ddd',
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

// Expose collaboration state for parent components (AppHeader needs these)
export { PlaybookEditor }
export default PlaybookEditor
