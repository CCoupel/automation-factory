import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Alert,
  CircularProgress
} from '@mui/material'
import WarningIcon from '@mui/icons-material/Warning'
import DeleteIcon from '@mui/icons-material/Delete'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { playbookService, Playbook } from '../../services/playbookService'

interface DeleteSharedPlaybookDialogProps {
  open: boolean
  onClose: () => void
  playbook: Playbook | null
  onDeleted: () => void
  onTransferred: () => void
}

type DeleteAction = 'delete' | 'transfer'

const DeleteSharedPlaybookDialog: React.FC<DeleteSharedPlaybookDialogProps> = ({
  open,
  onClose,
  playbook,
  onDeleted,
  onTransferred
}) => {
  const [action, setAction] = useState<DeleteAction>('transfer')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [keepAccess, setKeepAccess] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sharedUsers = playbook?.shared_with_users || []

  const handleClose = () => {
    setAction('transfer')
    setSelectedUser('')
    setKeepAccess(true)
    setError(null)
    onClose()
  }

  const handleConfirm = async () => {
    if (!playbook) return

    setLoading(true)
    setError(null)

    try {
      if (action === 'delete') {
        await playbookService.deletePlaybook(playbook.id)
        handleClose()
        onDeleted()
      } else {
        // Transfer ownership
        if (!selectedUser) {
          setError('Veuillez sélectionner un nouveau propriétaire')
          setLoading(false)
          return
        }

        await playbookService.transferOwnership(playbook.id, {
          new_owner_username: selectedUser,
          keep_access: keepAccess
        })
        handleClose()
        onTransferred()
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (!playbook) return null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6">Supprimer le playbook partagé</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Le playbook <strong>"{playbook.name}"</strong> est partagé avec{' '}
          <strong>{sharedUsers.length} utilisateur(s)</strong>.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <RadioGroup
          value={action}
          onChange={(e) => setAction(e.target.value as DeleteAction)}
        >
          {/* Option: Transfer ownership */}
          {sharedUsers.length > 0 && (
            <FormControlLabel
              value="transfer"
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SwapHorizIcon color="primary" />
                  <Typography>Transférer la propriété</Typography>
                </Box>
              }
            />
          )}

          {action === 'transfer' && sharedUsers.length > 0 && (
            <Box sx={{ ml: 4, mb: 2 }}>
              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>Nouveau propriétaire</InputLabel>
                <Select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  label="Nouveau propriétaire"
                >
                  {sharedUsers.map((username) => (
                    <MenuItem key={username} value={username}>
                      {username}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={keepAccess}
                    onChange={(e) => setKeepAccess(e.target.checked)}
                  />
                }
                label="Conserver un accès éditeur après le transfert"
                sx={{ mt: 1 }}
              />

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Le nouveau propriétaire aura tous les droits sur le playbook.
                {keepAccess && " Vous garderez un accès en tant qu'éditeur."}
              </Typography>
            </Box>
          )}

          {/* Option: Delete for everyone */}
          <FormControlLabel
            value="delete"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DeleteIcon color="error" />
                <Typography color="error">Supprimer définitivement pour tous</Typography>
              </Box>
            }
          />

          {action === 'delete' && (
            <Box sx={{ ml: 4, mb: 2 }}>
              <Alert severity="warning">
                Cette action est irréversible. Le playbook sera supprimé pour vous et tous
                les utilisateurs avec qui il est partagé.
              </Alert>
            </Box>
          )}
        </RadioGroup>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          variant="contained"
          color={action === 'delete' ? 'error' : 'primary'}
          onClick={handleConfirm}
          disabled={loading || (action === 'transfer' && !selectedUser)}
          startIcon={loading ? <CircularProgress size={16} /> : (action === 'delete' ? <DeleteIcon /> : <SwapHorizIcon />)}
        >
          {action === 'delete' ? 'Supprimer' : 'Transférer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteSharedPlaybookDialog
