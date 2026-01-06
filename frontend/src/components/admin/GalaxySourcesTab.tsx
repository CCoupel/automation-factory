import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  Button,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  DragIndicator as DragIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
} from '@mui/icons-material'
import GalaxySourceDialog from './GalaxySourceDialog'
import { galaxySourceService, GalaxySource } from '../../services/galaxySourceService'

const GalaxySourcesTab: React.FC = () => {
  const [sources, setSources] = useState<GalaxySource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<GalaxySource | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [sourceToDelete, setSourceToDelete] = useState<GalaxySource | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Drag state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const loadSources = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await galaxySourceService.adminGetAllSources(true)
      setSources(data)
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } }
      setError(errorObj.response?.data?.detail || 'Failed to load Galaxy sources')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSources()
  }, [loadSources])

  const handleAddClick = () => {
    setEditingSource(null)
    setDialogOpen(true)
  }

  const handleEditClick = (source: GalaxySource) => {
    setEditingSource(source)
    setDialogOpen(true)
  }

  const handleDeleteClick = (source: GalaxySource) => {
    setSourceToDelete(source)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!sourceToDelete) return

    try {
      await galaxySourceService.adminDeleteSource(sourceToDelete.id)
      await loadSources()
      setDeleteConfirmOpen(false)
      setSourceToDelete(null)
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } }
      setError(errorObj.response?.data?.detail || 'Failed to delete source')
    }
  }

  const handleToggle = async (source: GalaxySource) => {
    try {
      setTogglingId(source.id)
      await galaxySourceService.adminToggleSource(source.id, !source.is_active)
      await loadSources()
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } }
      setError(errorObj.response?.data?.detail || 'Failed to toggle source')
    } finally {
      setTogglingId(null)
    }
  }

  const handleTest = async (source: GalaxySource) => {
    try {
      setTestingId(source.id)
      setError(null)
      const result = await galaxySourceService.adminTestSource(source.id)
      if (!result.success) {
        setError(`Test failed: ${result.message}`)
      }
      await loadSources()
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } }
      setError(errorObj.response?.data?.detail || 'Connection test failed')
    } finally {
      setTestingId(null)
    }
  }

  const handleDialogClose = () => {
    setDialogOpen(false)
    setEditingSource(null)
  }

  const handleDialogSave = async () => {
    await loadSources()
    handleDialogClose()
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    dragItem.current = index
  }

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index
  }

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null
      dragOverItem.current = null
      return
    }

    const newSources = [...sources]
    const draggedItem = newSources[dragItem.current]
    newSources.splice(dragItem.current, 1)
    newSources.splice(dragOverItem.current, 0, draggedItem)

    setSources(newSources)

    try {
      await galaxySourceService.adminReorderSources(newSources.map((s) => s.id))
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } }
      setError(errorObj.response?.data?.detail || 'Failed to reorder sources')
      await loadSources()
    }

    dragItem.current = null
    dragOverItem.current = null
  }

  const getStatusIcon = (source: GalaxySource) => {
    if (!source.last_test_status) return null

    if (source.last_test_status === 'success') {
      return (
        <Tooltip title={`Last test: ${source.last_test_at ? new Date(source.last_test_at).toLocaleString() : 'Unknown'}`}>
          <SuccessIcon color="success" fontSize="small" sx={{ ml: 1 }} />
        </Tooltip>
      )
    }
    return (
      <Tooltip title={`Last test failed: ${source.last_test_at ? new Date(source.last_test_at).toLocaleString() : 'Unknown'}`}>
        <ErrorIcon color="error" fontSize="small" sx={{ ml: 1 }} />
      </Tooltip>
    )
  }

  if (loading && sources.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Galaxy Sources</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
          size="small"
        >
          Add Source
        </Button>
      </Box>

      <Typography variant="body2" color="textSecondary" mb={2}>
        Configure Galaxy sources for role and collection discovery. Drag to reorder priority.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <List sx={{ width: '100%' }}>
        {sources.map((source, index) => (
          <ListItem
            key={source.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              mb: 1,
              bgcolor: source.is_active ? 'background.paper' : 'action.disabledBackground',
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' },
            }}
          >
            <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
              <DragIcon color="action" />
            </Box>

            <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
              {source.source_type === 'public' ? (
                <Tooltip title="Public Galaxy">
                  <PublicIcon color="primary" />
                </Tooltip>
              ) : (
                <Tooltip title="Private Galaxy">
                  <PrivateIcon color="secondary" />
                </Tooltip>
              )}
            </Box>

            <ListItemText
              primary={
                <Box display="flex" alignItems="center">
                  <Typography variant="body1" component="span">
                    {source.name}
                  </Typography>
                  {getStatusIcon(source)}
                  {source.has_token && (
                    <Chip label="Token" size="small" variant="outlined" sx={{ ml: 1 }} />
                  )}
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="body2" color="textSecondary" component="span">
                    {source.url}
                  </Typography>
                  {source.description && (
                    <Typography variant="caption" color="textSecondary" display="block">
                      {source.description}
                    </Typography>
                  )}
                </Box>
              }
            />

            <ListItemSecondaryAction>
              <Tooltip title="Test Connection">
                <span>
                  <IconButton
                    edge="end"
                    onClick={() => handleTest(source)}
                    disabled={testingId === source.id}
                    size="small"
                  >
                    {testingId === source.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <TestIcon />
                    )}
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Edit">
                <IconButton edge="end" onClick={() => handleEditClick(source)} size="small">
                  <EditIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={source.source_type === 'public' ? "Cannot delete public source" : "Delete"}>
                <span>
                  <IconButton
                    edge="end"
                    onClick={() => handleDeleteClick(source)}
                    disabled={source.source_type === 'public'}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={source.is_active ? 'Disable' : 'Enable'}>
                <span>
                  <Switch
                    checked={source.is_active}
                    onChange={() => handleToggle(source)}
                    disabled={togglingId === source.id}
                    size="small"
                  />
                </span>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {sources.length === 0 && !loading && (
        <Typography color="textSecondary" textAlign="center" py={4}>
          No Galaxy sources configured. Click "Add Source" to create one.
        </Typography>
      )}

      <GalaxySourceDialog
        open={dialogOpen}
        source={editingSource}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Galaxy Source</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{sourceToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default GalaxySourcesTab
