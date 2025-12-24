import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Alert,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Slider,
  Stack,
  Divider,
  Tabs,
  Tab
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  Save as SaveIcon,
  Highlight as HighlightIcon,
  RestartAlt as ResetIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { getHttpClient } from '../../utils/httpClient'
import { useUserPreferences } from '../../contexts/UserPreferencesContext'

interface ConfigurationDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * Configuration Dialog Component
 *
 * Modal dialog for configuring application settings:
 * - User preferences (accessible to all users)
 * - Standard namespaces management (admin only)
 */
const ConfigurationDialog: React.FC<ConfigurationDialogProps> = ({ open, onClose }) => {
  const { user } = useAuth()
  const { preferences, updatePreference, resetPreferences } = useUserPreferences()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  // Standard namespaces state
  const [standardNamespaces, setStandardNamespaces] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Add namespace dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newNamespace, setNewNamespace] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  // Check if user is admin
  const isAdmin = user?.role === 'admin'

  /**
   * Fetch current configuration (admin only)
   */
  useEffect(() => {
    if (!open) return

    const fetchConfiguration = async () => {
      if (!isAdmin) return

      try {
        setLoading(true)
        const http = getHttpClient()
        const response = await http.get('/api/admin/configuration/standard-namespaces')
        setStandardNamespaces(response.data.namespaces || ['community'])
      } catch (err: any) {
        console.warn('Standard namespaces API not yet implemented, using defaults')
        setStandardNamespaces(['community'])
      } finally {
        setLoading(false)
      }
    }

    fetchConfiguration()
  }, [open, isAdmin])

  /**
   * Save configuration changes
   */
  const handleSaveConfiguration = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const http = getHttpClient()

      try {
        await http.put('/api/admin/configuration/standard-namespaces', {
          namespaces: standardNamespaces
        })
        setSuccess('Configuration saved successfully!')
      } catch (err: any) {
        console.warn('Standard namespaces API not yet implemented')
        setSuccess('Configuration will be saved when API is implemented')
      }

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Add new namespace
   */
  const handleAddNamespace = () => {
    setAddError(null)

    if (!newNamespace.trim()) {
      setAddError('Namespace name is required')
      return
    }

    if (standardNamespaces.includes(newNamespace.trim())) {
      setAddError('Namespace already exists')
      return
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(newNamespace.trim())) {
      setAddError('Invalid namespace format. Must start with a letter and contain only letters, numbers, hyphens, and underscores.')
      return
    }

    setStandardNamespaces(prev => [...prev, newNamespace.trim()])
    setNewNamespace('')
    setAddDialogOpen(false)
  }

  /**
   * Remove namespace
   */
  const handleRemoveNamespace = (namespace: string) => {
    setStandardNamespaces(prev => prev.filter(ns => ns !== namespace))
  }

  /**
   * Handle add dialog close
   */
  const handleCloseAddDialog = () => {
    setAddDialogOpen(false)
    setNewNamespace('')
    setAddError(null)
  }

  /**
   * Handle main dialog close
   */
  const handleClose = () => {
    setError(null)
    setSuccess(null)
    onClose()
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { minHeight: '400px' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6">Configuration</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Tabs for admin users */}
              {isAdmin && (
                <Tabs
                  value={activeTab}
                  onChange={(_, newValue) => setActiveTab(newValue)}
                  sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                  <Tab label="Préférences" />
                  <Tab label="Namespaces" />
                </Tabs>
              )}

              {/* User Preferences Tab */}
              {(activeTab === 0 || !isAdmin) && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Préférences utilisateur
                    </Typography>
                    <Tooltip title="Réinitialiser les préférences par défaut">
                      <IconButton onClick={resetPreferences} size="small">
                        <ResetIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Highlight Duration Setting */}
                  <Box sx={{ mb: 3 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <HighlightIcon color="primary" fontSize="small" />
                      <Typography variant="body2" fontWeight="medium">
                        Durée de surbrillance collaborative
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      Durée pendant laquelle un élément reste en surbrillance lorsqu'un collaborateur le modifie.
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
                        0.5s
                      </Typography>
                      <Slider
                        value={preferences.highlightDurationMs}
                        onChange={(_, value) => updatePreference('highlightDurationMs', value as number)}
                        min={500}
                        max={5000}
                        step={100}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${(value / 1000).toFixed(1)}s`}
                        sx={{ flex: 1 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 25 }}>
                        5s
                      </Typography>
                      <Chip
                        label={`${(preferences.highlightDurationMs / 1000).toFixed(1)}s`}
                        size="small"
                        color="primary"
                        sx={{ minWidth: 55 }}
                      />
                    </Stack>
                  </Box>
                </Box>
              )}

              {/* Standard Namespaces Tab - Admin only */}
              {isAdmin && activeTab === 1 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Namespaces standards
                    </Typography>
                    <Tooltip title="Ces namespaces apparaissent par défaut dans l'onglet FAVORITE">
                      <StarIcon color="primary" fontSize="small" />
                    </Tooltip>
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Ces namespaces apparaîtront automatiquement dans l'onglet FAVORITE pour tous les utilisateurs.
                  </Typography>

                  <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider', mb: 2 }}>
                    {standardNamespaces.map((namespace, index) => (
                      <ListItem key={namespace} divider={index < standardNamespaces.length - 1}>
                        <ListItemText
                          primary={namespace}
                          secondary={`#${index + 1}`}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleRemoveNamespace(namespace)}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}

                    {standardNamespaces.length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="Aucun namespace configuré"
                          primaryTypographyProps={{ color: 'text.secondary', variant: 'body2' }}
                        />
                      </ListItem>
                    )}
                  </List>

                  <Stack direction="row" spacing={1}>
                    <Button
                      startIcon={<AddIcon />}
                      variant="outlined"
                      size="small"
                      onClick={() => setAddDialogOpen(true)}
                    >
                      Ajouter
                    </Button>

                    <Button
                      startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
                      variant="contained"
                      size="small"
                      onClick={handleSaveConfiguration}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Enregistrer'}
                    </Button>
                  </Stack>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Namespace Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={handleCloseAddDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Ajouter un namespace</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {addError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {addError}
              </Alert>
            )}

            <TextField
              label="Nom du namespace"
              fullWidth
              size="small"
              value={newNamespace}
              onChange={(e) => setNewNamespace(e.target.value)}
              placeholder="ex: community, ansible..."
              helperText="Lettres, chiffres, tirets et underscores"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddNamespace()
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog} size="small">
            Annuler
          </Button>
          <Button
            onClick={handleAddNamespace}
            variant="contained"
            size="small"
            disabled={!newNamespace.trim()}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ConfigurationDialog
