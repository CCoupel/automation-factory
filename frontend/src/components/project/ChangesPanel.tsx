import React, { useCallback, useEffect, useState } from 'react'
import {
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { gitOperationsService, GitFileChange } from '../../services/gitOperationsService'

interface ChangesPanelProps {
  projectId: string
  refreshKey?: number
}

const statusConfig: Record<string, { icon: React.ReactElement; color: string }> = {
  modified: { icon: <EditIcon fontSize="small" />, color: 'warning.main' },
  added: { icon: <AddIcon fontSize="small" />, color: 'success.main' },
  deleted: { icon: <DeleteIcon fontSize="small" />, color: 'error.main' },
}

const ChangesPanel: React.FC<ChangesPanelProps> = ({ projectId, refreshKey }) => {
  const { t } = useTranslation('project')
  const [changes, setChanges] = useState<GitFileChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChanges = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await gitOperationsService.getChanges(projectId)
      setChanges(data.changes)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchChanges()
  }, [fetchChanges, refreshKey])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {t('changedFiles', { count: changes.length })}
        </Typography>
        <Tooltip title={t('refreshChanges')}>
          <IconButton size="small" onClick={fetchChanges}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Typography variant="caption" color="error" sx={{ px: 1 }}>
          {error}
        </Typography>
      )}

      {changes.length === 0 && !error ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('noChanges')}
          </Typography>
        </Box>
      ) : (
        <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
          {changes.map((change) => {
            const config = statusConfig[change.status] || statusConfig.modified
            return (
              <ListItem key={change.path} sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 28, color: config.color }}>
                  {config.icon}
                </ListItemIcon>
                <ListItemText
                  primary={change.path}
                  primaryTypographyProps={{
                    variant: 'caption',
                    noWrap: true,
                    title: change.path,
                  }}
                />
              </ListItem>
            )
          })}
        </List>
      )}
    </Box>
  )
}

export default ChangesPanel
