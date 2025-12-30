import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Tooltip,
  IconButton,
  CircularProgress,
  Divider,
  ListSubheader
} from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { PlayVariable, VariableType } from '../../types/playbook'
import { variableTypesService, VariableTypeInfo } from '../../services/variableTypesService'

interface AddVariableDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (variable: Omit<PlayVariable, 'value'> & { value?: string }) => void
  existingKeys: string[]
  editVariable?: PlayVariable  // For editing existing variable
}

// Fallback builtin types if API call fails
const FALLBACK_BUILTIN_TYPES: VariableTypeInfo[] = [
  { name: 'string', label: 'String', description: 'Text value (e.g., "hello", "/path/to/file")', is_builtin: true },
  { name: 'int', label: 'Integer', description: 'Whole number (e.g., 42, -10, 0)', is_builtin: true },
  { name: 'bool', label: 'Boolean', description: 'True or False value', is_builtin: true },
  { name: 'list', label: 'List', description: 'Array of values (e.g., [item1, item2])', is_builtin: true },
  { name: 'dict', label: 'Dictionary', description: 'Key-value pairs (e.g., {key: value})', is_builtin: true },
]

const AddVariableDialog: React.FC<AddVariableDialogProps> = ({
  open,
  onClose,
  onAdd,
  existingKeys,
  editVariable
}) => {
  const [variableName, setVariableName] = useState('')
  const [variableType, setVariableType] = useState<VariableType>('string')
  const [required, setRequired] = useState(true)
  const [defaultValue, setDefaultValue] = useState('')
  const [regexp, setRegexp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [regexpError, setRegexpError] = useState<string | null>(null)

  // Variable types from API
  const [variableTypes, setVariableTypes] = useState<VariableTypeInfo[]>(FALLBACK_BUILTIN_TYPES)
  const [loadingTypes, setLoadingTypes] = useState(false)

  const isEdit = !!editVariable

  // Fetch variable types when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingTypes(true)
      variableTypesService.getVariableTypesFlat()
        .then(types => {
          if (types.length > 0) {
            setVariableTypes(types)
          }
        })
        .catch(err => {
          console.error('Failed to load variable types:', err)
          // Keep fallback types on error
        })
        .finally(() => {
          setLoadingTypes(false)
        })
    }
  }, [open])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (editVariable) {
        setVariableName(editVariable.key)
        setVariableType(editVariable.type)
        setRequired(editVariable.required)
        setDefaultValue(editVariable.defaultValue || '')
        setRegexp(editVariable.regexp || '')
      } else {
        setVariableName('')
        setVariableType('string')
        setRequired(true)
        setDefaultValue('')
        setRegexp('')
      }
      setError(null)
      setRegexpError(null)
    }
  }, [open, editVariable])

  // Validate variable name format
  const isValidName = (name: string): boolean => {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name.trim())
  }

  // Check for duplicate keys (excluding current key if editing)
  const isDuplicate = variableName.trim() !== '' &&
    existingKeys.filter(k => !isEdit || k !== editVariable?.key).includes(variableName.trim())

  // Validate regexp
  const validateRegexp = (pattern: string): boolean => {
    if (!pattern) return true
    try {
      new RegExp(pattern)
      return true
    } catch {
      return false
    }
  }

  const handleRegexpChange = (value: string) => {
    setRegexp(value)
    if (value && !validateRegexp(value)) {
      setRegexpError('Invalid regular expression')
    } else {
      setRegexpError(null)
    }
  }

  const handleAdd = () => {
    const trimmedName = variableName.trim()

    if (!trimmedName) {
      setError('Variable name is required')
      return
    }

    if (!isValidName(trimmedName)) {
      setError('Invalid variable name. Must start with letter or underscore, contain only letters, numbers, and underscores.')
      return
    }

    if (isDuplicate) {
      setError('A variable with this name already exists')
      return
    }

    if (regexp && !validateRegexp(regexp)) {
      setError('Invalid regular expression pattern')
      return
    }

    const variable: Omit<PlayVariable, 'value'> & { value?: string } = {
      key: trimmedName,
      type: variableType,
      required,
      ...((!required && defaultValue) && { defaultValue }),
      ...(regexp && { regexp }),
    }

    onAdd(variable)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isDuplicate && variableName.trim() && !regexpError) {
      handleAdd()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Variable' : 'Add Variable'}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {/* Variable Name - Mandatory */}
          <TextField
            label="Variable Name *"
            fullWidth
            value={variableName}
            onChange={(e) => setVariableName(e.target.value)}
            onKeyDown={handleKeyDown}
            error={isDuplicate || (variableName.trim() !== '' && !isValidName(variableName))}
            helperText={
              isDuplicate
                ? 'Duplicate variable name'
                : variableName.trim() && !isValidName(variableName)
                  ? 'Must start with letter/underscore, only alphanumeric and underscore'
                  : 'e.g., ansible_user, app_port, enable_debug'
            }
            autoFocus
            disabled={isEdit}
          />

          {/* Variable Type - Mandatory */}
          <FormControl fullWidth>
            <InputLabel id="variable-type-label">Variable Type *</InputLabel>
            <Select
              labelId="variable-type-label"
              value={variableType}
              label="Variable Type *"
              onChange={(e) => setVariableType(e.target.value as VariableType)}
              disabled={loadingTypes}
              startAdornment={loadingTypes ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            >
              {/* Builtin types */}
              <ListSubheader>Builtin Types</ListSubheader>
              {variableTypes.filter(t => t.is_builtin).map((type) => (
                <MenuItem key={type.name} value={type.name}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>{type.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      - {type.description || type.name}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}

              {/* Custom types (if any) - rendered without fragment for MUI Select compatibility */}
              {variableTypes.some(t => !t.is_builtin) && <Divider key="custom-divider" />}
              {variableTypes.some(t => !t.is_builtin) && <ListSubheader key="custom-header">Custom Types</ListSubheader>}
              {variableTypes.filter(t => !t.is_builtin).map((type) => {
                const customType = type as VariableTypeInfo & { pattern?: string; is_filter?: boolean }
                const patternInfo = customType.is_filter
                  ? `Filter: ${customType.pattern}`
                  : customType.pattern
                    ? `Pattern: ${customType.pattern}`
                    : ''
                return (
                  <MenuItem key={`custom-${type.name}`} value={type.name}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{type.label}</Typography>
                        {type.description && (
                          <Typography variant="caption" color="text.secondary">
                            - {type.description}
                          </Typography>
                        )}
                      </Box>
                      {patternInfo && (
                        <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
                          {patternInfo}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>

          {/* Required Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography>Required variable</Typography>
                <Tooltip title="If checked, this variable must be provided when running the playbook">
                  <IconButton size="small">
                    <HelpOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            }
          />

          {/* Default Value - Only shown when not required */}
          {!required && (
            <TextField
              label="Default Value"
              fullWidth
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              onKeyDown={handleKeyDown}
              helperText="Value used if the variable is not provided"
              placeholder={
                variableType === 'bool' ? 'true or false' :
                variableType === 'int' ? '0' :
                variableType === 'list' ? '[item1, item2]' :
                variableType === 'dict' ? '{key: value}' :
                'default value'
              }
            />
          )}

          {/* Regexp Validation - Optional */}
          <TextField
            label="Validation Pattern (RegExp)"
            fullWidth
            value={regexp}
            onChange={(e) => handleRegexpChange(e.target.value)}
            onKeyDown={handleKeyDown}
            error={!!regexpError}
            helperText={regexpError || 'Optional: Regular expression to validate the value (e.g., ^[a-z]+$ for lowercase letters)'}
            placeholder="^[a-zA-Z0-9_]+$"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={!variableName.trim() || isDuplicate || !isValidName(variableName.trim()) || !!regexpError}
        >
          {isEdit ? 'Save' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddVariableDialog
