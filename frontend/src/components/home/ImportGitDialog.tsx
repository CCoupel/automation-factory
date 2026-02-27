import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
  Alert,
  CircularProgress,
  Divider,
  ListItemText,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { gitService, GitCredential } from '../../services/gitService'

interface ImportGitDialogProps {
  open: boolean
  onClose: () => void
}

const ImportGitDialog: React.FC<ImportGitDialogProps> = ({ open, onClose }) => {
  const { t } = useTranslation('project')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()

  const [gitUrl, setGitUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [credentialId, setCredentialId] = useState<string>('')
  const [credentials, setCredentials] = useState<GitCredential[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-fill project name from URL
  useEffect(() => {
    if (gitUrl && !name) {
      try {
        const urlPath = new URL(gitUrl).pathname
        const repoName = urlPath.split('/').pop()?.replace(/\.git$/, '') || ''
        setName(repoName)
      } catch {
        // Invalid URL, skip auto-fill
      }
    }
  }, [gitUrl])

  // Load credentials when dialog opens
  useEffect(() => {
    if (open) {
      loadCredentials()
    } else {
      // Reset state on close
      setGitUrl('')
      setBranch('main')
      setName('')
      setDescription('')
      setCredentialId('')
      setError(null)
    }
  }, [open])

  const loadCredentials = async () => {
    try {
      const creds = await gitService.listCredentials()
      setCredentials(creds)
    } catch {
      // Non-blocking — user can still import public repos
    }
  }

  const handleImport = async () => {
    if (!gitUrl || !name) return

    setLoading(true)
    setError(null)

    try {
      const result = await gitService.importFromGit({
        name,
        description: description || undefined,
        git_url: gitUrl,
        git_branch: branch,
        git_credentials_id: credentialId || undefined,
      })

      onClose()
      navigate(`/projects/${result.project.id}`)
    } catch (err: any) {
      setError(err.message || t('importError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('importFromGit')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label={t('gitUrl')}
            value={gitUrl}
            onChange={(e) => setGitUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            required
            fullWidth
            disabled={loading}
          />

          <TextField
            label={t('gitBranch')}
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            fullWidth
            disabled={loading}
          />

          <Divider />

          <TextField
            label={t('projectName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            disabled={loading}
          />

          <TextField
            label={t('description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            fullWidth
            disabled={loading}
          />

          <FormControl fullWidth disabled={loading}>
            <InputLabel>{t('gitCredential')}</InputLabel>
            <Select
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value as string)}
              label={t('gitCredential')}
            >
              <MenuItem value="">
                <ListItemText primary={t('noCredential')} />
              </MenuItem>
              {credentials.map((cred) => (
                <MenuItem key={cred.id} value={cred.id}>
                  <ListItemText
                    primary={cred.name}
                    secondary={`${cred.provider} ${cred.token_masked || ''}`}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {tc('cancel')}
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={loading || !gitUrl || !name}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? t('importing') : t('importFromGit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ImportGitDialog
