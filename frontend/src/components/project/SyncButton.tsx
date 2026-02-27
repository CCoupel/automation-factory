import React, { useState } from 'react'
import { Button, CircularProgress, Tooltip } from '@mui/material'
import SyncIcon from '@mui/icons-material/Sync'
import { useTranslation } from 'react-i18next'
import { gitSyncService, GitSyncResponse } from '../../services/gitSyncService'

interface SyncButtonProps {
  projectId: string
  onSyncResult: (result: GitSyncResponse) => void
  onError: (message: string) => void
}

const SyncButton: React.FC<SyncButtonProps> = ({ projectId, onSyncResult, onError }) => {
  const { t } = useTranslation('project')
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await gitSyncService.sync(projectId)
      onSyncResult(result)
    } catch (err: any) {
      onError(err.message || t('syncError'))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Tooltip title={t('sync')}>
      <Button
        size="small"
        variant="outlined"
        startIcon={syncing ? <CircularProgress size={14} /> : <SyncIcon />}
        onClick={handleSync}
        disabled={syncing}
        sx={{ fontSize: '0.75rem', textTransform: 'none' }}
      >
        {syncing ? t('syncing') : t('sync')}
      </Button>
    </Tooltip>
  )
}

export default SyncButton
