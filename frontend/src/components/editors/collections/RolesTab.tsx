import React, { useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { RoleRequirement } from '../../../services/collectionService'

interface RolesTabProps {
  roles: RoleRequirement[]
  onChange: (roles: RoleRequirement[]) => void
}

const RolesTab: React.FC<RolesTabProps> = ({ roles, onChange }) => {
  const { t } = useTranslation('project')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [newRole, setNewRole] = useState<RoleRequirement>({
    name: '', version: null, src: null, scm: null,
  })

  const handleAdd = () => {
    if (!newRole.name.trim()) return
    onChange([...roles, {
      name: newRole.name.trim(),
      version: newRole.version?.trim() || null,
      src: newRole.src?.trim() || null,
      scm: newRole.scm?.trim() || null,
    }])
    setNewRole({ name: '', version: null, src: null, scm: null })
    setAddDialogOpen(false)
  }

  const handleDelete = (index: number) => {
    onChange(roles.filter((_, i) => i !== index))
    setDeleteConfirm(null)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          {t('addRole')}
        </Button>
      </Box>

      {roles.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t('noRoles')}
        </Typography>
      ) : (
        <List dense>
          {roles.map((role, index) => (
            <ListItem
              key={`${role.name}-${index}`}
              secondaryAction={
                deleteConfirm === index ? (
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <Typography variant="caption" color="error">
                      {t('deleteRoleConfirm', { name: role.name })}
                    </Typography>
                    <Button size="small" color="error" onClick={() => handleDelete(index)}>
                      {t('delete')}
                    </Button>
                    <Button size="small" onClick={() => setDeleteConfirm(null)}>
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Tooltip title={t('deleteRole')}>
                    <IconButton edge="end" size="small" onClick={() => setDeleteConfirm(index)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )
              }
              sx={{ pr: deleteConfirm === index ? 40 : 6 }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="bold">{role.name}</Typography>
                    {role.version && (
                      <Chip label={role.version} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                    {role.scm && (
                      <Chip label={role.scm} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                }
                secondary={role.src || undefined}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Add Role Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addRole')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('roleName')}
            fullWidth
            value={newRole.name}
            onChange={e => setNewRole(prev => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label={t('versionConstraint')}
            placeholder={t('versionPlaceholder')}
            fullWidth
            value={newRole.version || ''}
            onChange={e => setNewRole(prev => ({ ...prev, version: e.target.value || null }))}
          />
          <TextField
            margin="dense"
            label={t('sourceUrl')}
            fullWidth
            value={newRole.src || ''}
            onChange={e => setNewRole(prev => ({ ...prev, src: e.target.value || null }))}
          />
          <TextField
            margin="dense"
            label="SCM"
            placeholder="git"
            fullWidth
            value={newRole.scm || ''}
            onChange={e => setNewRole(prev => ({ ...prev, scm: e.target.value || null }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!newRole.name.trim()}>
            {t('addRole')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default RolesTab
