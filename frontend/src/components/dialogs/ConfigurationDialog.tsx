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
  Tab,
  Switch,
  FormControlLabel
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  Save as SaveIcon,
  Highlight as HighlightIcon,
  RestartAlt as ResetIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Category as CategoryIcon
} from '@mui/icons-material'
import { useAuth } from '../../contexts/AuthContext'
import { getHttpClient } from '../../utils/httpClient'
import { useUserPreferences } from '../../contexts/UserPreferencesContext'
import { variableTypesService, CustomVariableType, CreateCustomTypeRequest } from '../../services/variableTypesService'

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

  // Variable types state (admin)
  const [customTypes, setCustomTypes] = useState<CustomVariableType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<CustomVariableType | null>(null)
  const [typeForm, setTypeForm] = useState<CreateCustomTypeRequest>({
    name: '',
    label: '',
    description: '',
    pattern: ''
  })
  const [typeError, setTypeError] = useState<string | null>(null)
  const [savingType, setSavingType] = useState(false)

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
   * Fetch custom variable types (admin only)
   */
  const fetchCustomTypes = async () => {
    if (!isAdmin) return
    try {
      setLoadingTypes(true)
      const types = await variableTypesService.adminGetAllTypes()
      setCustomTypes(types)
    } catch (err) {
      console.error('Failed to fetch custom types:', err)
    } finally {
      setLoadingTypes(false)
    }
  }

  useEffect(() => {
    if (open && isAdmin && activeTab === 2) {
      fetchCustomTypes()
    }
  }, [open, isAdmin, activeTab])

  /**
   * Handle type dialog open for create
   */
  const handleOpenTypeDialog = () => {
    setEditingType(null)
    setTypeForm({ name: '', label: '', description: '', pattern: '' })
    setTypeError(null)
    setTypeDialogOpen(true)
  }

  /**
   * Handle type dialog open for edit
   */
  const handleEditType = (type: CustomVariableType) => {
    setEditingType(type)
    setTypeForm({
      name: type.name,
      label: type.label,
      description: type.description || '',
      pattern: type.pattern
    })
    setTypeError(null)
    setTypeDialogOpen(true)
  }

  /**
   * Handle type dialog close
   */
  const handleCloseTypeDialog = () => {
    setTypeDialogOpen(false)
    setEditingType(null)
    setTypeError(null)
  }

  /**
   * Handle save type (create or update)
   */
  const handleSaveType = async () => {
    setTypeError(null)

    // Validation
    if (!typeForm.name.trim()) {
      setTypeError('Name is required')
      return
    }
    if (!typeForm.label.trim()) {
      setTypeError('Label is required')
      return
    }
    if (!typeForm.pattern.trim()) {
      setTypeError('Pattern is required')
      return
    }

    // Validate pattern format
    if (!typeForm.pattern.startsWith('|')) {
      try {
        new RegExp(typeForm.pattern)
      } catch {
        setTypeError('Invalid regular expression pattern')
        return
      }
    }

    try {
      setSavingType(true)
      if (editingType) {
        await variableTypesService.adminUpdateType(editingType.id, {
          label: typeForm.label,
          description: typeForm.description || undefined,
          pattern: typeForm.pattern
        })
        setSuccess('Type updated successfully')
      } else {
        await variableTypesService.adminCreateType(typeForm)
        setSuccess('Type created successfully')
      }
      handleCloseTypeDialog()
      fetchCustomTypes()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setTypeError(err.response?.data?.detail || 'Failed to save type')
    } finally {
      setSavingType(false)
    }
  }

  /**
   * Handle delete type
   */
  const handleDeleteType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this type?')) return

    try {
      await variableTypesService.adminDeleteType(typeId)
      setSuccess('Type deleted successfully')
      fetchCustomTypes()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete type')
    }
  }

  /**
   * Handle toggle type active status
   */
  const handleToggleTypeActive = async (type: CustomVariableType) => {
    try {
      await variableTypesService.adminUpdateType(type.id, {
        is_active: !type.is_active
      })
      fetchCustomTypes()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update type')
    }
  }

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
                  <Tab label="Types Variables" />
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

              {/* Variable Types Tab - Admin only */}
              {isAdmin && activeTab === 2 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Types de variables personnalisés
                    </Typography>
                    <Tooltip title="Définir des types de validation personnalisés pour les variables">
                      <CategoryIcon color="primary" fontSize="small" />
                    </Tooltip>
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Créez des types personnalisés avec des patterns de validation (regexp) ou des filtres Ansible (| from_json, | from_yaml).
                  </Typography>

                  {loadingTypes ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <>
                      <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider', mb: 2 }}>
                        {customTypes.map((type, index) => (
                          <ListItem key={type.id} divider={index < customTypes.length - 1}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight="medium">{type.label}</Typography>
                                  <Chip
                                    label={type.name}
                                    size="small"
                                    variant="outlined"
                                    sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                                  />
                                  {!type.is_active && (
                                    <Chip label="Inactif" size="small" color="warning" />
                                  )}
                                  {type.is_filter && (
                                    <Chip label="Filter" size="small" color="info" />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                  {type.pattern}
                                </Typography>
                              }
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title={type.is_active ? 'Désactiver' : 'Activer'}>
                                <Switch
                                  size="small"
                                  checked={type.is_active}
                                  onChange={() => handleToggleTypeActive(type)}
                                />
                              </Tooltip>
                              <IconButton
                                size="small"
                                onClick={() => handleEditType(type)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteType(type.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}

                        {customTypes.length === 0 && (
                          <ListItem>
                            <ListItemText
                              primary="Aucun type personnalisé configuré"
                              primaryTypographyProps={{ color: 'text.secondary', variant: 'body2' }}
                            />
                          </ListItem>
                        )}
                      </List>

                      <Button
                        startIcon={<AddIcon />}
                        variant="outlined"
                        size="small"
                        onClick={handleOpenTypeDialog}
                      >
                        Ajouter un type
                      </Button>
                    </>
                  )}
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

      {/* Add/Edit Type Dialog */}
      <Dialog
        open={typeDialogOpen}
        onClose={handleCloseTypeDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingType ? 'Modifier le type' : 'Ajouter un type'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {typeError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {typeError}
              </Alert>
            )}

            <TextField
              label="Nom (identifiant)"
              fullWidth
              size="small"
              value={typeForm.name}
              onChange={(e) => setTypeForm(prev => ({ ...prev, name: e.target.value.toLowerCase() }))}
              placeholder="ex: mail, ip, json"
              helperText="Identifiant unique, minuscules, sans espaces"
              disabled={!!editingType}
              autoFocus={!editingType}
            />

            <TextField
              label="Label (affichage)"
              fullWidth
              size="small"
              value={typeForm.label}
              onChange={(e) => setTypeForm(prev => ({ ...prev, label: e.target.value }))}
              placeholder="ex: Email Address, IP Address"
              helperText="Nom affiché dans l'interface"
              autoFocus={!!editingType}
            />

            <TextField
              label="Description"
              fullWidth
              size="small"
              value={typeForm.description}
              onChange={(e) => setTypeForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="ex: Valid email address format"
              helperText="Description optionnelle"
            />

            <TextField
              label="Pattern de validation"
              fullWidth
              size="small"
              value={typeForm.pattern}
              onChange={(e) => setTypeForm(prev => ({ ...prev, pattern: e.target.value }))}
              placeholder="^[a-z]+@[a-z]+\.[a-z]+$ ou | from_json"
              helperText="Regexp (ex: ^[a-z]+$) ou filtre Ansible (ex: | from_json, | from_yaml)"
              sx={{ '& input': { fontFamily: 'monospace' } }}
            />

            <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                <strong>Exemples de patterns:</strong><br />
                • Email: <code>^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+[.][a-zA-Z0-9-.]+$</code><br />
                • IP: <code>{'`^(\\d{1,3}[.]){3}\\d{1,3}$`'}</code><br />
                • JSON: <code>| from_json</code><br />
                • YAML: <code>| from_yaml</code>
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTypeDialog} size="small">
            Annuler
          </Button>
          <Button
            onClick={handleSaveType}
            variant="contained"
            size="small"
            disabled={savingType || !typeForm.name.trim() || !typeForm.label.trim() || !typeForm.pattern.trim()}
            startIcon={savingType ? <CircularProgress size={14} /> : <SaveIcon />}
          >
            {savingType ? 'Saving...' : editingType ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ConfigurationDialog
