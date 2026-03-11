import React, { useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Snackbar,
  TextField,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { gitPullRequestService, PullRequestInfo } from '../../services/gitPullRequestService'

interface CreatePRDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  onPRCreated: (pr: PullRequestInfo) => void
}

const CreatePRDialog: React.FC<CreatePRDialogProps> = ({ open, onClose, projectId, onPRCreated }) => {
  const { t } = useTranslation('project')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetBranch, setTargetBranch] = useState('main')
  const [draft, setDraft] = useState(false)
  const [creating, setCreating] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error'; url?: string; provider?: string }>({
    open: false, message: '', severity: 'success',
  })

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    try {
      const pr = await gitPullRequestService.createPullRequest(projectId, {
        title: title.trim(),
        description: description.trim(),
        target_branch: targetBranch.trim() || 'main',
        draft,
      })
      setSnackbar({
        open: true,
        message: t('prCreateSuccess'),
        severity: 'success',
        url: pr.url,
        provider: pr.provider,
      })
      onPRCreated(pr)
      onClose()
      setTitle('')
      setDescription('')
      setTargetBranch('main')
      setDraft(false)
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || t('prCreateError'),
        severity: 'error',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{t('createPR')}</DialogTitle>
        <DialogContent>
          <TextField
            label={t('prTitle')}
            placeholder={t('prTitlePlaceholder')}
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={creating}
            sx={{ mt: 1 }}
            autoFocus
          />
          <TextField
            label={t('prDescription')}
            placeholder={t('prDescriptionPlaceholder')}
            multiline
            rows={4}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={creating}
            sx={{ mt: 2 }}
          />
          <TextField
            label={t('prTargetBranch')}
            fullWidth
            value={targetBranch}
            onChange={(e) => setTargetBranch(e.target.value)}
            disabled={creating}
            sx={{ mt: 2 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
                disabled={creating}
              />
            }
            label={t('prDraft')}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={creating}>
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!title.trim() || creating}
          >
            {creating ? <CircularProgress size={16} /> : t('createPR')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
          {snackbar.url && (
            <>
              {' — '}
              <Link href={snackbar.url} target="_blank" rel="noopener">
                {t(snackbar.provider === 'gitlab' ? 'prUrlGitLab' : 'prUrl')}
              </Link>
            </>
          )}
        </Alert>
      </Snackbar>
    </>
  )
}

export default CreatePRDialog
