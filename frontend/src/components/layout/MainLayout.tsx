import { Box, IconButton, Tooltip } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import React, { useState, useRef } from 'react'
import PlaybookZone from '../zones/PlaybookZone'
import VarsZone from '../zones/VarsZone'
import ModulesZone from '../zones/ModulesZone'
import WorkZone from '../zones/WorkZone'
import ConfigZone from '../zones/ConfigZone'
import SystemZone from '../zones/SystemZone'

interface SelectedModule {
  id: string
  name: string
  collection: string
  taskName: string
  when?: string
  ignoreErrors?: boolean
  become?: boolean
  loop?: string
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
  const deleteModuleCallbackRef = useRef<((id: string) => void) | null>(null)
  const updateModuleCallbackRef = useRef<((id: string, updates: Partial<{ when?: string; ignoreErrors?: boolean; become?: boolean; loop?: string }>) => void) | null>(null)

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
      {/* Zone Playbook - Barre haute 1 */}
      <Box
        sx={{
          height: '80px',
          borderBottom: '1px solid #ddd',
          flexShrink: 0,
        }}
      >
        <PlaybookZone />
      </Box>

      {/* Zone Vars - Barre haute 2 */}
      <Box
        sx={{
          height: '60px',
          borderBottom: '1px solid #ddd',
          flexShrink: 0,
        }}
      >
        <VarsZone />
      </Box>

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
            <ModulesZone onCollapse={() => setIsModulesCollapsed(true)} />
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
              onDelete={deleteModuleCallbackRef.current || undefined}
              onUpdateModule={updateModuleCallbackRef.current || undefined}
            />
          </Box>
        )}
      </Box>

      {/* Zone System - Barre basse redimensionnable */}
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
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '40px',
              height: '3px',
              borderRadius: '2px',
              bgcolor: isResizingSystem ? 'white' : '#999',
            }}
          />
        </Box>
        <SystemZone />
      </Box>
    </Box>
  )
}

export default MainLayout
