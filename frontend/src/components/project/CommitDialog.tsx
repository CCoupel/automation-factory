import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { gitOperationsService, GitFileChange } from '../../services/gitOperationsService'

interface CommitDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  onCommitSuccess: () => void
}

const statusIcons: Record<string, React.ReactElement> = {
  modified: <EditIcon fontSize="small" sx={{ color: 'warning.main' }} />,
  added: <AddIcon fontSize="small" sx={{ color: 'success.main' }} />,
  deleted: <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />,
}

const CommitDialog: React.FC<CommitDialogProps> = ({ open, onClose, projectId, onCommitSuccess }) => {
  const { t } = useTranslation('project')
  const [message, setMessage] = useState('')
  const [changes, setChanges] = useState<GitFileChange[]>([])
  const [loadingChanges, setLoadingChanges] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const fetchChanges = useCallback(async () => {
    setLoadingChanges(true)
    try {
      const data = await gitOperationsService.getChanges(projectId)
      setChanges(data.changes)
    } catch {
      // Silently fail
    } finally {
      setLoadingChanges(false)
    }
  }, [projectId])

  useEffect(() => {
    if (open) {
      fetchChanges()
      setMessage('')
    }
  }, [open, fetchChanges])

  const handleCommit = async () => {
    if (!message.trim() || changes.length === 0) return
    setCommitting(true)
    try {
      const result = await gitOperationsService.commit(projectId, message.trim())
      setSnackbar({
        open: true,
        message: t('commitSuccess'),
        severity: 'success',
      })
      onCommitSuccess()
      onClose()
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || t('commitError'),
        severity: 'error',
      })
    } finally {
      setCommitting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t('commit')}</DialogTitle>
        <DialogContent>
          {loadingChanges ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : changes.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              {t('noChanges')}
            </Typography>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary">
                {t('changedFiles', { count: changes.length })}
              </Typography>
              <List dense sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
                {changes.map((change) => (
                  <ListItem key={change.path} sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      {statusIcons[change.status] || statusIcons.modified}
                    </ListItemIcon>
                    <ListItemText
                      primary={change.path}
                      primaryTypographyProps={{ variant: 'caption', noWrap: true }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          <TextField
            label={t('commitMessage')}
            placeholder={t('commitMessagePlaceholder')}
            multiline
            rows={3}
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={committing}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={committing}>
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="contained"
            onClick={handleCommit}
            disabled={!message.trim() || changes.length === 0 || committing}
          >
            {committing ? <CircularProgress size={16} /> : t('commit')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default CommitDialog
