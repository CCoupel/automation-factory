import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../stores/projectStore'

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
}

const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({ open, onClose }) => {
  const { t } = useTranslation('project')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const createProject = useProjectStore(s => s.createProject)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsSubmitting(true)
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      onClose()
      setName('')
      setDescription('')
      navigate(`/projects/${project.id}`)
    } catch {
      // Error is handled by the store
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onClose()
    setName('')
    setDescription('')
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('newProject')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={t('projectName')}
          fullWidth
          variant="outlined"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) handleCreate() }}
        />
        <TextField
          margin="dense"
          label={t('description')}
          fullWidth
          variant="outlined"
          multiline
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{tc('cancel')}</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={!name.trim() || isSubmitting}
        >
          {t('create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CreateProjectDialog
