import { Box, Typography, IconButton, TextField, Tooltip, Tabs, Tab, Button, Chip } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import ExtensionIcon from '@mui/icons-material/Extension'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import TextFieldsIcon from '@mui/icons-material/TextFields'
import NumbersIcon from '@mui/icons-material/Numbers'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import DataArrayIcon from '@mui/icons-material/DataArray'
import DataObjectIcon from '@mui/icons-material/DataObject'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import React, { useState, useEffect, useCallback } from 'react'
import PlayAttributeIcons from '../common/PlayAttributeIcons'
import TabIconBadge from '../common/TabIconBadge'
import VisualCanvas from '../canvas/VisualCanvas'
import AddVariableDialog from '../dialogs/AddVariableDialog'
import ExportDiagramDialog from '../dialogs/ExportDiagramDialog'
import ImportDiagramDialog from '../dialogs/ImportDiagramDialog'
import { ImportResult } from '../../services/diagramImportService'
import { ModuleBlock, Link, PlayVariable, VariableType, PlaySectionName, Play } from '../../types/playbook'
import { SYSTEM_ASSERTIONS_BLOCK_PREFIX, updateAssertionsBlocks, isSystemAssertionsId, isSystemLink } from '../../utils/assertionsGenerator'
import { variableTypesService } from '../../services/variableTypesService'
import { getPlaySectionColor, getStartChainCount, isPlaySectionCollapsed } from '../../utils/canvasHelpers'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'
import { useShallow } from 'zustand/react/shallow'

// Collaboration callback types for real-time sync
export interface CollaborationCallbacks {
  sendModuleAdd?: (data: { moduleId: string; module: ModuleBlock; position: { x: number; y: number } }) => void
  sendModuleMove?: (data: { moduleId: string; x: number; y: number; parentId?: string; parentSection?: string }) => void
  sendModuleDelete?: (data: { moduleId: string }) => void
  sendModuleConfig?: (data: { moduleId: string; field: string; value: unknown; element_id?: string }) => void
  sendModuleResize?: (data: { moduleId: string; width: number; height: number; x: number; y: number }) => void
  sendLinkAdd?: (data: { link: Link }) => void
  sendLinkDelete?: (data: { linkId: string }) => void
  sendPlayUpdate?: (data: { playId: string; field: string; value: unknown }) => void
  sendVariableAdd?: (data: { playId: string; variable: PlayVariable }) => void
  sendVariableUpdate?: (data: { playId: string; variableIndex: number; variable: PlayVariable }) => void
  sendVariableDelete?: (data: { playId: string; variableIndex: number }) => void
  sendRoleAdd?: (data: { playId: string; role: string | { role: string; vars?: Record<string, unknown>; enabled?: boolean } }) => void
  sendRoleDelete?: (data: { playId: string; roleIndex: number }) => void
  sendRoleUpdate?: (data: { playId: string; roles: Array<string | { role: string; vars?: Record<string, unknown>; enabled?: boolean }> }) => void
  sendBlockCollapse?: (data: { blockId: string; collapsed: boolean }) => void
  sendSectionCollapse?: (data: { key: string; collapsed: boolean }) => void
}

interface WorkZoneProps {
  collaborationCallbacks?: CollaborationCallbacks
}

// Helper to create START modules for a play
const createStartModulesForPlay = (playId: string): ModuleBlock[] => {
  const sections = ['pre_tasks', 'tasks', 'post_tasks', 'handlers'] as const
  return sections.map(section => ({
    id: `${playId}-start-${section.replace('_', '-')}`,
    collection: 'ansible.generic',
    name: 'start',
    description: `Start point for ${section.replace('_', ' ')}`,
    taskName: 'START',
    x: 50,
    y: 20,
    isPlay: true,
    parentSection: section,
  }))
}

// Helper to ensure START modules exist in a play's modules
const ensureStartModules = (playId: string, modules: ModuleBlock[]): ModuleBlock[] => {
  const requiredStartIds = [
    `${playId}-start-pre-tasks`,
    `${playId}-start-tasks`,
    `${playId}-start-post-tasks`,
    `${playId}-start-handlers`
  ]

  const existingStartIds = new Set(modules.filter(m => m.isPlay).map(m => m.id))
  const missingStartModules = createStartModulesForPlay(playId).filter(
    m => !existingStartIds.has(m.id)
  )

  return [...missingStartModules, ...modules]
}

