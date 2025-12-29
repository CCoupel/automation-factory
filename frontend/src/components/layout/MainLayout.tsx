import { Box, IconButton, Tooltip } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import AppHeader from './AppHeader'
import { useCollaboration } from '../../contexts/CollaborationContext'
import { useCollaborationSync } from '../../hooks/useCollaborationSync'
import { PlaybookUpdate } from '../../hooks/usePlaybookWebSocket'
import ModulesZoneCached from '../zones/ModulesZoneCached'
import WorkZone, { CollaborationCallbacks } from '../zones/WorkZone'
import ConfigZone from '../zones/ConfigZone'
import SystemZone from '../zones/SystemZone'
import PlaybookManagerDialog from '../dialogs/PlaybookManagerDialog'
import { PlayAttributes, ModuleSchema } from '../../types/playbook'
import { PlaybookContent } from '../../services/playbookService'

interface SelectedModule {
  id: string
  name: string
  collection: string
  taskName: string
  when?: string
  ignoreErrors?: boolean
  become?: boolean
  loop?: string
  delegateTo?: string
  isBlock?: boolean
  isPlay?: boolean
  moduleParameters?: Record<string, any>
  moduleSchema?: ModuleSchema
  validationState?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
    lastValidated?: Date
  }
}

const MainLayout = () => {
  const [selectedModule, setSelectedModule] = useState<SelectedModule | null>(null)
  const [systemZoneHeight, setSystemZoneHeight] = useState(200)
  const [modulesZoneWidth, setModulesZoneWidth] = useState(280)
  const [configZoneWidth, setConfigZoneWidth] = useState(320)
  const [isResizingSystem, setIsResizingSystem] = useState(false)
  const [isResizingModules, setIsResizingModules] = useState(false)
  const [isResizingConfig, setIsResizingConfig] = useState(false)
  const [isModulesCollapsed, setIsModulesCollapsed] = useState(false)
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false)
  const [isSystemCollapsed, setIsSystemCollapsed] = useState(false)
  const deleteModuleCallbackRef = useRef<((id: string) => void) | null>(null)
  const updateModuleCallbackRef = useRef<((id: string, updates: Partial<{
    taskName?: string;
    when?: string;
    ignoreErrors?: boolean;
    become?: boolean;
    loop?: string;
    delegateTo?: string;
    moduleParameters?: Record<string, any>;
    moduleSchema?: ModuleSchema;
    validationState?: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
      lastValidated?: Date;
    }
  }>) => void) | null>(null)
  const getPlayAttributesCallbackRef = useRef<(() => PlayAttributes) | null>(null)
  const updatePlayAttributesCallbackRef = useRef<((updates: Partial<PlayAttributes>) => void) | null>(null)
  const savePlaybookCallbackRef = useRef<(() => Promise<void>) | null>(null)
  const loadPlaybookCallbackRef = useRef<((playbookId: string) => Promise<void>) | null>(null)
  const getPlaybookContentCallbackRef = useRef<(() => PlaybookContent) | null>(null)

  // Playbook save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [playbookName, setPlaybookName] = useState<string>(() => {
    return sessionStorage.getItem('currentPlaybookName') || 'Untitled Playbook'
  })
  const [currentPlaybookId, setCurrentPlaybookId] = useState<string | null>(() => {
    return sessionStorage.getItem('currentPlaybookId')
  })

  // Playbook manager dialog
  const [playbookManagerOpen, setPlaybookManagerOpen] = useState(false)

  // Active play ID (for collaboration - different from playbook ID)
  const [activePlayId, setActivePlayId] = useState<string | null>(null)

  // Force re-render counter for collaboration updates that affect refs
  const [, forceRender] = useState(0)

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
    sendVariableUpdate,
    sendBlockCollapse,
    sendSectionCollapse,
    sendModuleResize
  } = useCollaborationSync()

  // Ref for applying collaboration updates to WorkZone
  const applyCollaborationUpdateRef = useRef<((update: PlaybookUpdate) => void) | null>(null)

  // Create collaboration callbacks object (memoized)
  const collaborationCallbacks: CollaborationCallbacks = {
    sendModuleAdd,
    sendModuleMove,
    sendModuleDelete,
    sendModuleConfig,
    sendModuleResize,
    sendLinkAdd,
    sendLinkDelete,
    sendPlayUpdate,
    sendVariableUpdate,
    sendBlockCollapse,
    sendSectionCollapse
  }

  // Apply received collaboration updates to WorkZone
  useEffect(() => {
    if (lastUpdate && applyCollaborationUpdateRef.current) {
      console.log('[MainLayout] Received collaboration update:', lastUpdate.update_type)
      applyCollaborationUpdateRef.current(lastUpdate)

      // Force re-render for updates that affect refs (play_update, module_config)
      // This ensures ConfigZone gets the updated playAttributes/selectedModule
      if (lastUpdate.update_type === 'play_update') {
        // Small delay to let WorkZone update its state first
        setTimeout(() => {
          forceRender(prev => prev + 1)
        }, 50)
      }
    }
  }, [lastUpdate])

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

  // Persist playbook ID and name in sessionStorage for navigation
  useEffect(() => {
    if (currentPlaybookId) {
      sessionStorage.setItem('currentPlaybookId', currentPlaybookId)
    } else {
      sessionStorage.removeItem('currentPlaybookId')
    }
  }, [currentPlaybookId])

  useEffect(() => {
    sessionStorage.setItem('currentPlaybookName', playbookName)
  }, [playbookName])

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
      {/* App Header - User info and Logout */}
      <AppHeader
        saveStatus={saveStatus}
        playbookName={playbookName}
        playbookId={currentPlaybookId}
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
            <ModulesZoneCached onCollapse={() => setIsModulesCollapsed(true)} />
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
            onSelectModule={setSelectedModule}
            selectedModuleId={selectedModule?.id || null}
            onDeleteModule={(callback) => { deleteModuleCallbackRef.current = callback }}
            onUpdateModule={(callback) => { updateModuleCallbackRef.current = callback }}
            onPlayAttributes={(getCallback, updateCallback) => {
              getPlayAttributesCallbackRef.current = getCallback
              updatePlayAttributesCallbackRef.current = updateCallback
            }}
            onSaveStatusChange={(status, name) => {
              setSaveStatus(status)
              setPlaybookName(name)
            }}
            onSavePlaybook={(callback) => { savePlaybookCallbackRef.current = callback }}
            onLoadPlaybook={(callback) => { loadPlaybookCallbackRef.current = callback }}
            onGetPlaybookContent={(callback) => { getPlaybookContentCallbackRef.current = callback }}
            collaborationCallbacks={collaborationCallbacks}
            onApplyCollaborationUpdate={(handler) => { applyCollaborationUpdateRef.current = handler }}
            onActivePlayIdChange={setActivePlayId}
            initialPlaybookId={currentPlaybookId}
            onPlaybookIdChange={setCurrentPlaybookId}
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
              selectedModule={selectedModule}
              onCollapse={() => setIsConfigCollapsed(true)}
              onDelete={(id) => deleteModuleCallbackRef.current?.(id)}
              onUpdateModule={(id, updates) => updateModuleCallbackRef.current?.(id, updates)}
              playAttributes={getPlayAttributesCallbackRef.current?.() || {}}
              onUpdatePlay={(updates) => updatePlayAttributesCallbackRef.current?.(updates)}
              collaborationCallbacks={{ sendModuleConfig, sendPlayUpdate }}
              activePlayId={activePlayId || undefined}
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
          <SystemZone
            getPlaybookContent={() => getPlaybookContentCallbackRef.current?.()}
            onSaveComplete={saveStatus === 'saved'}
          />
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
          if (loadPlaybookCallbackRef.current) {
            await loadPlaybookCallbackRef.current(playbookId)
            console.log('[MainLayout] Playbook loaded, setting currentPlaybookId to:', playbookId)
            setCurrentPlaybookId(playbookId)
          }
        }}
        currentPlaybookId={currentPlaybookId}
      />
    </Box>
  )
}

export default MainLayout
