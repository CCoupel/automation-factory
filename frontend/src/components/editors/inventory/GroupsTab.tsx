import React, { useState } from 'react'
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import FolderIcon from '@mui/icons-material/Folder'
import PersonIcon from '@mui/icons-material/Person'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { useTranslation } from 'react-i18next'
import { InventoryData, InventoryGroup } from '../../../services/inventoryService'

interface GroupsTabProps {
  data: InventoryData
  onChange: (data: InventoryData) => void
}

const GroupsTab: React.FC<GroupsTabProps> = ({ data, onChange }) => {
  const { t } = useTranslation('project')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false)
  const [addHostToGroupDialog, setAddHostToGroupDialog] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupParent, setNewGroupParent] = useState('')
  const [selectedHost, setSelectedHost] = useState('')

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return

    const newGroup: InventoryGroup = {
      name: newGroupName.trim(),
      hosts: [],
      children: [],
      variables: {},
    }

    let updatedGroups = [...data.groups, newGroup]

    // Add as child of parent if specified
    if (newGroupParent) {
      updatedGroups = updatedGroups.map(g =>
        g.name === newGroupParent
          ? { ...g, children: [...g.children, newGroupName.trim()] }
          : g
      )
    }

    onChange({ ...data, groups: updatedGroups })
    setNewGroupName('')
    setNewGroupParent('')
    setAddGroupDialogOpen(false)
  }

  const handleDeleteGroup = (groupName: string) => {
    onChange({
      ...data,
      groups: data.groups
        .filter(g => g.name !== groupName)
        .map(g => ({
          ...g,
          children: g.children.filter(c => c !== groupName),
        })),
    })
    setDeleteConfirm(null)
  }

  const handleAddHostToGroup = () => {
    if (!selectedHost || !addHostToGroupDialog) return

    onChange({
      ...data,
      groups: data.groups.map(g =>
        g.name === addHostToGroupDialog && !g.hosts.includes(selectedHost)
          ? { ...g, hosts: [...g.hosts, selectedHost] }
          : g
      ),
    })
    setSelectedHost('')
    setAddHostToGroupDialog(null)
  }

  const handleRemoveHostFromGroup = (groupName: string, hostName: string) => {
    onChange({
      ...data,
      groups: data.groups.map(g =>
        g.name === groupName
          ? { ...g, hosts: g.hosts.filter(h => h !== hostName) }
          : g
      ),
    })
  }

  const getAvailableHostsForGroup = (groupName: string): string[] => {
    const group = data.groups.find(g => g.name === groupName)
    if (!group) return []
    return data.hosts
      .map(h => h.name)
      .filter(h => !group.hosts.includes(h))
  }

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
        <Typography variant="subtitle2">{t('groups')} ({data.groups.length})</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setAddGroupDialogOpen(true)}>
          {t('addGroup')}
        </Button>
      </Box>

      {data.groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {t('noGroups')}
        </Typography>
      ) : (
        <List dense disablePadding>
          {data.groups.map(group => {
            const isExpanded = expandedGroups.has(group.name)
            return (
              <React.Fragment key={group.name}>
                <ListItemButton onClick={() => toggleGroup(group.name)} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <FolderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="bold">{group.name}</Typography>
                        <Chip
                          label={`${group.hosts.length} ${t('groupMembers').toLowerCase()}`}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                        {group.children.length > 0 && (
                          <Chip
                            label={`${group.children.length} children`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <IconButton
                    size="small"
                    onClick={e => { e.stopPropagation(); setAddHostToGroupDialog(group.name) }}
                    sx={{ mr: 0.5 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={e => { e.stopPropagation(); setDeleteConfirm(group.name) }}
                    sx={{ mr: 0.5 }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>

                <Collapse in={isExpanded} timeout="auto">
                  <List dense disablePadding>
                    {group.hosts.map(hostName => (
                      <ListItemButton key={hostName} sx={{ pl: 6, py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <PersonIcon fontSize="small" color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={<Typography variant="body2">{hostName}</Typography>}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveHostFromGroup(group.name, hostName)}
                        >
                          <RemoveCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      </ListItemButton>
                    ))}
                    {group.children.map(childName => (
                      <ListItemButton key={childName} sx={{ pl: 6, py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <FolderIcon fontSize="small" color="action" />
                        </ListItemIcon>
                        <ListItemText
                          primary={<Typography variant="body2" fontStyle="italic">{childName}</Typography>}
                        />
                      </ListItemButton>
                    ))}
                    {group.hosts.length === 0 && group.children.length === 0 && (
                      <Box sx={{ pl: 6, py: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t('noHosts')}
                        </Typography>
                      </Box>
                    )}
                  </List>
                </Collapse>
              </React.Fragment>
            )
          })}
        </List>
      )}

      {/* Add Group Dialog */}
      <Dialog open={addGroupDialogOpen} onClose={() => setAddGroupDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addGroup')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('groupName')}
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddGroup() }}
              autoFocus
              size="small"
            />
            <FormControl size="small">
              <InputLabel>{t('parentGroup')}</InputLabel>
              <Select
                value={newGroupParent}
                onChange={e => setNewGroupParent(e.target.value)}
                label={t('parentGroup')}
              >
                <MenuItem value="">
                  <em>{t('allGroup')}</em>
                </MenuItem>
                {data.groups.map(g => (
                  <MenuItem key={g.name} value={g.name}>{g.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddGroupDialogOpen(false)}>{t('delete', { ns: 'common', defaultValue: 'Cancel' })}</Button>
          <Button variant="contained" onClick={handleAddGroup} disabled={!newGroupName.trim()}>
            {t('addGroup')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Host to Group Dialog */}
      <Dialog open={!!addHostToGroupDialog} onClose={() => setAddHostToGroupDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addToGroup')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>{t('hostName')}</InputLabel>
              <Select
                value={selectedHost}
                onChange={e => setSelectedHost(e.target.value)}
                label={t('hostName')}
              >
                {addHostToGroupDialog && getAvailableHostsForGroup(addHostToGroupDialog).map(h => (
                  <MenuItem key={h} value={h}>{h}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddHostToGroupDialog(null)}>{t('delete', { ns: 'common', defaultValue: 'Cancel' })}</Button>
          <Button variant="contained" onClick={handleAddHostToGroup} disabled={!selectedHost}>
            {t('addToGroup')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>{t('deleteGroup')}</DialogTitle>
        <DialogContent>
          <Typography>{t('deleteGroupConfirm', { name: deleteConfirm })}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>{t('delete', { ns: 'common', defaultValue: 'Cancel' })}</Button>
          <Button color="error" variant="contained" onClick={() => deleteConfirm && handleDeleteGroup(deleteConfirm)}>
            {t('deleteGroup')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default GroupsTab