const WorkZone = ({ collaborationCallbacks }: WorkZoneProps) => {
  // =====================================================
  // ZUSTAND STORE — use useShallow to avoid re-renders on unrelated changes
  // =====================================================
  const {
    plays, setPlays,
    activePlayIndex, setActivePlayIndex,
    selectedModuleId, selectModule,
    selectedRole, selectRole,
    currentPlaybookId, setCurrentPlaybookId,
    playbookName, setPlaybookName,
    activeSectionTab, setActiveSectionTab,
    editingTabIndex, setEditingTabIndex,
    collapsedBlocks, setCollapsedBlocks,
    collapsedBlockSections,
    collapsedPlaySections, setCollapsedPlaySections,
    customTypes, setCustomTypes,
    setModulesForActivePlay,
    setLinksForActivePlay,
    togglePlaySection,
  } = usePlaybookEditorStore(useShallow(s => ({
    plays: s.plays, setPlays: s.setPlays,
    activePlayIndex: s.activePlayIndex, setActivePlayIndex: s.setActivePlayIndex,
    selectedModuleId: s.selectedModuleId, selectModule: s.selectModule,
    selectedRole: s.selectedRole, selectRole: s.selectRole,
    currentPlaybookId: s.currentPlaybookId, setCurrentPlaybookId: s.setCurrentPlaybookId,
    playbookName: s.playbookName, setPlaybookName: s.setPlaybookName,
    activeSectionTab: s.activeSectionTab, setActiveSectionTab: s.setActiveSectionTab,
    editingTabIndex: s.editingTabIndex, setEditingTabIndex: s.setEditingTabIndex,
    collapsedBlocks: s.collapsedBlocks, setCollapsedBlocks: s.setCollapsedBlocks,
    collapsedBlockSections: s.collapsedBlockSections,
    collapsedPlaySections: s.collapsedPlaySections, setCollapsedPlaySections: s.setCollapsedPlaySections,
    customTypes: s.customTypes, setCustomTypes: s.setCustomTypes,
    setModulesForActivePlay: s.setModulesForActivePlay,
    setLinksForActivePlay: s.setLinksForActivePlay,
    togglePlaySection: s.togglePlaySection,
  })))

  const setModules = setModulesForActivePlay
  const setLinks = setLinksForActivePlay
  const selectedRoleIndex = selectedRole?.index ?? null

  const onSelectModule = useCallback((module: { id: string; [key: string]: any } | null) => {
    selectModule(module?.id ?? null)
  }, [selectModule])

  const onSelectRole = useCallback((role: { index: number; role: string; vars?: Record<string, any> } | null) => {
    selectRole(role)
  }, [selectRole])

  // Active play data
  const currentPlay = plays[activePlayIndex] || plays[0]
  const modules = currentPlay?.modules || []
  const links = currentPlay?.links || []

  // Dialog state
  const [addVariableDialogOpen, setAddVariableDialogOpen] = useState(false)
  const [editingVariableIndex, setEditingVariableIndex] = useState<number | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // Fetch custom variable types for assertions generation
  useEffect(() => {
    variableTypesService.getVariableTypesFlat()
      .then(types => {
        const custom = types
          .filter(t => !t.is_builtin)
          .map(t => ({
            name: t.name,
            label: t.label,
            pattern: (t as { pattern?: string }).pattern || '',
            is_filter: (t as { is_filter?: boolean }).is_filter || false,
          }))
        setCustomTypes(custom)
      })
      .catch(err => {
        console.error('Failed to load custom variable types:', err)
      })
  }, [])

  // Generate/update system assertions blocks when variables or custom types change
  // Creates ONE BLOCK PER VARIABLE for better visual organization
  // Guard ref to break the loop: setModules changes plays -> currentPlay ref changes ->
  // currentPlay.variables is a new ref -> useEffect re-triggers. Compare by value instead.
  const prevVariablesJsonRef = useRef<string>('')
  const prevPlayIdRef = useRef<string>('')
  const prevCustomTypesJsonRef = useRef<string>('')

  useEffect(() => {
    const variablesJson = JSON.stringify(currentPlay.variables)
    const customTypesJson = JSON.stringify(customTypes)

    // Skip if variables, playId, and customTypes haven't actually changed by value
    if (
      variablesJson === prevVariablesJsonRef.current &&
      currentPlay.id === prevPlayIdRef.current &&
      customTypesJson === prevCustomTypesJsonRef.current
    ) {
      return
    }
    prevVariablesJsonRef.current = variablesJson
    prevPlayIdRef.current = currentPlay.id
    prevCustomTypesJsonRef.current = customTypesJson

    // Get existing system blocks (to preserve positions)
    const existingSystemBlocks = modules.filter(m => m.id.startsWith(SYSTEM_ASSERTIONS_BLOCK_PREFIX))

    const result = updateAssertionsBlocks(
      existingSystemBlocks,
      currentPlay.variables,
      currentPlay.id,
      customTypes
    )

    if (result) {
      const { blocks, tasks, links: systemLinks } = result

      // Remove all existing system assertion blocks and tasks
      const cleanedModules = modules.filter(m => !isSystemAssertionsId(m.id))
      const cleanedLinks = links.filter(l => !isSystemLink(l.id))

      const newModules = [...blocks, ...tasks, ...cleanedModules]

      setModules(newModules)
      setLinks([...systemLinks, ...cleanedLinks])

      setCollapsedBlocks(prev => {
        const newSet = new Set(prev)
        blocks.forEach(block => {
          newSet.add(block.id)
        })
        return newSet
      })
    } else if (existingSystemBlocks.length > 0) {
      setModules(prev => prev.filter(m => !isSystemAssertionsId(m.id)))
      setLinks(prev => prev.filter(l => !isSystemLink(l.id)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlay.variables, currentPlay.id, customTypes])

  // Count tasks in chain from START of a play section
  const getTaskChainCount = (sectionName: 'pre_tasks' | 'tasks' | 'post_tasks' | 'handlers'): number => {
    const startTask = modules.find(m => m.isPlay && !m.parentId && m.parentSection === sectionName)
    if (!startTask) return 0
    return getStartChainCount(startTask.id, links)
  }

  // =====================================================
  // Play management
  // =====================================================
  const addPlay = () => {
    const newPlayId = `play-${Date.now()}`
    const newPlay: Play = {
      id: newPlayId,
      name: `Play ${plays.length + 1}`,
      modules: createStartModulesForPlay(newPlayId),
      links: [],
      variables: [],
      attributes: {
        hosts: 'all',
        remoteUser: undefined,
        gatherFacts: true,
        become: false,
        connection: 'ssh',
        roles: [],
      },
    }
    setPlays([...plays, newPlay])
    setActivePlayIndex(plays.length)
  }

  const deletePlay = (index: number) => {
    if (plays.length === 1) return
    const newPlays = plays.filter((_, i) => i !== index)
    setPlays(newPlays)
    if (activePlayIndex >= newPlays.length) {
      setActivePlayIndex(newPlays.length - 1)
    }
  }

  const updatePlayName = (index: number, newName: string) => {
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[index] = {
        ...updatedPlays[index],
        name: newName,
        modules: updatedPlays[index].modules.map(m =>
          m.isPlay ? { ...m, taskName: newName } : m
        ),
      }
      return updatedPlays
    })
  }

  // =====================================================
  // Variables management
  // =====================================================
  const addVariable = () => {
    setEditingVariableIndex(null)
    setAddVariableDialogOpen(true)
  }

  const editVariable = (index: number) => {
    setEditingVariableIndex(index)
    setAddVariableDialogOpen(true)
  }

  const handleAddVariableFromDialog = (variable: Omit<PlayVariable, 'value'> & { value?: string }) => {
    const newVariable: PlayVariable = {
      key: variable.key,
      value: variable.value || variable.defaultValue || '',
      type: variable.type,
      required: variable.required,
      ...(variable.defaultValue && { defaultValue: variable.defaultValue }),
      ...(variable.regexp && { regexp: variable.regexp }),
    }

    if (editingVariableIndex !== null) {
      updateVariable(editingVariableIndex, newVariable)
    } else {
      setPlays(prevPlays => {
        const updatedPlays = [...prevPlays]
        updatedPlays[activePlayIndex] = {
          ...updatedPlays[activePlayIndex],
          variables: [...updatedPlays[activePlayIndex].variables, newVariable],
        }
        return updatedPlays
      })

      if (collaborationCallbacks?.sendVariableAdd) {
        collaborationCallbacks.sendVariableAdd({
          playId: currentPlay.id,
          variable: newVariable,
        })
      }
    }
    setEditingVariableIndex(null)
  }

  const handleImportDiagram = (result: ImportResult) => {
    if (!result.success) return

    setPlays(result.plays.map(play => ({
      ...play,
      modules: ensureStartModules(play.id, play.modules),
    })))

    if (result.uiState) {
      setCollapsedBlocks(new Set(result.uiState.collapsedBlocks))
      usePlaybookEditorStore.getState().setCollapsedBlockSections(new Set(result.uiState.collapsedBlockSections))
      setCollapsedPlaySections(new Set(result.uiState.collapsedPlaySections))
      setActivePlayIndex(result.uiState.activePlayIndex)
    }

    if (result.metadata.name) {
      setPlaybookName(result.metadata.name)
    }

    setCurrentPlaybookId(null)
  }

  const deleteVariable = (index: number) => {
    const playId = currentPlay.id
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        variables: updatedPlays[activePlayIndex].variables.filter((_, i) => i !== index),
      }
      return updatedPlays
    })

    if (collaborationCallbacks?.sendVariableDelete) {
      collaborationCallbacks.sendVariableDelete({ playId, variableIndex: index })
    }
  }

  const updateVariable = useCallback((index: number, variable: PlayVariable) => {
    const playId = currentPlay.id
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const newVariables = [...updatedPlays[activePlayIndex].variables]
      newVariables[index] = variable
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        variables: newVariables,
      }
      return updatedPlays
    })

    if (collaborationCallbacks?.sendVariableUpdate) {
      collaborationCallbacks.sendVariableUpdate({
        playId,
        variableIndex: index,
        variable,
      })
    }
  }, [activePlayIndex, collaborationCallbacks, currentPlay.id])

  // =====================================================
  // Roles management
  // =====================================================
  const [draggedRoleIndex, setDraggedRoleIndex] = useState<number | null>(null)

  const deleteRole = (index: number) => {
    const playId = currentPlay.id
    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const currentRoles = updatedPlays[activePlayIndex].attributes?.roles || []
      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        attributes: {
          ...updatedPlays[activePlayIndex].attributes,
          roles: currentRoles.filter((_, i) => i !== index),
        },
      }
      return updatedPlays
    })

    if (collaborationCallbacks?.sendRoleDelete) {
      collaborationCallbacks.sendRoleDelete({ playId, roleIndex: index })
    }
  }

  const toggleRoleEnabled = (index: number) => {
    const playId = currentPlay.id
    let newRoles: Array<string | { role: string; vars?: Record<string, unknown>; enabled?: boolean }> = []

    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const currentRoles = [...(updatedPlays[activePlayIndex].attributes?.roles || [])]

      if (index >= 0 && index < currentRoles.length) {
        const currentRole = currentRoles[index]
        const roleName = typeof currentRole === 'string' ? currentRole : currentRole.role
        const roleVars = typeof currentRole === 'string' ? undefined : currentRole.vars
        const currentEnabled = typeof currentRole === 'string' ? true : ((currentRole as { enabled?: boolean }).enabled !== false)

        currentRoles[index] = {
          role: roleName,
          ...(roleVars && Object.keys(roleVars).length > 0 && { vars: roleVars }),
          enabled: !currentEnabled,
        } as { role: string; vars?: Record<string, unknown>; enabled?: boolean }

        updatedPlays[activePlayIndex] = {
          ...updatedPlays[activePlayIndex],
          attributes: {
            ...updatedPlays[activePlayIndex].attributes,
            roles: currentRoles,
          },
        }

        newRoles = currentRoles as Array<string | { role: string; vars?: Record<string, unknown>; enabled?: boolean }>
      }
      return updatedPlays
    })

    if (collaborationCallbacks?.sendRoleUpdate && newRoles.length > 0) {
      collaborationCallbacks.sendRoleUpdate({ playId, roles: newRoles })
    }
  }

  const handleRoleDragStart = (index: number, e: React.DragEvent) => {
    setDraggedRoleIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleRoleDragOver = (_index: number, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleRoleDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault()

    if (draggedRoleIndex === null || draggedRoleIndex === targetIndex) {
      setDraggedRoleIndex(null)
      return
    }

    const playId = currentPlay.id
    let newRoles: Array<string | { role: string; vars?: Record<string, unknown>; enabled?: boolean }> = []

    setPlays(prevPlays => {
      const updatedPlays = [...prevPlays]
      const currentRoles = [...(updatedPlays[activePlayIndex].attributes?.roles || [])]
      const [draggedRole] = currentRoles.splice(draggedRoleIndex, 1)
      currentRoles.splice(targetIndex, 0, draggedRole)

      updatedPlays[activePlayIndex] = {
        ...updatedPlays[activePlayIndex],
        attributes: {
          ...updatedPlays[activePlayIndex].attributes,
          roles: currentRoles,
        },
      }

      newRoles = currentRoles as Array<string | { role: string; vars?: Record<string, unknown>; enabled?: boolean }>
      return updatedPlays
    })
    setDraggedRoleIndex(null)

    if (collaborationCallbacks?.sendRoleUpdate && newRoles.length > 0) {
      collaborationCallbacks.sendRoleUpdate({ playId, roles: newRoles })
    }
  }

  const handleRoleDragEnd = () => {
    setDraggedRoleIndex(null)
  }

  const handleRoleDropFromPalette = (e: React.DragEvent) => {
    e.preventDefault()
    const roleData = e.dataTransfer.getData('role')
    if (!roleData) return

    try {
      const parsed = JSON.parse(roleData)
      let roleName = ''

      if (parsed.type === 'standalone-role' && parsed.fqrn) {
        roleName = parsed.fqrn
      } else if (parsed.type === 'collection-role' && parsed.fqcn) {
        roleName = parsed.fqcn
      } else if (parsed.type === 'role' && parsed.collection && parsed.role) {
        roleName = `${parsed.collection}.${parsed.role}`
      }

      if (roleName) {
        const playId = currentPlay.id
        setPlays(prevPlays => {
          const updatedPlays = [...prevPlays]
          const currentRoles = updatedPlays[activePlayIndex].attributes?.roles || []
          updatedPlays[activePlayIndex] = {
            ...updatedPlays[activePlayIndex],
            attributes: {
              ...updatedPlays[activePlayIndex].attributes,
              roles: [...currentRoles, roleName],
            },
          }
          return updatedPlays
        })

        if (collaborationCallbacks?.sendRoleAdd) {
          collaborationCallbacks.sendRoleAdd({ playId, role: roleName })
        }
      }
    } catch (error) {
      console.error('Failed to parse role data:', error)
    }
  }

  const handleRoleDropZoneDragOver = (e: React.DragEvent) => {
    const roleData = e.dataTransfer.types.includes('role')
    if (roleData) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  // =====================================================
  // Computed values
  // =====================================================
  const playModule = modules.find(m => m.isPlay)
  const isVariablesOpen = playModule ? !isPlaySectionCollapsed(playModule.id, 'variables', collapsedPlaySections) : false

  // Guard
  if (!currentPlay) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography>Loading...</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Play Tabs */}
      <Box sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2 }}>
          <Tabs
            value={activePlayIndex}
            onChange={(_, newValue) => {
              setActivePlayIndex(newValue)
              onSelectModule(null)
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {plays.map((play, index) => (
              <Tab
                key={play.id}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, py: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PlayArrowIcon sx={{ fontSize: 16 }} />
                      {editingTabIndex === index ? (
                        <TextField
                          autoFocus
                          variant="standard"
                          value={play.name}
                          onChange={(e) => updatePlayName(index, e.target.value)}
                          onBlur={() => setEditingTabIndex(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingTabIndex(null)
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          sx={{
                            '& .MuiInput-input': {
                              fontSize: '0.875rem',
                              padding: '2px 4px',
                              minWidth: '80px',
                            },
                          }}
                        />
                      ) : (
                        <Typography
                          variant="body2"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setEditingTabIndex(index)
                          }}
                          sx={{ cursor: 'text', userSelect: 'none' }}
                        >
                          {play.name}
                        </Typography>
                      )}
                      {plays.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            deletePlay(index)
                          }}
                          sx={{ ml: 0.5, p: 0.25 }}
                        >
                          <CloseIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      )}
                    </Box>
                    <PlayAttributeIcons
                      attributes={play.attributes || {}}
                      size="small"
                    />
                  </Box>
                }
              />
            ))}
          </Tabs>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={addPlay}
            variant="outlined"
            sx={{ ml: 2 }}
          >
            Add Play
          </Button>
          <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
            <Tooltip title="Import diagram (.abd)">
              <IconButton
                size="small"
                onClick={() => setImportDialogOpen(true)}
                sx={{ color: 'text.secondary' }}
              >
                <FileUploadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export diagram">
              <IconButton
                size="small"
                onClick={() => setExportDialogOpen(true)}
                sx={{ color: 'text.secondary' }}
              >
                <FileDownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* PLAY Sections - Workspace Level */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, bgcolor: 'background.paper', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Section 1: Variables (Accordion - always visible) */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Box
            onClick={() => {
              const playModule = modules.find(m => m.isPlay)
              if (playModule) {
                togglePlaySection(playModule.id, 'variables')
              }
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              bgcolor: `${getPlaySectionColor('variables')}15`,
              cursor: 'pointer',
              '&:hover': { bgcolor: `${getPlaySectionColor('variables')}25` },
              position: 'relative',
              zIndex: 3,
            }}
          >
            {(() => {
              const playModule = modules.find(m => m.isPlay)
              const collapsed = playModule ? isPlaySectionCollapsed(playModule.id, 'variables', collapsedPlaySections) : false
              return collapsed ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <ExpandLessIcon sx={{ fontSize: 18 }} />
            })()}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: getPlaySectionColor('variables') }}>
              Variables ({currentPlay.variables.length})
            </Typography>
          </Box>
          {isVariablesOpen && (
            <Box sx={{ px: 3, py: 1.5, bgcolor: `${getPlaySectionColor('variables')}08` }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {currentPlay.variables.map((variable, index) => {
                  const getTypeIcon = (type: VariableType) => {
                    switch (type) {
                      case 'int': return <NumbersIcon fontSize="small" />
                      case 'bool': return <ToggleOnIcon fontSize="small" />
                      case 'list': return <DataArrayIcon fontSize="small" />
                      case 'dict': return <DataObjectIcon fontSize="small" />
                      default: return <TextFieldsIcon fontSize="small" />
                    }
                  }
                  const getTypeColor = (type: VariableType): 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
                    switch (type) {
                      case 'int': return 'secondary'
                      case 'bool': return 'success'
                      case 'list': return 'warning'
                      case 'dict': return 'info'
                      default: return 'primary'
                    }
                  }
                  const tooltipParts = [
                    `Type: ${variable.type || 'string'}`,
                    `Required: ${variable.required ? 'Yes' : 'No'}`,
                  ]
                  if (!variable.required && variable.defaultValue) {
                    tooltipParts.push(`Default: ${variable.defaultValue}`)
                  }
                  if (variable.regexp) {
                    tooltipParts.push(`Pattern: ${variable.regexp}`)
                  }

                  return (
                    <Tooltip key={index} title={tooltipParts.join(' | ')} placement="top">
                      <Chip
                        icon={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 0.5 }}>
                            {getTypeIcon(variable.type || 'string')}
                            {variable.required ? (
                              <CheckCircleIcon sx={{ fontSize: 12, color: 'success.main' }} />
                            ) : (
                              <RadioButtonUncheckedIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                            )}
                          </Box>
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                              {variable.key}
                            </Typography>
                            {variable.value && (
                              <>
                                <Typography variant="body2" component="span" color="text.secondary">:</Typography>
                                <Typography variant="body2" component="span" sx={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {variable.value}
                                </Typography>
                              </>
                            )}
                          </Box>
                        }
                        onClick={() => editVariable(index)}
                        onDelete={() => deleteVariable(index)}
                        color={getTypeColor(variable.type || 'string')}
                        variant="outlined"
                        size="small"
                        sx={{
                          cursor: 'pointer',
                          '& .MuiChip-icon': {
                            marginLeft: '4px',
                            marginRight: '-4px',
                          },
                        }}
                      />
                    </Tooltip>
                  )
                })}
                <Chip
                  label="Add Variable"
                  onClick={addVariable}
                  icon={<AddIcon />}
                  color="primary"
                  variant="filled"
                  sx={{ cursor: 'pointer' }}
                />
              </Box>
            </Box>
          )}
        </Box>

        {/* Tabs Navigation Bar for Roles and Task Sections */}
        <Box sx={{ borderBottom: 2, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Tabs
            value={activeSectionTab}
            onChange={(_e, newValue) => setActiveSectionTab(newValue)}
            variant="fullWidth"
            sx={{
              minHeight: 56,
              '& .MuiTabs-indicator': { height: 3 },
            }}
          >
            {/* Roles Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<ExtensionIcon sx={{ fontSize: 20, color: activeSectionTab === 'roles' ? '#4caf50' : 'rgba(76, 175, 80, 0.65)' }} />}
                  count={currentPlay.attributes?.roles?.length || 0}
                  color="#4caf50"
                  isActive={activeSectionTab === 'roles'}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'roles' ? 'bold' : 'normal', fontSize: '0.85rem' }}>Roles</Typography>}
              iconPosition="start"
              value="roles"
              sx={{
                minHeight: 56, textTransform: 'none', px: 2.5,
                color: activeSectionTab === 'roles' ? '#4caf50' : 'rgba(76, 175, 80, 0.65)',
                bgcolor: activeSectionTab === 'roles' ? 'rgba(76, 175, 80, 0.12)' : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'roles' ? '3px solid #4caf50' : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'roles' ? 'rgba(76, 175, 80, 0.18)' : 'rgba(76, 175, 80, 0.08)',
                  color: '#4caf50',
                },
              }}
            />

            {/* Pre-Tasks Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<SkipPreviousIcon sx={{ fontSize: 20, color: activeSectionTab === 'pre_tasks' ? getPlaySectionColor('pre_tasks') : `${getPlaySectionColor('pre_tasks')}a6` }} />}
                  count={getTaskChainCount('pre_tasks')}
                  color={getPlaySectionColor('pre_tasks')}
                  isActive={activeSectionTab === 'pre_tasks'}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'pre_tasks' ? 'bold' : 'normal', fontSize: '0.85rem' }}>Pre-Tasks</Typography>}
              iconPosition="start"
              value="pre_tasks"
              sx={{
                minHeight: 56, textTransform: 'none', px: 2.5,
                color: activeSectionTab === 'pre_tasks' ? getPlaySectionColor('pre_tasks') : `${getPlaySectionColor('pre_tasks')}a6`,
                bgcolor: activeSectionTab === 'pre_tasks' ? `${getPlaySectionColor('pre_tasks')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'pre_tasks' ? `3px solid ${getPlaySectionColor('pre_tasks')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'pre_tasks' ? `${getPlaySectionColor('pre_tasks')}20` : `${getPlaySectionColor('pre_tasks')}08`,
                  color: getPlaySectionColor('pre_tasks'),
                },
              }}
            />

            {/* Tasks Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<PlaylistPlayIcon sx={{ fontSize: 20, color: activeSectionTab === 'tasks' ? getPlaySectionColor('tasks') : `${getPlaySectionColor('tasks')}a6` }} />}
                  count={getTaskChainCount('tasks')}
                  color={getPlaySectionColor('tasks')}
                  isActive={activeSectionTab === 'tasks'}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'tasks' ? 'bold' : 'normal', fontSize: '0.85rem' }}>Tasks</Typography>}
              iconPosition="start"
              value="tasks"
              sx={{
                minHeight: 56, textTransform: 'none', px: 2.5,
                color: activeSectionTab === 'tasks' ? getPlaySectionColor('tasks') : `${getPlaySectionColor('tasks')}a6`,
                bgcolor: activeSectionTab === 'tasks' ? `${getPlaySectionColor('tasks')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'tasks' ? `3px solid ${getPlaySectionColor('tasks')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'tasks' ? `${getPlaySectionColor('tasks')}20` : `${getPlaySectionColor('tasks')}08`,
                  color: getPlaySectionColor('tasks'),
                },
              }}
            />

            {/* Post-Tasks Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<SkipNextIcon sx={{ fontSize: 20, color: activeSectionTab === 'post_tasks' ? getPlaySectionColor('post_tasks') : `${getPlaySectionColor('post_tasks')}a6` }} />}
                  count={getTaskChainCount('post_tasks')}
                  color={getPlaySectionColor('post_tasks')}
                  isActive={activeSectionTab === 'post_tasks'}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'post_tasks' ? 'bold' : 'normal', fontSize: '0.85rem' }}>Post-Tasks</Typography>}
              iconPosition="start"
              value="post_tasks"
              sx={{
                minHeight: 56, textTransform: 'none', px: 2.5,
                color: activeSectionTab === 'post_tasks' ? getPlaySectionColor('post_tasks') : `${getPlaySectionColor('post_tasks')}a6`,
                bgcolor: activeSectionTab === 'post_tasks' ? `${getPlaySectionColor('post_tasks')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'post_tasks' ? `3px solid ${getPlaySectionColor('post_tasks')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'post_tasks' ? `${getPlaySectionColor('post_tasks')}20` : `${getPlaySectionColor('post_tasks')}08`,
                  color: getPlaySectionColor('post_tasks'),
                },
              }}
            />

            {/* Handlers Tab */}
            <Tab
              icon={
                <TabIconBadge
                  icon={<NotificationsActiveIcon sx={{ fontSize: 20, color: activeSectionTab === 'handlers' ? getPlaySectionColor('handlers') : `${getPlaySectionColor('handlers')}a6` }} />}
                  count={getTaskChainCount('handlers')}
                  color={getPlaySectionColor('handlers')}
                  isActive={activeSectionTab === 'handlers'}
                />
              }
              label={<Typography variant="body2" sx={{ fontWeight: activeSectionTab === 'handlers' ? 'bold' : 'normal', fontSize: '0.85rem' }}>Handlers</Typography>}
              iconPosition="start"
              value="handlers"
              sx={{
                minHeight: 56, textTransform: 'none', px: 2.5,
                color: activeSectionTab === 'handlers' ? getPlaySectionColor('handlers') : `${getPlaySectionColor('handlers')}a6`,
                bgcolor: activeSectionTab === 'handlers' ? `${getPlaySectionColor('handlers')}15` : 'transparent',
                transition: 'all 0.3s ease',
                borderBottom: activeSectionTab === 'handlers' ? `3px solid ${getPlaySectionColor('handlers')}` : 'none',
                '&:hover': {
                  bgcolor: activeSectionTab === 'handlers' ? `${getPlaySectionColor('handlers')}20` : `${getPlaySectionColor('handlers')}08`,
                  color: getPlaySectionColor('handlers'),
                },
              }}
            />
          </Tabs>
        </Box>

        {/* Tab Content: Roles */}
        {activeSectionTab === 'roles' && (
          <Box
            sx={{
              flex: 1, px: 3, py: 2, bgcolor: '#4caf5008', overflow: 'auto',
              border: '2px dashed transparent', transition: 'border-color 0.2s',
              '&:hover': { borderColor: 'rgba(76, 175, 80, 0.3)' },
            }}
            onDrop={handleRoleDropFromPalette}
            onDragOver={handleRoleDropZoneDragOver}
          >
            {(currentPlay.attributes?.roles || []).length === 0 && (
              <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Drag roles from the Roles panel to add them here
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
              {(currentPlay.attributes?.roles || []).map((role, index) => {
                const roleLabel = typeof role === 'string' ? role : role.role
                const roleVars = typeof role === 'string' ? undefined : role.vars
                const isEnabled = typeof role === 'string' ? true : ((role as { enabled?: boolean }).enabled !== false)
                const isSelected = selectedRoleIndex === index
                return (
                  <Chip
                    key={`${roleLabel}-${index}`}
                    avatar={
                      <Tooltip title={isEnabled ? 'Désactiver ce rôle' : 'Activer ce rôle'}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRoleEnabled(index)
                          }}
                          sx={{
                            p: 0, ml: 0.5, width: 20, height: 20, minWidth: 20,
                            color: isEnabled ? '#4caf50' : '#bdbdbd',
                            '&:hover': { bgcolor: 'transparent', color: isEnabled ? '#388e3c' : '#9e9e9e' },
                          }}
                        >
                          {isEnabled ? <VisibilityIcon sx={{ fontSize: 16 }} /> : <VisibilityOffIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Tooltip>
                    }
                    label={roleLabel}
                    size="small"
                    onClick={() => {
                      if (onSelectRole) {
                        onSelectRole(isSelected ? null : { index, role: roleLabel, vars: roleVars })
                      }
                    }}
                    onDelete={() => {
                      deleteRole(index)
                      if (isSelected && onSelectRole) {
                        onSelectRole(null)
                      }
                    }}
                    color={isSelected ? 'primary' : (isEnabled ? 'success' : 'default')}
                    variant={isSelected ? 'filled' : 'outlined'}
                    draggable
                    onDragStart={(e) => handleRoleDragStart(index, e)}
                    onDragOver={(e) => handleRoleDragOver(index, e)}
                    onDrop={(e) => handleRoleDrop(index, e)}
                    onDragEnd={handleRoleDragEnd}
                    sx={{
                      cursor: 'pointer',
                      opacity: draggedRoleIndex === index ? 0.5 : (isEnabled ? 1 : 0.6),
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: 2 },
                      maxWidth: 300,
                      '& .MuiChip-label': {
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        textDecoration: isEnabled ? 'none' : 'line-through',
                        color: isEnabled ? 'inherit' : '#9e9e9e',
                      },
                      '& .MuiChip-avatar': { ml: 0, mr: -0.5 },
                      ...(isSelected && { boxShadow: 3, transform: 'scale(1.05)' }),
                      ...(!isEnabled && { borderColor: '#bdbdbd', bgcolor: 'rgba(0,0,0,0.04)' }),
                    }}
                  />
                )
              })}
            </Box>
          </Box>
        )}

        {/* Tab Content: Canvas sections */}
        {activeSectionTab === 'pre_tasks' && (
          <VisualCanvas sectionName="pre_tasks" collaborationCallbacks={collaborationCallbacks} />
        )}
        {activeSectionTab === 'tasks' && (
          <VisualCanvas sectionName="tasks" collaborationCallbacks={collaborationCallbacks} />
        )}
        {activeSectionTab === 'post_tasks' && (
          <VisualCanvas sectionName="post_tasks" collaborationCallbacks={collaborationCallbacks} />
        )}
        {activeSectionTab === 'handlers' && (
          <VisualCanvas sectionName="handlers" collaborationCallbacks={collaborationCallbacks} />
        )}
      </Box>

      {/* Add/Edit Variable Dialog */}
      <AddVariableDialog
        open={addVariableDialogOpen}
        onClose={() => {
          setAddVariableDialogOpen(false)
          setEditingVariableIndex(null)
        }}
        onAdd={handleAddVariableFromDialog}
        existingKeys={currentPlay.variables.map(v => v.key)}
        editVariable={editingVariableIndex !== null ? currentPlay.variables[editingVariableIndex] : undefined}
      />

      {/* Export Diagram Dialog */}
      <ExportDiagramDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        plays={plays}
        playbookName={playbookName}
        playbookId={currentPlaybookId || undefined}
        collapsedBlocks={Array.from(collapsedBlocks)}
        collapsedBlockSections={Array.from(collapsedBlockSections)}
        collapsedPlaySections={Array.from(collapsedPlaySections)}
        activePlayIndex={activePlayIndex}
      />

      {/* Import Diagram Dialog */}
      <ImportDiagramDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportDiagram}
      />
    </Box>
  )
}

export default WorkZone
