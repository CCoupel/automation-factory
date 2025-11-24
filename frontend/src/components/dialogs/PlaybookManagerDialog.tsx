import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Divider,
  TextField,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import DescriptionIcon from '@mui/icons-material/Description'
import { playbookService, Playbook } from '../../services/playbookService'

interface PlaybookManagerDialogProps {
  open: boolean
  onClose: () => void
  onSelectPlaybook: (playbookId: string) => void
  currentPlaybookId: string | null
}

const PlaybookManagerDialog: React.FC<PlaybookManagerDialogProps> = ({
  open,
  onClose,
  onSelectPlaybook,
  currentPlaybookId
}) => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newPlaybookName, setNewPlaybookName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)

  // Load playbooks when dialog opens
  useEffect(() => {
    if (open) {
      loadPlaybooks()
    }
  }, [open])

  const loadPlaybooks = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await playbookService.listPlaybooks()
      setPlaybooks(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load playbooks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = async () => {
    if (!newPlaybookName.trim()) {
      setError('Please enter a playbook name')
      return
    }

    setCreatingNew(true)
    setError(null)
    try {
      const newPlaybook = await playbookService.createPlaybook({
        name: newPlaybookName.trim(),
        description: '',
        content: {
          modules: [],
          links: [],
          plays: [{
            id: 'play-1',
            name: 'Play 1',
            hosts: 'all',
            gatherFacts: true,
            become: false
          }],
          collapsedBlocks: [],
          collapsedBlockSections: [],
          metadata: {
            playbookName: newPlaybookName.trim()
          },
          variables: []
        }
      })

      setNewPlaybookName('')
      await loadPlaybooks()
      onSelectPlaybook(newPlaybook.id)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create playbook')
    } finally {
      setCreatingNew(false)
    }
  }

  const handleDelete = async (playbookId: string, playbookName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${playbookName}"? This action cannot be undone.`)) {
      return
    }

    setError(null)
    try {
      await playbookService.deletePlaybook(playbookId)
      await loadPlaybooks()

      // If deleted playbook was current, clear selection
      if (playbookId === currentPlaybookId) {
        // User will need to select another playbook
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete playbook')
    }
  }

  const handleSelectPlaybook = (playbookId: string) => {
    onSelectPlaybook(playbookId)
    onClose()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '500px'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon />
          <Typography variant="h6">Playbook Manager</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Create New Playbook Section */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Create New Playbook
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Enter playbook name..."
              value={newPlaybookName}
              onChange={(e) => setNewPlaybookName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateNew()
                }
              }}
              disabled={creatingNew}
            />
            <Button
              variant="contained"
              startIcon={creatingNew ? <CircularProgress size={16} /> : <AddIcon />}
              onClick={handleCreateNew}
              disabled={creatingNew || !newPlaybookName.trim()}
            >
              Create
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Playbooks List */}
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Your Playbooks
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : playbooks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No playbooks found. Create your first playbook above.
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {playbooks.map((playbook) => (
              <ListItem
                key={playbook.id}
                disablePadding
                sx={{
                  mb: 1,
                  border: '1px solid',
                  borderColor: playbook.id === currentPlaybookId ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  bgcolor: playbook.id === currentPlaybookId ? 'primary.light' : 'background.paper',
                  '&:hover': {
                    bgcolor: playbook.id === currentPlaybookId ? 'primary.light' : 'action.hover'
                  }
                }}
              >
                <ListItemButton onClick={() => handleSelectPlaybook(playbook.id)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="bold">
                          {playbook.name}
                        </Typography>
                        {playbook.id === currentPlaybookId && (
                          <Chip label="Current" size="small" color="primary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          Created: {formatDate(playbook.created_at)}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Updated: {formatDate(playbook.updated_at)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(playbook.id, playbook.name)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default PlaybookManagerDialog
