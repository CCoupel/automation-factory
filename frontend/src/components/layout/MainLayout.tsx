import { Box, IconButton, Tooltip } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import React, { useState, useRef } from 'react'
import AppHeader from './AppHeader'
import VarsZone from '../zones/VarsZone'
import ModulesZoneCached from '../zones/ModulesZoneCached'
import WorkZone from '../zones/WorkZone'
import ConfigZone from '../zones/ConfigZone'
import SystemZone from '../zones/SystemZone'
import PlaybookManagerDialog from '../dialogs/PlaybookManagerDialog'
import { PlayAttributes } from '../../types/playbook'

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
  const [isVarsCollapsed, setIsVarsCollapsed] = useState(true) // Collapsed by default since Variables are in PLAY sections now
  const deleteModuleCallbackRef = useRef<((id: string) => void) | null>(null)
  const updateModuleCallbackRef = useRef<((id: string, updates: Partial<{ when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string; delegateTo?: string }>) => void) | null>(null)
  const getPlayAttributesCallbackRef = useRef<(() => PlayAttributes) | null>(null)
  const updatePlayAttributesCallbackRef = useRef<((updates: Partial<PlayAttributes>) => void) | null>(null)
  const savePlaybookCallbackRef = useRef<(() => Promise<void>) | null>(null)
  const loadPlaybookCallbackRef = useRef<((playbookId: string) => Promise<void>) | null>(null)

  // Playbook save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [playbookName, setPlaybookName] = useState<string>('Untitled Playbook')
  const [currentPlaybookId, setCurrentPlaybookId] = useState<string | null>(null)

  // Playbook manager dialog
  const [playbookManagerOpen, setPlaybookManagerOpen] = useState(false)

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
        onOpenPlaybookManager={() => setPlaybookManagerOpen(true)}
      />

      {/* Zone Vars - Barre haute 1 */}
      {!isVarsCollapsed ? (
        <Box
          sx={{
            height: '60px',
            borderBottom: '1px solid #ddd',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <VarsZone />
          {/* Bouton de collapse */}
          <Tooltip title="Hide Variables Zone" placement="bottom">
            <IconButton
              size="small"
              onClick={() => setIsVarsCollapsed(true)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'primary.light',
                },
              }}
            >
              <ExpandLessIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box
          sx={{
            height: '30px',
            borderBottom: '1px solid #ddd',
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
          onClick={() => setIsVarsCollapsed(false)}
        >
          <Tooltip title="Show Variables Zone" placement="bottom">
            <IconButton size="small">
              <ExpandMoreIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

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
          if (loadPlaybookCallbackRef.current) {
            await loadPlaybookCallbackRef.current(playbookId)
            setCurrentPlaybookId(playbookId)
          }
        }}
        currentPlaybookId={currentPlaybookId}
      />
    </Box>
  )
}

export default MainLayout
