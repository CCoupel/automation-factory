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
  IconButton,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material'
import ShareIcon from '@mui/icons-material/Share'
import DeleteIcon from '@mui/icons-material/Delete'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useTranslation } from 'react-i18next'
import { projectService, ProjectShare } from '../../services/projectService'

interface ProjectShareDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
}

const ProjectShareDialog: React.FC<ProjectShareDialogProps> = ({
  open,
  onClose,
  projectId,
  projectName,
}) => {
  const { t } = useTranslation('project')

  const [shares, setShares] = useState<ProjectShare[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [newUsername, setNewUsername] = useState('')
  const [newRole, setNewRole] = useState<'editor' | 'viewer'>('viewer')
  const [addingShare, setAddingShare] = useState(false)

  useEffect(() => {
    if (open && projectId) {
      loadShares()
    }
  }, [open, projectId])

  const loadShares = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await projectService.getProjectShares(projectId)
      setShares(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('shareLoadError'))
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
      const newShare = await projectService.createProjectShare(projectId, newUsername.trim(), newRole)
      setShares(prev => [...prev, newShare])
      setNewUsername('')
      setNewRole('viewer')
      setSuccess(t('shareSuccess', { username: newShare.user?.username }))
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('shareAddError'))
    } finally {
      setAddingShare(false)
    }
  }

  const handleUpdateRole = async (shareId: string, role: 'editor' | 'viewer') => {
    setError(null)
    try {
      const updated = await projectService.updateProjectShare(projectId, shareId, role)
      setShares(prev => prev.map(s => (s.id === shareId ? updated : s)))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('shareUpdateError'))
    }
  }

  const handleRemoveShare = async (shareId: string) => {
    setError(null)
    try {
      await projectService.deleteProjectShare(projectId, shareId)
      setShares(prev => prev.filter(s => s.id !== shareId))
      setSuccess(t('removeShareSuccess'))
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('shareRemoveError'))
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ShareIcon color="primary" />
        <Box>
          {t('shareProject')}
          <Typography variant="caption" display="block" color="text.secondary">
            {projectName}
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
            {t('addCollaborator')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              label={t('shareUsername')}
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddShare() }}
              size="small"
              sx={{ flexGrow: 1 }}
              disabled={addingShare}
            />
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>{t('shareRole')}</InputLabel>
              <Select
                value={newRole}
                label={t('shareRole')}
                onChange={(e) => setNewRole(e.target.value as 'editor' | 'viewer')}
                disabled={addingShare}
              >
                <MenuItem value="viewer">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <VisibilityIcon sx={{ fontSize: 16 }} />
                    {t('shareRoleViewer')}
                  </Box>
                </MenuItem>
                <MenuItem value="editor">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EditIcon sx={{ fontSize: 16 }} />
                    {t('shareRoleEditor')}
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
              {t('shareAdd')}
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {t('shareRoleHint')}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          {t('currentCollaborators')}
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : shares.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            {t('noCollaborators')}
          </Typography>
        ) : (
          <List dense>
            {shares.map((share) => (
              <ListItem
                key={share.id}
                sx={{ bgcolor: 'background.paper', borderRadius: 1, mb: 0.5, border: '1px solid', borderColor: 'divider' }}
              >
                <ListItemText
                  primary={share.user?.username || share.user_id}
                  secondary={share.user?.email}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <Select
                      value={share.role}
                      onChange={(e) => handleUpdateRole(share.id, e.target.value as 'editor' | 'viewer')}
                      size="small"
                    >
                      <MenuItem value="viewer">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <VisibilityIcon sx={{ fontSize: 14 }} />
                          {t('shareRoleViewer')}
                        </Box>
                      </MenuItem>
                      <MenuItem value="editor">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EditIcon sx={{ fontSize: 14 }} />
                          {t('shareRoleEditor')}
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveShare(share.id)}
                    size="small"
                    color="error"
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
        <Button onClick={onClose}>{t('shareClose')}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default ProjectShareDialog
