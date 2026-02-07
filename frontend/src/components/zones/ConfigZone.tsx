import { Box, Typography, TextField, Paper, Divider, Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip, Button, Checkbox, FormControlLabel, Chip, Alert, CircularProgress, MenuItem, FormControl, InputLabel, Select, InputAdornment, Autocomplete, OutlinedInput } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AssignmentIcon from '@mui/icons-material/Assignment'
import ExtensionIcon from '@mui/icons-material/Extension'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import LockIcon from '@mui/icons-material/Lock'
// Type icons
import TextFieldsIcon from '@mui/icons-material/TextFields'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import NumbersIcon from '@mui/icons-material/Numbers'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import DataObjectIcon from '@mui/icons-material/DataObject'
import FolderIcon from '@mui/icons-material/Folder'
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'
import { PlayAttributes, ModuleSchema, ModuleParameter } from '../../types/playbook'
import { useState, useEffect, useRef } from 'react'
import { galaxyModuleSchemaService } from '../../services/galaxyModuleSchemaService'
import { moduleConfigs } from '../../constants/moduleConfigs'

// Collaboration callback type for config updates
export interface CollaborationConfigCallback {
  sendModuleConfig?: (data: { moduleId: string; field: string; value: unknown; element_id?: string }) => void
  sendPlayUpdate?: (data: { playId: string; field: string; value: unknown }) => void
}

interface ConfigZoneProps {
  selectedModule?: {
    id: string
    name: string
    collection: string
    taskName: string
    when?: string
    ignoreErrors?: boolean
    become?: boolean
    loop?: string
    delegateTo?: string
    tags?: string[]
    isBlock?: boolean
    isPlay?: boolean
    isSystem?: boolean
    moduleParameters?: Record<string, any>
    moduleSchema?: ModuleSchema
    validationState?: {
      isValid: boolean
      errors: string[]
      warnings: string[]
      lastValidated?: Date
    }
    description?: string
  } | null
  onCollapse?: () => void
  onDelete?: (id: string) => void
  onUpdateModule?: (id: string, updates: Partial<{
    taskName?: string
    when?: string
    ignoreErrors?: boolean
    become?: boolean
    loop?: string
    delegateTo?: string
    tags?: string[]
    moduleParameters?: Record<string, any>
    moduleSchema?: ModuleSchema
    validationState?: {
      isValid: boolean
      errors: string[]
      warnings: string[]
      lastValidated?: Date
    }
  }>) => void
  playAttributes?: PlayAttributes
  onUpdatePlay?: (updates: Partial<PlayAttributes>) => void
  // Collaboration callbacks for real-time sync
  collaborationCallbacks?: CollaborationConfigCallback
  activePlayId?: string // For play update collaboration
  // Role configuration
  selectedRole?: {
    index: number
    role: string
    vars?: Record<string, any>
  } | null
  onUpdateRole?: (index: number, updates: { role?: string; vars?: Record<string, any> }) => void
}

/**
 * Get icon component for parameter type
 */
const getTypeIcon = (type: string) => {
  const iconProps = { sx: { fontSize: 18, color: 'text.secondary', mr: 0.5 } }

  switch (type?.toLowerCase()) {
    case 'bool':
    case 'boolean':
      return <Tooltip title="Boolean"><ToggleOnIcon {...iconProps} sx={{ ...iconProps.sx, color: '#9c27b0' }} /></Tooltip>
    case 'int':
    case 'integer':
    case 'float':
      return <Tooltip title="Number"><NumbersIcon {...iconProps} sx={{ ...iconProps.sx, color: '#2196f3' }} /></Tooltip>
    case 'list':
    case 'array':
      return <Tooltip title="List"><FormatListBulletedIcon {...iconProps} sx={{ ...iconProps.sx, color: '#ff9800' }} /></Tooltip>
    case 'dict':
    case 'dictionary':
    case 'object':
      return <Tooltip title="Dictionary"><DataObjectIcon {...iconProps} sx={{ ...iconProps.sx, color: '#4caf50' }} /></Tooltip>
    case 'path':
      return <Tooltip title="Path"><FolderIcon {...iconProps} sx={{ ...iconProps.sx, color: '#795548' }} /></Tooltip>
    case 'raw':
    case 'any':
      return <Tooltip title="Any"><AllInclusiveIcon {...iconProps} sx={{ ...iconProps.sx, color: '#607d8b' }} /></Tooltip>
    case 'str':
    case 'string':
    default:
      return <Tooltip title="String"><TextFieldsIcon {...iconProps} sx={{ ...iconProps.sx, color: '#00bcd4' }} /></Tooltip>
  }
}

