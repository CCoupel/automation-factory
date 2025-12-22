/**
 * Share Dialog Component
 *
 * Dialog for managing playbook sharing with other users.
 */

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material'
import ShareIcon from '@mui/icons-material/Share'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  collaborationService,
  PlaybookShare
} from '../../services/collaborationService'

interface ShareDialogProps {
  open: boolean
  onClose: () => void
  playbookId: string
  playbookName: string
}

const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onClose,
  playbookId,
  playbookName
}) => {
  const [shares, setShares] = useState<PlaybookShare[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // New share form
  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<'editor' | 'viewer'>('viewer')
  const [addingShare, setAddingShare] = useState(false)

  // Load shares when dialog opens
  useEffect(() => {
    console.log('📋 ShareDialog effect:', { open, playbookId, playbookName })
    if (open && playbookId) {
      loadShares()
    }
  }, [open, playbookId])

  const loadShares = async () => {
    console.log('🔄 loadShares called with playbookId:', playbookId)
    setLoading(true)
    setError(null)
    try {
      const response = await collaborationService.getShares(playbookId)
      console.log('✅ loadShares success:', response)
      setShares(response.shares)
    } catch (err: any) {
      console.error('❌ loadShares error:', err)
      setError(err.message || 'Failed to load shares')
    } finally {
      setLoading(false)
    }
  }

  const handleAddShare = async () => {
    if (!newUsername.trim()) return

    setAddingShare(true)
    setError(null)
    setSuccess(null)

    try {
      const newShare = await collaborationService.sharePlaybook(
        playbookId,
        newUsername.trim(),
        newRole
      )
      setShares(prev => [...prev, newShare])
      setNewUsername('')
      setNewRole('viewer')
      setSuccess(`Playbook shared with ${newShare.user?.username}`)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to share playbook')
    } finally {
      setAddingShare(false)
    }
  }

  const handleUpdateRole = async (shareId: string, newRole: 'editor' | 'viewer') => {
    setError(null)
    try {
      const updated = await collaborationService.updateShare(playbookId, shareId, newRole)
      setShares(prev =>
        prev.map(s => (s.id === shareId ? updated : s))
      )
    } catch (err: any) {
      setError(err.message || 'Failed to update share')
    }
  }

  const handleRemoveShare = async (shareId: string) => {
    setError(null)
    try {
      await collaborationService.removeShare(playbookId, shareId)
      setShares(prev => prev.filter(s => s.id !== shareId))
      setSuccess('Share removed')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to remove share')
    }
  }

  const getRoleIcon = (role: string) => {
    return role === 'editor' ? (
      <EditIcon sx={{ fontSize: 16 }} />
    ) : (
      <VisibilityIcon sx={{ fontSize: 16 }} />
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShareIcon color="primary" />
        <Box>
          Share Playbook
          <Typography variant="caption" display="block" color="text.secondary">
            {playbookName}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Add new share form */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Add collaborator
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              size="small"
              sx={{ flexGrow: 1 }}
              placeholder="Enter username"
              disabled={addingShare}
            />
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={newRole}
                label="Role"
                onChange={(e) => setNewRole(e.target.value as 'editor' | 'viewer')}
                disabled={addingShare}
              >
                <MenuItem value="viewer">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <VisibilityIcon sx={{ fontSize: 16 }} />
                    Viewer
                  </Box>
                </MenuItem>
                <MenuItem value="editor">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EditIcon sx={{ fontSize: 16 }} />
                    Editor
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleAddShare}
              disabled={!newUsername.trim() || addingShare}
              startIcon={addingShare ? <CircularProgress size={16} /> : <PersonAddIcon />}
            >
              Add
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            <strong>Viewer:</strong> Can view playbook | <strong>Editor:</strong> Can view and edit
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Current shares list */}
        <Typography variant="subtitle2" gutterBottom>
          Current collaborators
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : shares.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No collaborators yet. Add someone to start collaborating!
          </Typography>
        ) : (
          <List dense>
            {shares.map((share) => (
              <ListItem
                key={share.id}
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  mb: 0.5,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <ListItemText
                  primary={share.user?.username || 'Unknown user'}
                  secondary={share.user?.email}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <Select
                      value={share.role}
                      onChange={(e) =>
                        handleUpdateRole(share.id, e.target.value as 'editor' | 'viewer')
                      }
                      size="small"
                      sx={{ fontSize: '0.875rem' }}
                    >
                      <MenuItem value="viewer">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <VisibilityIcon sx={{ fontSize: 14 }} />
                          Viewer
                        </Box>
                      </MenuItem>
                      <MenuItem value="editor">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EditIcon sx={{ fontSize: 14 }} />
                          Editor
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveShare(share.id)}
                    size="small"
                    color="error"
                    title="Remove share"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
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

export default ShareDialog
