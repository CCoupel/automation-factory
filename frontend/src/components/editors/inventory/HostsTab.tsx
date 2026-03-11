import React, { useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { InventoryData, InventoryHost } from '../../../services/inventoryService'

interface HostsTabProps {
  data: InventoryData
  onChange: (data: InventoryData) => void
}

const HostsTab: React.FC<HostsTabProps> = ({ data, onChange }) => {
  const { t } = useTranslation('project')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newHostName, setNewHostName] = useState('')
  const [newHostVars, setNewHostVars] = useState('')

  const handleAddHost = () => {
    if (!newHostName.trim()) return

    let variables: Record<string, any> = {}
    if (newHostVars.trim()) {
      try {
        variables = JSON.parse(newHostVars)
      } catch {
        // Try key=value format
        newHostVars.split('\n').forEach(line => {
          const [key, ...rest] = line.split('=')
          if (key && rest.length > 0) {
            variables[key.trim()] = rest.join('=').trim()
          }
        })
      }
    }

    const newHost: InventoryHost = { name: newHostName.trim(), variables }
    onChange({
      ...data,
      hosts: [...data.hosts, newHost],
    })
    setNewHostName('')
    setNewHostVars('')
    setAddDialogOpen(false)
  }

  const handleDeleteHost = (hostName: string) => {
    onChange({
      ...data,
      hosts: data.hosts.filter(h => h.name !== hostName),
      groups: data.groups.map(g => ({
        ...g,
        hosts: g.hosts.filter(h => h !== hostName),
      })),
    })
    setDeleteConfirm(null)
  }

  const getHostGroups = (hostName: string): string[] => {
    return data.groups
      .filter(g => g.hosts.includes(hostName))
      .map(g => g.name)
  }

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
        <Typography variant="subtitle2">{t('hosts')} ({data.hosts.length})</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
          {t('addHost')}
        </Button>
      </Box>

      {data.hosts.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {t('noHosts')}
        </Typography>
      ) : (
        <List dense disablePadding>
          {data.hosts.map(host => {
            const groups = getHostGroups(host.name)
            const varKeys = Object.keys(host.variables)
            return (
              <ListItem key={host.name} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{host.name}</Typography>
                      {host.variables.ansible_host && (
                        <Typography variant="caption" color="text.secondary">
                          ({host.variables.ansible_host})
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {groups.map(g => (
                        <Chip key={g} label={g} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                      ))}
                      {varKeys.length > 0 && (
                        <Tooltip title={varKeys.map(k => `${k}=${JSON.stringify(host.variables[k])}`).join(', ')}>
                          <Chip
                            label={`${varKeys.length} var${varKeys.length > 1 ? 's' : ''}`}
                            size="small"
                            color="info"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => setDeleteConfirm(host.name)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            )
          })}
        </List>
      )}

      {/* Add Host Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addHost')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('hostName')}
              value={newHostName}
              onChange={e => setNewHostName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddHost() }}
              autoFocus
              size="small"
            />
            <TextField
              label={t('hostVariables')}
              value={newHostVars}
              onChange={e => setNewHostVars(e.target.value)}
              multiline
              rows={3}
              size="small"
              placeholder={'ansible_host=1.2.3.4\nansible_port=22'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>{t('delete', { ns: 'common', defaultValue: 'Cancel' })}</Button>
          <Button variant="contained" onClick={handleAddHost} disabled={!newHostName.trim()}>
            {t('addHost')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>{t('deleteHost')}</DialogTitle>
        <DialogContent>
          <Typography>{t('deleteHostConfirm', { name: deleteConfirm })}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>{t('delete', { ns: 'common', defaultValue: 'Cancel' })}</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirm && handleDeleteHost(deleteConfirm)}>
            {t('deleteHost')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default HostsTab
