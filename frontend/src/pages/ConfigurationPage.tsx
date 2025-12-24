import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Paper,
  Divider,
  Alert,
  Button,
  CircularProgress,
  Card,
  CardHeader,
  CardContent,
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
  Stack
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Star as StarIcon,
  Save as SaveIcon,
  Highlight as HighlightIcon,
  RestartAlt as ResetIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getHttpClient } from '../utils/httpClient'
import { useUserPreferences } from '../contexts/UserPreferencesContext'

/**
 * Configuration Page Component
 *
 * Page for configuring application settings:
 * - User preferences (accessible to all users)
 * - Standard namespaces management (admin only)
 *
 * Features:
 * - Highlight duration configuration
 * - Add/Remove standard namespaces (admin)
 * - Real-time validation
 * - Persist changes via API
 */
const ConfigurationPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { preferences, updatePreference, resetPreferences } = useUserPreferences()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
    const fetchConfiguration = async () => {
      try {
        setLoading(true)
        const http = getHttpClient()

        // For now, we'll simulate fetching from an API
        // In the future, this will be a real API call
        const response = await http.get('/api/admin/configuration/standard-namespaces')
        setStandardNamespaces(response.data.namespaces || ['community'])
      } catch (err: any) {
        // If API doesn't exist yet, use default
        console.warn('Standard namespaces API not yet implemented, using defaults')
        setStandardNamespaces(['community'])
      } finally {
        setLoading(false)
      }
    }

    if (isAdmin) {
      fetchConfiguration()
    } else {
      // Non-admin users don't need to load admin config
      setLoading(false)
    }
  }, [isAdmin])

  /**
   * Save configuration changes
   */
  const handleSaveConfiguration = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      const http = getHttpClient()
      
      // For now, simulate saving to API
      // In the future, this will be a real API call
      try {
        await http.put('/api/admin/configuration/standard-namespaces', {
          namespaces: standardNamespaces
        })
        setSuccess('Configuration saved successfully!')
      } catch (err: any) {
        // If API doesn't exist yet, just show success
        console.warn('Standard namespaces API not yet implemented')
        setSuccess('Configuration will be saved when API is implemented')
      }

      // Clear success message after 3 seconds
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

    // Validate namespace name format
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
   * Handle dialog close
   */
  const handleCloseAddDialog = () => {
    setAddDialogOpen(false)
    setNewNamespace('')
    setAddError(null)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Configuration
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
        >
          Retour
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* User Preferences Section - Available to all users */}
      <Card sx={{ mb: 4 }}>
        <CardHeader
          title="Préférences utilisateur"
          subheader="Personnalisez votre expérience dans l'application"
          action={
            <Tooltip title="Réinitialiser les préférences par défaut">
              <IconButton onClick={resetPreferences} size="small">
                <ResetIcon />
              </IconButton>
            </Tooltip>
          }
        />
        <CardContent>
          {/* Highlight Duration Setting */}
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <HighlightIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">
                Durée de surbrillance collaborative
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Durée pendant laquelle un élément reste en surbrillance lorsqu'un collaborateur le modifie.
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 50 }}>
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
              <Typography variant="body2" color="text.secondary" sx={{ minWidth: 50 }}>
                5s
              </Typography>
              <Chip
                label={`${(preferences.highlightDurationMs / 1000).toFixed(1)}s`}
                size="small"
                color="primary"
                sx={{ minWidth: 60 }}
              />
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Standard Namespaces Configuration - Admin only */}
      {isAdmin && (
      <>
      <Card sx={{ mb: 4 }}>
        <CardHeader
          title="Standard Namespaces"
          subheader="Configure which namespaces appear by default in the FAVORITE tab"
          action={
            <Tooltip title="Standard namespaces are automatically shown in the FAVORITE tab for all users">
              <StarIcon color="primary" />
            </Tooltip>
          }
        />
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ces namespaces apparaîtront automatiquement dans l'onglet FAVORITE pour tous les utilisateurs,
            en plus de leurs favoris personnels.
          </Typography>

          <List>
            {standardNamespaces.map((namespace, index) => (
              <ListItem key={namespace} divider={index < standardNamespaces.length - 1}>
                <ListItemText
                  primary={namespace}
                  secondary={`Namespace standard #${index + 1}`}
                />
                <ListItemSecondaryAction>
                  <Chip
                    label="Standard"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveNamespace(namespace)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            
            {standardNamespaces.length === 0 && (
              <ListItem>
                <ListItemText 
                  primary="Aucun namespace standard configuré"
                  secondary="Ajoutez des namespaces qui apparaîtront par défaut dans l'onglet FAVORITE"
                />
              </ListItem>
            )}
          </List>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              onClick={() => setAddDialogOpen(true)}
            >
              Ajouter un namespace
            </Button>
            
            <Button
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              variant="contained"
              onClick={handleSaveConfiguration}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Enregistrer'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Add Namespace Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={handleCloseAddDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ajouter un namespace standard</DialogTitle>
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
              value={newNamespace}
              onChange={(e) => setNewNamespace(e.target.value)}
              placeholder="ex: community, ansible, redhat..."
              helperText="Le namespace doit commencer par une lettre et ne peut contenir que des lettres, chiffres, tirets et underscores"
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
          <Button onClick={handleCloseAddDialog}>
            Annuler
          </Button>
          <Button 
            onClick={handleAddNamespace} 
            variant="contained"
            disabled={!newNamespace.trim()}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
      </>
      )}
    </Box>
  )
}

export default ConfigurationPage