/**
 * Role Configuration Section Component
 */
interface RoleConfigSectionProps {
  selectedRole: {
    index: number
    role: string
    vars?: Record<string, any>
  }
  onUpdateRole?: (index: number, updates: { role?: string; vars?: Record<string, any> }) => void
}

const RoleConfigSection = ({ selectedRole, onUpdateRole }: RoleConfigSectionProps) => {
  const [localVars, setLocalVars] = useState<Record<string, any>>(selectedRole.vars || {})
  const [newVarName, setNewVarName] = useState('')
  const [newVarValue, setNewVarValue] = useState('')

  // Sync local vars when selectedRole changes
  useEffect(() => {
    setLocalVars(selectedRole.vars || {})
  }, [selectedRole.index, selectedRole.vars])

  const handleAddVariable = () => {
    if (!newVarName.trim()) return

    let parsedValue: any = newVarValue
    // Try to parse JSON values
    try {
      parsedValue = JSON.parse(newVarValue)
    } catch {
      // Keep as string if not valid JSON
    }

    const updatedVars = { ...localVars, [newVarName.trim()]: parsedValue }
    setLocalVars(updatedVars)
    onUpdateRole?.(selectedRole.index, { vars: updatedVars })
    setNewVarName('')
    setNewVarValue('')
  }

  const handleRemoveVariable = (varName: string) => {
    const updatedVars = { ...localVars }
    delete updatedVars[varName]
    setLocalVars(updatedVars)
    onUpdateRole?.(selectedRole.index, { vars: updatedVars })
  }

  const handleUpdateVariable = (varName: string, value: string) => {
    let parsedValue: any = value
    try {
      parsedValue = JSON.parse(value)
    } catch {
      // Keep as string
    }

    const updatedVars = { ...localVars, [varName]: parsedValue }
    setLocalVars(updatedVars)
    onUpdateRole?.(selectedRole.index, { vars: updatedVars })
  }

  return (
    <Box sx={{ p: 2 }}>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssignmentIcon sx={{ color: '#4caf50', fontSize: 18 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              Role: {selectedRole.role}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Existing variables */}
            {Object.entries(localVars).length > 0 ? (
              Object.entries(localVars).map(([varName, varValue]) => (
                <Box key={varName} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    label={varName}
                    fullWidth
                    size="small"
                    multiline={typeof varValue === 'object'}
                    rows={typeof varValue === 'object' ? 3 : 1}
                    value={typeof varValue === 'object' ? JSON.stringify(varValue, null, 2) : String(varValue)}
                    onChange={(e) => handleUpdateVariable(varName, e.target.value)}
                  />
                  <Tooltip title="Remove variable">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveVariable(varName)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))
            ) : (
              <Alert severity="info" sx={{ mb: 1 }}>
                No variables defined for this role. Add variables below.
              </Alert>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Add new variable */}
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
              Add Variable
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Variable name"
                size="small"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                sx={{ flex: 1 }}
                placeholder="my_variable"
              />
              <TextField
                label="Value"
                size="small"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                sx={{ flex: 2 }}
                placeholder="value or JSON"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddVariable()
                  }
                }}
              />
              <Tooltip title="Add variable">
                <IconButton
                  color="primary"
                  onClick={handleAddVariable}
                  disabled={!newVarName.trim()}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Tip: For complex values (lists, dicts), enter valid JSON (e.g., ["item1", "item2"] or {`{"key": "value"}`})
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}

const ConfigZone = ({ selectedModule, onCollapse, onDelete, onUpdateModule, playAttributes, onUpdatePlay, collaborationCallbacks, activePlayId, selectedRole, onUpdateRole }: ConfigZoneProps) => {
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)
  const [schemaError, setSchemaError] = useState<string | null>(null)
  const [moduleParameters, setModuleParameters] = useState<Record<string, any>>({})

  // Local state for immediate UI feedback (task attributes)
  const [localTaskName, setLocalTaskName] = useState('')
  const [localWhen, setLocalWhen] = useState('')
  const [localLoop, setLocalLoop] = useState('')
  const [localTags, setLocalTags] = useState('')
  const [localDelegateTo, setLocalDelegateTo] = useState('')
  const [localIgnoreErrors, setLocalIgnoreErrors] = useState(false)
  const [localTaskBecome, setLocalTaskBecome] = useState(false)

  // Local state for PLAY attributes
  const [localHosts, setLocalHosts] = useState('')
  const [localRemoteUser, setLocalRemoteUser] = useState('')
  const [localConnection, setLocalConnection] = useState('')
  const [localGatherFacts, setLocalGatherFacts] = useState(true)
  const [localBecome, setLocalBecome] = useState(false)

  // Track current module ID to detect module changes
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null)

  // Track if we're showing PLAY config (selectedModule is null)
  const [showingPlayConfig, setShowingPlayConfig] = useState(false)

  // Debounce timer refs - must be declared before useEffects that reference them
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Legacy static config for modules without Galaxy schemas
  const moduleConfig = selectedModule ? moduleConfigs[selectedModule.name] || [] : []

  // Initialize local state ONLY when module ID changes (not on every prop update)
  useEffect(() => {
    if (selectedModule?.id !== currentModuleId) {
      setCurrentModuleId(selectedModule?.id || null)
      setModuleParameters(selectedModule?.moduleParameters || {})
      setLocalTaskName(selectedModule?.taskName || '')
      setLocalWhen(selectedModule?.when || '')
      setLocalLoop(selectedModule?.loop || '')
      setLocalTags(selectedModule?.tags?.join(', ') || '')
      setLocalDelegateTo(selectedModule?.delegateTo || '')
      setLocalIgnoreErrors(selectedModule?.ignoreErrors || false)
      setLocalTaskBecome(selectedModule?.become || false)
    }
  }, [selectedModule?.id, currentModuleId])

  // Sync local state when module properties change from collaboration updates
  // Only sync if no debounce timer is active (user is not typing)
  useEffect(() => {
    if (!selectedModule || selectedModule.id !== currentModuleId) return
    // Only sync if user is not actively editing (no debounce timer)
    if (debounceTimerRef.current) return

    // Sync each field if different from local state
    if (selectedModule.taskName !== undefined && selectedModule.taskName !== localTaskName) {
      setLocalTaskName(selectedModule.taskName || '')
    }
    if (selectedModule.when !== undefined && selectedModule.when !== localWhen) {
      setLocalWhen(selectedModule.when || '')
    }
    if (selectedModule.loop !== undefined && selectedModule.loop !== localLoop) {
      setLocalLoop(selectedModule.loop || '')
    }
    const tagsStr = selectedModule.tags?.join(', ') || ''
    if (tagsStr !== localTags) {
      setLocalTags(tagsStr)
    }
    if (selectedModule.delegateTo !== undefined && selectedModule.delegateTo !== localDelegateTo) {
      setLocalDelegateTo(selectedModule.delegateTo || '')
    }
    if (selectedModule.ignoreErrors !== localIgnoreErrors) {
      setLocalIgnoreErrors(selectedModule.ignoreErrors || false)
    }
    if (selectedModule.become !== localTaskBecome) {
      setLocalTaskBecome(selectedModule.become || false)
    }
    // Sync moduleParameters
    if (JSON.stringify(selectedModule.moduleParameters) !== JSON.stringify(moduleParameters)) {
      setModuleParameters(selectedModule.moduleParameters || {})
    }
  }, [selectedModule, currentModuleId])

  // Initialize PLAY local state when switching to PLAY config
  useEffect(() => {
    const isNowShowingPlay = !selectedModule
    if (isNowShowingPlay !== showingPlayConfig) {
      setShowingPlayConfig(isNowShowingPlay)
      if (isNowShowingPlay) {
        // Switching to PLAY config - initialize from props
        setLocalHosts(playAttributes?.hosts || '')
        setLocalRemoteUser(playAttributes?.remoteUser || '')
        setLocalConnection(playAttributes?.connection || '')
        setLocalGatherFacts(playAttributes?.gatherFacts !== false)
        setLocalBecome(playAttributes?.become || false)
      }
    }
  }, [selectedModule, showingPlayConfig, playAttributes])

  // Sync PLAY local state when playAttributes change from collaboration updates
  // Only sync if user is not actively editing (no debounce timer)
  useEffect(() => {
    if (!showingPlayConfig || !playAttributes) return
    // Only sync if user is not actively editing
    if (playDebounceTimerRef.current) return

    if (playAttributes.hosts !== undefined && playAttributes.hosts !== localHosts) {
      setLocalHosts(playAttributes.hosts || '')
    }
    if (playAttributes.remoteUser !== undefined && playAttributes.remoteUser !== localRemoteUser) {
      setLocalRemoteUser(playAttributes.remoteUser || '')
    }
    if (playAttributes.connection !== undefined && playAttributes.connection !== localConnection) {
      setLocalConnection(playAttributes.connection || '')
    }
    if (playAttributes.gatherFacts !== undefined && playAttributes.gatherFacts !== localGatherFacts) {
      setLocalGatherFacts(playAttributes.gatherFacts !== false)
    }
    if (playAttributes.become !== undefined && playAttributes.become !== localBecome) {
      setLocalBecome(playAttributes.become || false)
    }
  }, [playAttributes, showingPlayConfig])

  // Debounced update for module - only propagate after user stops typing
  const debouncedUpdate = (updates: Parameters<NonNullable<typeof onUpdateModule>>[1], field?: string) => {
    if (!selectedModule) return

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer - update parent after 300ms of no typing
    debounceTimerRef.current = setTimeout(() => {
      onUpdateModule?.(selectedModule.id, updates)
      // Send collaboration update for module config change
      if (field) {
        // Get value from moduleParameters or from direct updates
        const value = updates.moduleParameters
          ? updates.moduleParameters[field]
          : (updates as Record<string, unknown>)[field]
        console.log('[ConfigZone] Sending module config update:', field, value)
        collaborationCallbacks?.sendModuleConfig?.({
          moduleId: selectedModule.id,
          field,
          value,
          element_id: selectedModule.id
        })
      }
    }, 300)
  }

  // Debounced update for PLAY attributes
  const debouncedPlayUpdate = (updates: Partial<PlayAttributes>, field?: string) => {
    // Clear previous timer
    if (playDebounceTimerRef.current) {
      clearTimeout(playDebounceTimerRef.current)
    }

    // Set new timer - update parent after 300ms of no typing
    playDebounceTimerRef.current = setTimeout(() => {
      onUpdatePlay?.(updates)
      // Send collaboration update for play attribute change
      if (field && activePlayId) {
        const value = updates[field as keyof PlayAttributes]
        collaborationCallbacks?.sendPlayUpdate?.({
          playId: activePlayId,
          field,
          value
        })
      }
    }, 300)
  }

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (playDebounceTimerRef.current) {
        clearTimeout(playDebounceTimerRef.current)
      }
    }
  }, [])

  // Load schema for selected module if not already loaded
  useEffect(() => {
    if (selectedModule && !selectedModule.isBlock && !selectedModule.isPlay && !selectedModule.moduleSchema) {
      loadModuleSchema()
    }
  }, [selectedModule?.id, selectedModule?.collection, selectedModule?.name])
  
  const loadModuleSchema = async () => {
    if (!selectedModule || selectedModule.isBlock || selectedModule.isPlay) return
    
    setIsLoadingSchema(true)
    setSchemaError(null)
    
    try {
      console.log(`Loading schema for ${selectedModule.collection}.${selectedModule.name}`)
      
      // Parse collection name (e.g., "community.general")
      const parsed = galaxyModuleSchemaService.parseModuleName(`${selectedModule.collection}.${selectedModule.name}`)
      if (!parsed) {
        throw new Error(`Invalid module name format: ${selectedModule.collection}.${selectedModule.name}`)
      }
      
      const schema = await galaxyModuleSchemaService.getModuleSchema(
        parsed.namespace,
        parsed.collection,
        parsed.module,
        'latest'
      )
      
      if (schema) {
        console.log(`Schema loaded for ${schema.module_name}: ${schema.parameter_count} parameters`)
        
        // Update module with schema and validation
        const validation = galaxyModuleSchemaService.validateParameters(moduleParameters, schema)
        
        onUpdateModule?.(selectedModule.id, {
          moduleSchema: schema,
          validationState: {
            isValid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
            lastValidated: new Date()
          }
        })
      } else {
        console.log(`No schema found for ${selectedModule.collection}.${selectedModule.name}`)
      }
    } catch (error: any) {
      console.error('Error loading module schema:', error)
      setSchemaError(error.message || 'Failed to load module schema')
    } finally {
      setIsLoadingSchema(false)
    }
  }
  
  const handleParameterChange = (paramName: string, value: any) => {
    // Update local state immediately for responsive UI
    const updatedParams = { ...moduleParameters, [paramName]: value }
    setModuleParameters(updatedParams)

    // Validate if schema is available
    let validationState
    if (selectedModule?.moduleSchema) {
      const validation = galaxyModuleSchemaService.validateParameters(updatedParams, selectedModule.moduleSchema)
      validationState = {
        isValid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        lastValidated: new Date()
      }
    }

    // Debounced update to parent (pass paramName for collaboration sync)
    debouncedUpdate({
      moduleParameters: updatedParams,
      validationState
    }, paramName)
  }

  // Handlers for task attributes with immediate local state + debounced parent update
  const handleTaskNameChange = (value: string) => {
    setLocalTaskName(value)
    debouncedUpdate({ taskName: value }, 'taskName')
  }

  const handleWhenChange = (value: string) => {
    setLocalWhen(value)
    debouncedUpdate({ when: value || undefined }, 'when')
  }

  const handleLoopChange = (value: string) => {
    setLocalLoop(value)
    debouncedUpdate({ loop: value || undefined }, 'loop')
  }

  const handleTagsChange = (value: string) => {
    setLocalTags(value)
    const tags = value ? value.split(',').map(t => t.trim()).filter(t => t) : undefined
    debouncedUpdate({ tags }, 'tags')
  }

  const handleDelegateToChange = (value: string) => {
    setLocalDelegateTo(value)
    debouncedUpdate({ delegateTo: value || undefined }, 'delegateTo')
  }

  const handleIgnoreErrorsChange = (checked: boolean) => {
    setLocalIgnoreErrors(checked)
    debouncedUpdate({ ignoreErrors: checked }, 'ignoreErrors')
  }

  const handleTaskBecomeChange = (checked: boolean) => {
    setLocalTaskBecome(checked)
    debouncedUpdate({ become: checked }, 'become')
  }

  // Handlers for PLAY attributes with immediate local state + debounced parent update
  const handleHostsChange = (value: string) => {
    setLocalHosts(value)
    debouncedPlayUpdate({ hosts: value || undefined }, 'hosts')
  }

  const handleRemoteUserChange = (value: string) => {
    setLocalRemoteUser(value)
    debouncedPlayUpdate({ remoteUser: value || undefined }, 'remoteUser')
  }

  const handleConnectionChange = (value: string) => {
    setLocalConnection(value)
    debouncedPlayUpdate({ connection: value || undefined }, 'connection')
  }

  const handleGatherFactsChange = (checked: boolean) => {
    setLocalGatherFacts(checked)
    debouncedPlayUpdate({ gatherFacts: checked }, 'gatherFacts')
  }

  const handleBecomeChange = (checked: boolean) => {
    setLocalBecome(checked)
    debouncedPlayUpdate({ become: checked }, 'become')
  }
  
  const renderParameterField = (param: ModuleParameter) => {
    const currentValue = moduleParameters[param.name] || param.default
    const typeIcon = getTypeIcon(param.type)

    const paramType = param.type?.toLowerCase()

    switch (paramType) {
      case 'bool':
      case 'boolean':
        return (
          <FormControlLabel
            key={param.name}
            control={
              <Checkbox
                checked={currentValue === true || currentValue === 'yes' || currentValue === 'true'}
                onChange={(e) => handleParameterChange(param.name, e.target.checked)}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {typeIcon}
                <Typography variant="body2">
                  {param.name}{param.required && ' *'}
                </Typography>
                <Tooltip title={param.description} placement="right">
                  <HelpOutlineIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
              </Box>
            }
          />
        )

      case 'int':
      case 'integer':
      case 'float':
        return (
          <TextField
            key={param.name}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {typeIcon}
                <span>{param.name}{param.required ? ' *' : ''}</span>
              </Box>
            }
            fullWidth
            size="small"
            type="number"
            value={currentValue || ''}
            onChange={(e) => handleParameterChange(param.name, param.type === 'int' ? parseInt(e.target.value) || undefined : parseFloat(e.target.value) || undefined)}
            error={selectedModule?.validationState?.errors?.some(err => err.includes(param.name))}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={param.description} placement="left">
                    <HelpOutlineIcon sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
                  </Tooltip>
                </InputAdornment>
              )
            }}
            InputLabelProps={{ sx: { display: 'flex', alignItems: 'center' } }}
          />
        )

      case 'list':
      case 'array':
        // List with predefined choices: multi-select dropdown
        if (param.choices && param.choices.length > 0) {
          const selectedValues = Array.isArray(currentValue) ? currentValue : (currentValue ? [currentValue] : [])
          return (
            <FormControl key={param.name} fullWidth size="small">
              <InputLabel sx={{ display: 'flex', alignItems: 'center' }}>
                {typeIcon}
                <span>{param.name}{param.required && ' *'}</span>
              </InputLabel>
              <Select
                multiple
                value={selectedValues}
                onChange={(e) => {
                  const value = e.target.value as string[]
                  handleParameterChange(param.name, value.length > 0 ? value : undefined)
                }}
                input={<OutlinedInput label={param.name + (param.required ? ' *' : '')} />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as string[]).map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
                error={selectedModule?.validationState?.errors?.some(err => err.includes(param.name))}
                endAdornment={
                  <InputAdornment position="end" sx={{ mr: 2 }}>
                    <Tooltip title={param.description} placement="left">
                      <HelpOutlineIcon sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
                    </Tooltip>
                  </InputAdornment>
                }
              >
                {param.choices.map((choice) => (
                  <MenuItem key={choice} value={choice}>
                    <Checkbox checked={selectedValues.includes(choice)} size="small" />
                    {choice}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )
        }

        // List without choices: Autocomplete with free input
        const listValues = Array.isArray(currentValue) ? currentValue : (currentValue ? [currentValue] : [])
        return (
          <Autocomplete
            key={param.name}
            multiple
            freeSolo
            options={[]}
            value={listValues}
            onChange={(_, newValue) => {
              handleParameterChange(param.name, newValue.length > 0 ? newValue : undefined)
            }}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  label={option}
                  size="small"
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {typeIcon}
                    <span>{param.name}{param.required ? ' *' : ''}</span>
                  </Box>
                }
                size="small"
                placeholder="Tapez et appuyez Entrée"
                error={selectedModule?.validationState?.errors?.some(err => err.includes(param.name))}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {params.InputProps.endAdornment}
                      <Tooltip title={param.description} placement="left">
                        <HelpOutlineIcon sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
                      </Tooltip>
                    </>
                  )
                }}
                InputLabelProps={{ sx: { display: 'flex', alignItems: 'center' } }}
              />
            )}
          />
        )

      default:
        // String, path, any - with choices support
        if (param.choices && param.choices.length > 0) {
          return (
            <FormControl key={param.name} fullWidth size="small">
              <InputLabel sx={{ display: 'flex', alignItems: 'center' }}>
                {typeIcon}
                <span>{param.name}{param.required && ' *'}</span>
              </InputLabel>
              <Select
                value={currentValue || ''}
                label={param.name + (param.required ? ' *' : '')}
                onChange={(e) => handleParameterChange(param.name, e.target.value || undefined)}
                error={selectedModule?.validationState?.errors?.some(err => err.includes(param.name))}
                endAdornment={
                  <InputAdornment position="end" sx={{ mr: 2 }}>
                    <Tooltip title={param.description} placement="left">
                      <HelpOutlineIcon sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
                    </Tooltip>
                  </InputAdornment>
                }
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {param.choices.map((choice) => (
                  <MenuItem key={choice} value={choice}>
                    {choice}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )
        }

        return (
          <TextField
            key={param.name}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {typeIcon}
                <span>{param.name}{param.required ? ' *' : ''}</span>
              </Box>
            }
            fullWidth
            size="small"
            value={currentValue || ''}
            onChange={(e) => handleParameterChange(param.name, e.target.value || undefined)}
            error={selectedModule?.validationState?.errors?.some(err => err.includes(param.name))}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={param.description} placement="left">
                    <HelpOutlineIcon sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
                  </Tooltip>
                </InputAdornment>
              )
            }}
            InputLabelProps={{ sx: { display: 'flex', alignItems: 'center' } }}
          />
        )
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Configuration
            </Typography>
          </Box>
          {onCollapse && (
            <Tooltip title="Hide Configuration">
              <IconButton size="small" onClick={onCollapse}>
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {selectedRole ? 'Configure role variables' : selectedModule ? 'Configure the selected task' : 'Configure the current PLAY'}
        </Typography>

        {/* Bouton de suppression - pas pour les tâches START ni système */}
        {selectedModule && onDelete && !selectedModule.isPlay && !selectedModule.isSystem && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              fullWidth
              startIcon={<DeleteIcon />}
              onClick={() => onDelete(selectedModule.id)}
            >
              Delete Task
            </Button>
          </Box>
        )}

        {/* System lock indicator */}
        {selectedModule?.isSystem && (
          <Alert
            severity="info"
            icon={<LockIcon />}
            sx={{ mt: 2 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              Élément système verrouillé
            </Typography>
            <Typography variant="caption">
              Cet élément est généré automatiquement et ne peut pas être modifié.
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Config Form */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {selectedRole ? (
          /* Role Configuration */
          <RoleConfigSection
            selectedRole={selectedRole}
            onUpdateRole={onUpdateRole}
          />
        ) : !selectedModule ? (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PlayArrowIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  PLAY Configuration
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="hosts"
                  fullWidth
                  size="small"
                  placeholder="all"
                  helperText="Target hosts pattern (e.g., all, webservers, db*)"
                  value={localHosts}
                  onChange={(e) => handleHostsChange(e.target.value)}
                />

                <TextField
                  label="remote_user"
                  fullWidth
                  size="small"
                  placeholder="root"
                  helperText="SSH user for connection"
                  value={localRemoteUser}
                  onChange={(e) => handleRemoteUserChange(e.target.value)}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={localGatherFacts}
                      onChange={(e) => handleGatherFactsChange(e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">gather_facts</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Collect system facts before executing tasks
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={localBecome}
                      onChange={(e) => handleBecomeChange(e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">become</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Privilege escalation (sudo)
                      </Typography>
                    </Box>
                  }
                />

                <TextField
                  label="connection"
                  fullWidth
                  size="small"
                  placeholder="ssh"
                  helperText="Connection type (ssh, local, docker, etc.)"
                  value={localConnection}
                  onChange={(e) => handleConnectionChange(e.target.value)}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        ) : selectedModule.isSystem ? (
          /* Read-only view for system modules */
          <Box sx={{ p: 2 }}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LockIcon sx={{ color: '#757575', fontSize: 18 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#757575' }}>
                    Détails (lecture seule)
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Nom</Typography>
                    <Typography variant="body2">{selectedModule.taskName}</Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Module</Typography>
                    <Typography variant="body2">{selectedModule.collection}.{selectedModule.name}</Typography>
                  </Box>
                  {selectedModule.description && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Description</Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{selectedModule.description}</Typography>
                      </Box>
                    </>
                  )}
                  {selectedModule.moduleParameters && Object.keys(selectedModule.moduleParameters).length > 0 && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Paramètres</Typography>
                        {Object.entries(selectedModule.moduleParameters).map(([key, value]) => (
                          <Box key={key} sx={{ ml: 1, mt: 0.5 }}>
                            <Typography variant="body2">
                              <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                  {selectedModule.tags && selectedModule.tags.length > 0 && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="caption" color="text.secondary">Tags</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {selectedModule.tags.map(tag => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    </>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        ) : (
          <>
            {/* Section 1: Attributs de la Tâche */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Task Attributes
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="name"
                    fullWidth
                    size="small"
                    value={localTaskName}
                    helperText="Task name (displayed in playbook)"
                    onChange={(e) => handleTaskNameChange(e.target.value)}
                  />

                  <TextField
                    label="when"
                    fullWidth
                    size="small"
                    placeholder="ansible_os_family == 'Debian'"
                    helperText="Conditional execution"
                    value={localWhen}
                    onChange={(e) => handleWhenChange(e.target.value)}
                  />

                  {/* Loop - SEULEMENT pour les tâches, pas les blocks */}
                  {!selectedModule.isBlock && !selectedModule.isPlay && (
                    <TextField
                      label="loop"
                      fullWidth
                      size="small"
                      placeholder="{{ item_list }}"
                      helperText="Loop over items"
                      value={localLoop}
                      onChange={(e) => handleLoopChange(e.target.value)}
                    />
                  )}

                  <TextField
                    label="tags"
                    fullWidth
                    size="small"
                    placeholder="setup, config"
                    helperText="Task tags (comma separated)"
                    value={localTags}
                    onChange={(e) => handleTagsChange(e.target.value)}
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={localIgnoreErrors}
                        onChange={(e) => handleIgnoreErrorsChange(e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">ignore_errors</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Continue on error
                        </Typography>
                      </Box>
                    }
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={localTaskBecome}
                        onChange={(e) => handleTaskBecomeChange(e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">become</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Execute with sudo
                        </Typography>
                      </Box>
                    }
                  />

                  <TextField
                    label="delegate_to"
                    fullWidth
                    size="small"
                    placeholder="hostname or {{ inventory_hostname }}"
                    helperText="Delegate task to another host"
                    value={localDelegateTo}
                    onChange={(e) => handleDelegateToChange(e.target.value)}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Section 2: Attributs du Module */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <ExtensionIcon color="secondary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', flex: 1 }}>
                    Module: {selectedModule.collection}.{selectedModule.name}
                  </Typography>
                  {!selectedModule.moduleSchema && !isLoadingSchema && (
                    <Tooltip title="Load module schema">
                      <Box
                        component="span"
                        onClick={(e) => { e.stopPropagation(); loadModuleSchema(); }}
                        sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', p: 0.5, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <RefreshIcon fontSize="small" />
                      </Box>
                    </Tooltip>
                  )}
                  {isLoadingSchema && (
                    <CircularProgress size={16} />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Schema loading status */}
                  {schemaError && (
                    <Alert severity="warning">
                      Schema load failed: {schemaError}. Using static configuration.
                    </Alert>
                  )}
                  
                  {/* Validation status */}
                  {selectedModule.validationState && (
                    <Box>
                      {selectedModule.validationState.errors.length > 0 && (
                        <Alert severity="error" sx={{ mb: 1 }}>
                          <Typography variant="caption">Errors:</Typography>
                          {selectedModule.validationState.errors.map((error, idx) => (
                            <Typography key={idx} variant="caption" display="block">
                              • {error}
                            </Typography>
                          ))}
                        </Alert>
                      )}
                      {selectedModule.validationState.warnings.length > 0 && (
                        <Alert severity="warning" sx={{ mb: 1 }}>
                          <Typography variant="caption">Warnings:</Typography>
                          {selectedModule.validationState.warnings.map((warning, idx) => (
                            <Typography key={idx} variant="caption" display="block">
                              • {warning}
                            </Typography>
                          ))}
                        </Alert>
                      )}
                    </Box>
                  )}
                  
                  {/* Module schema info */}
                  {selectedModule.moduleSchema && (
                    <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {selectedModule.moduleSchema.short_description || selectedModule.moduleSchema.description}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip size="small" label={`${selectedModule.moduleSchema.parameter_count} params`} variant="outlined" sx={{ mr: 0.5 }} />
                        <Chip size="small" label={`${selectedModule.moduleSchema.required_parameters} required`} variant="outlined" sx={{ mr: 0.5 }} />
                        <Chip size="small" label={`v${selectedModule.moduleSchema.version}`} variant="outlined" />
                      </Box>
                    </Box>
                  )}
                  
                  {/* Dynamic schema-based parameters */}
                  {selectedModule.moduleSchema ? (
                    Object.values(selectedModule.moduleSchema.parameters).map(renderParameterField)
                  ) : (
                    /* Fallback to static configuration */
                    moduleConfig.length === 0 ? (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          No schema available for this module.
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<RefreshIcon />}
                          onClick={loadModuleSchema}
                          disabled={isLoadingSchema}
                          sx={{ mt: 1 }}
                        >
                          Load Schema
                        </Button>
                      </Box>
                    ) : (
                      moduleConfig.map((param) => (
                        <TextField
                          key={param.name}
                          label={param.name + (param.required ? ' *' : '')}
                          fullWidth
                          size="small"
                          type={param.type === 'text' ? 'text' : undefined}
                          select={param.type === 'select'}
                          SelectProps={param.type === 'select' ? { native: true } : undefined}
                          helperText={param.description}
                          defaultValue={param.default || ''}
                        >
                          {param.type === 'select' && param.name === 'backup' && (
                            <>
                              <option value="no">no</option>
                              <option value="yes">yes</option>
                            </>
                          )}
                          {param.type === 'select' && param.name === 'state' && selectedModule.name === 'service' && (
                            <>
                              <option value="started">started</option>
                              <option value="stopped">stopped</option>
                              <option value="restarted">restarted</option>
                              <option value="reloaded">reloaded</option>
                            </>
                          )}
                          {param.type === 'select' && param.name === 'state' && selectedModule.name === 'file' && (
                            <>
                              <option value="file">file</option>
                              <option value="directory">directory</option>
                              <option value="absent">absent</option>
                              <option value="link">link</option>
                            </>
                          )}
                          {param.type === 'select' && param.name === 'enabled' && (
                            <>
                              <option value="yes">yes</option>
                              <option value="no">no</option>
                            </>
                          )}
                        </TextField>
                      ))
                    )
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="caption" color="text.secondary">
                  * Required fields
                  {selectedModule.moduleSchema && (
                    <> • Schema from Galaxy API v{selectedModule.moduleSchema.version}</>
                  )}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </Box>
    </Box>
  )
}

export default ConfigZone
