import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  FormLabel,
  RadioGroup,
  Radio,
  Switch,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  PlayArrow as TestIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material'
import {
  galaxySourceService,
  GalaxySource,
  GalaxySourceCreate,
  GalaxySourceUpdate,
  GalaxySourceTestResponse,
} from '../../services/galaxySourceService'

interface GalaxySourceDialogProps {
  open: boolean
  source: GalaxySource | null
  onClose: () => void
  onSave: () => void
}

const GalaxySourceDialog: React.FC<GalaxySourceDialogProps> = ({
  open,
  source,
  onClose,
  onSave,
}) => {
  const isEditing = !!source

  const [formData, setFormData] = useState({
    name: '',
    source_type: 'private' as 'public' | 'private',
    url: '',
    description: '',
    token: '',
    is_active: true,
  })

  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<GalaxySourceTestResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (source) {
        setFormData({
          name: source.name,
          source_type: source.source_type,
          url: source.url,
          description: source.description || '',
          token: '', // Never pre-fill token
          is_active: source.is_active,
        })
      } else {
        setFormData({
          name: '',
          source_type: 'private',
          url: '',
          description: '',
          token: '',
          is_active: true,
        })
      }
      setTestResult(null)
      setError(null)
      setShowToken(false)
    }
  }, [open, source])

  const handleChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }))
    setTestResult(null)
    setError(null)
  }

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      source_type: event.target.value as 'public' | 'private',
      token: event.target.value === 'public' ? '' : prev.token,
    }))
  }

  const handleTestConnection = async () => {
    if (!formData.url) {
      setError('URL is required to test connection')
      return
    }

    try {
      setTesting(true)
      setError(null)
      const result = await galaxySourceService.adminTestConnection({
        url: formData.url,
        token: formData.token || undefined,
        source_type: formData.source_type,
      })
      setTestResult(result)
      if (!result.success) {
        setError(result.message)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed'
      setError(errorMessage)
    } finally {
      setTesting(false)
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }
    if (!formData.url.trim()) {
      setError('URL is required')
      return
    }
    if (formData.source_type === 'private' && !formData.token && !isEditing) {
      setError('Token is required for private Galaxy sources')
      return
    }

    try {
      setSaving(true)
      setError(null)

      if (isEditing) {
        const updateData: GalaxySourceUpdate = {
          name: formData.name,
          url: formData.url,
          description: formData.description || undefined,
          is_active: formData.is_active,
        }
        if (formData.token) {
          updateData.token = formData.token
        }
        await galaxySourceService.adminUpdateSource(source!.id, updateData)
      } else {
        const createData: GalaxySourceCreate = {
          name: formData.name,
          source_type: formData.source_type,
          url: formData.url,
          description: formData.description || undefined,
          token: formData.token || undefined,
          is_active: formData.is_active,
        }
        await galaxySourceService.adminCreateSource(createData)
      }

      onSave()
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } }
      setError(errorObj.response?.data?.detail || 'Failed to save Galaxy source')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? 'Edit Galaxy Source' : 'Add Galaxy Source'}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {testResult?.success && (
            <Alert severity="success" icon={<SuccessIcon />}>
              Connection successful!
              {testResult.response_time_ms && ` (${testResult.response_time_ms}ms)`}
              {testResult.api_version && ` - API v${testResult.api_version}`}
            </Alert>
          )}

          <TextField
            label="Name"
            value={formData.name}
            onChange={handleChange('name')}
            required
            fullWidth
            placeholder="e.g., Private Automation Hub"
          />

          {!isEditing && (
            <FormControl component="fieldset">
              <FormLabel component="legend">Source Type</FormLabel>
              <RadioGroup
                row
                value={formData.source_type}
                onChange={handleTypeChange}
              >
                <FormControlLabel
                  value="private"
                  control={<Radio />}
                  label="Private (AAP Hub, Galaxy NG)"
                />
                <FormControlLabel
                  value="public"
                  control={<Radio />}
                  label="Public (galaxy.ansible.com)"
                />
              </RadioGroup>
            </FormControl>
          )}

          <TextField
            label="URL"
            value={formData.url}
            onChange={handleChange('url')}
            required
            fullWidth
            placeholder="https://hub.example.com"
            helperText="Base URL of the Galaxy API (without /api/)"
          />

          {formData.source_type === 'private' && (
            <TextField
              label={isEditing ? 'Token (leave empty to keep current)' : 'Token'}
              value={formData.token}
              onChange={handleChange('token')}
              required={!isEditing}
              fullWidth
              type={showToken ? 'text' : 'password'}
              placeholder={isEditing && source?.has_token ? source.token_masked || '****' : 'Enter API token'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowToken(!showToken)}
                      edge="end"
                    >
                      {showToken ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}

          <TextField
            label="Description"
            value={formData.description}
            onChange={handleChange('description')}
            fullWidth
            multiline
            rows={2}
            placeholder="Optional description"
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={handleChange('is_active')}
              />
            }
            label="Active"
          />

          <Button
            variant="outlined"
            startIcon={testing ? <CircularProgress size={20} /> : <TestIcon />}
            onClick={handleTestConnection}
            disabled={testing || !formData.url}
          >
            Test Connection
          </Button>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={saving}
        >
          {saving ? <CircularProgress size={20} /> : isEditing ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default GalaxySourceDialog
