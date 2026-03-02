import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  CircularProgress,
  Alert,
  Checkbox,
  FormControl,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  FileSyncStatus,
  FileResolution,
  GitSyncResponse,
  gitSyncService,
} from '../../services/gitSyncService'

interface ConflictResolverProps {
  open: boolean
  onClose: () => void
  projectId: string
  syncResult: GitSyncResponse
  onResolved: () => void
}

interface FileChoice {
  resolution: 'ours' | 'theirs' | 'custom' | ''
  customContent: string
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({
  open,
  onClose,
  projectId,
  syncResult,
  onResolved,
}) => {
  const { t } = useTranslation('project')

  const [choices, setChoices] = useState<Record<string, FileChoice>>(() => {
    const initial: Record<string, FileChoice> = {}
    for (const file of syncResult.conflicted_files) {
      initial[file.path] = { resolution: '', customContent: file.local_content || '' }
    }
    return initial
  })

  const [autoPush, setAutoPush] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allResolved = syncResult.conflicted_files.every(
    (f) => choices[f.path]?.resolution !== ''
  )

  const handleChoiceChange = (path: string, value: 'ours' | 'theirs' | 'custom') => {
    setChoices((prev) => ({
      ...prev,
      [path]: { ...prev[path], resolution: value },
    }))
  }

  const handleCustomContentChange = (path: string, content: string) => {
    setChoices((prev) => ({
      ...prev,
      [path]: { ...prev[path], customContent: content },
    }))
  }

  const handleResolve = async () => {
    setResolving(true)
    setError(null)

    const resolutions: FileResolution[] = syncResult.conflicted_files.map((file) => {
      const choice = choices[file.path]
      return {
        path: file.path,
        resolution: choice.resolution as 'ours' | 'theirs' | 'custom',
        custom_content: choice.resolution === 'custom' ? choice.customContent : null,
      }
    })

    try {
      await gitSyncService.resolveConflicts(
        projectId,
        resolutions,
        t('resolveCommitMessage'),
        autoPush,
      )
      onResolved()
      onClose()
    } catch (err: any) {
      setError(err.message || t('resolveError'))
    } finally {
      setResolving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">{t('conflictResolver')}</Typography>
          <Chip
            label={t('conflictResolverSubtitle', {
              count: syncResult.conflicted_files.length,
            })}
            color="error"
            size="small"
          />
          {syncResult.auto_merged_files.length > 0 && (
            <Chip
              label={t('autoMergedSummary', {
                count: syncResult.auto_merged_files.length,
              })}
              color="success"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {syncResult.conflicted_files.map((file) => (
          <Box
            key={file.path}
            sx={{
              mb: 3,
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {file.path}
              </Typography>
              <Chip label={file.artifact_type} size="small" variant="outlined" />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {/* Local version */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  {t('localVersion')}
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 300,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {file.local_content || ''}
                </Box>
              </Box>

              {/* Remote version */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  {t('remoteVersion')}
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    p: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: 300,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {file.remote_content || ''}
                </Box>
              </Box>
            </Box>

            <FormControl>
              <RadioGroup
                row
                value={choices[file.path]?.resolution || ''}
                onChange={(e) =>
                  handleChoiceChange(file.path, e.target.value as 'ours' | 'theirs' | 'custom')
                }
              >
                <FormControlLabel value="ours" control={<Radio size="small" />} label={t('keepOurs')} />
                <FormControlLabel value="theirs" control={<Radio size="small" />} label={t('keepTheirs')} />
                <FormControlLabel value="custom" control={<Radio size="small" />} label={t('editMerged')} />
              </RadioGroup>
            </FormControl>

            {choices[file.path]?.resolution === 'custom' && (
              <TextField
                fullWidth
                multiline
                minRows={4}
                maxRows={12}
                value={choices[file.path]?.customContent || ''}
                onChange={(e) => handleCustomContentChange(file.path, e.target.value)}
                sx={{ mt: 1, '& textarea': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              />
            )}
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={autoPush}
              onChange={(e) => setAutoPush(e.target.checked)}
              size="small"
            />
          }
          label={t('resolveAndPush')}
        />
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={resolving}>
          {t('cancel', { ns: 'common' })}
        </Button>
        <Button
          variant="contained"
          onClick={handleResolve}
          disabled={!allResolved || resolving}
          startIcon={resolving ? <CircularProgress size={16} /> : undefined}
        >
          {resolving ? t('resolving') : t('resolveAll')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConflictResolver
