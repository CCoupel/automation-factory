import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Divider,
  TextField,
  Alert,
  Chip,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import DescriptionIcon from '@mui/icons-material/Description'
import PersonIcon from '@mui/icons-material/Person'
import PeopleIcon from '@mui/icons-material/People'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import ShareIcon from '@mui/icons-material/Share'
import Tooltip from '@mui/material/Tooltip'
import { playbookService, Playbook } from '../../services/playbookService'
import DeleteSharedPlaybookDialog from './DeleteSharedPlaybookDialog'

interface PlaybookManagerDialogProps {
  open: boolean
  onClose: () => void
  onSelectPlaybook: (playbookId: string) => void
  currentPlaybookId: string | null
}

const PlaybookManagerDialog: React.FC<PlaybookManagerDialogProps> = ({
  open,
  onClose,
  onSelectPlaybook,
  currentPlaybookId
}) => {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newPlaybookName, setNewPlaybookName] = useState('')
  const [creatingNew, setCreatingNew] = useState(false)
  const [activeTab, setActiveTab] = useState(0) // 0 = My playbooks, 1 = Shared with me
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [playbookToDelete, setPlaybookToDelete] = useState<Playbook | null>(null)

  // Separate playbooks into owned and shared
  const { ownedPlaybooks, sharedPlaybooks } = useMemo(() => {
    const owned = playbooks.filter(p => !p.is_shared)
    const shared = playbooks.filter(p => p.is_shared)
    return { ownedPlaybooks: owned, sharedPlaybooks: shared }
  }, [playbooks])

  // Load playbooks when dialog opens
  useEffect(() => {
    if (open) {
      loadPlaybooks()
    }
  }, [open])

  const loadPlaybooks = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await playbookService.listPlaybooks()
      setPlaybooks(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load playbooks')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = async () => {
    if (!newPlaybookName.trim()) {
      setError('Please enter a playbook name')
      return
    }

    setCreatingNew(true)
    setError(null)
    try {
      const newPlaybook = await playbookService.createPlaybook({
        name: newPlaybookName.trim(),
        description: '',
        content: {
          modules: [],
          links: [],
          plays: [{
            id: 'play-1',
            name: 'Play 1',
            hosts: 'all',
            gatherFacts: true,
            become: false
          }],
          collapsedBlocks: [],
          collapsedBlockSections: [],
          metadata: {
            playbookName: newPlaybookName.trim()
          },
          variables: []
        }
      })

      setNewPlaybookName('')
      await loadPlaybooks()
      onSelectPlaybook(newPlaybook.id)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create playbook')
    } finally {
      setCreatingNew(false)
    }
  }

  const handleDeleteClick = (playbook: Playbook) => {
    // If playbook is shared with others, show the dialog
    if (playbook.shared_with_count && playbook.shared_with_count > 0) {
      setPlaybookToDelete(playbook)
      setDeleteDialogOpen(true)
    } else {
      // Simple delete confirmation for non-shared playbooks
      handleSimpleDelete(playbook.id, playbook.name)
    }
  }

  const handleSimpleDelete = async (playbookId: string, playbookName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${playbookName}" ? Cette action est irréversible.`)) {
      return
    }

    setError(null)
    try {
      await playbookService.deletePlaybook(playbookId)
      await loadPlaybooks()
    } catch (err: any) {
      setError(err.message || 'Failed to delete playbook')
    }
  }

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false)
    setPlaybookToDelete(null)
  }

  const handlePlaybookDeleted = async () => {
    await loadPlaybooks()
  }

  const handleOwnershipTransferred = async () => {
    await loadPlaybooks()
  }

  const handleSelectPlaybook = (playbookId: string) => {
    onSelectPlaybook(playbookId)
    onClose()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '500px'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DescriptionIcon />
          <Typography variant="h6">Playbook Manager</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Create New Playbook Section */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Create New Playbook
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Enter playbook name..."
              value={newPlaybookName}
              onChange={(e) => setNewPlaybookName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateNew()
                }
              }}
              disabled={creatingNew}
            />
            <Button
              variant="contained"
              startIcon={creatingNew ? <CircularProgress size={16} /> : <AddIcon />}
              onClick={handleCreateNew}
              disabled={creatingNew || !newPlaybookName.trim()}
            >
              Create
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Tabs for My Playbooks / Shared with me */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab
            icon={<PersonIcon />}
            iconPosition="start"
            label={`Mes playbooks (${ownedPlaybooks.length})`}
          />
          <Tab
            icon={<PeopleIcon />}
            iconPosition="start"
            label={`Partagés avec moi (${sharedPlaybooks.length})`}
          />
        </Tabs>

        {/* Playbooks List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (activeTab === 0 ? ownedPlaybooks : sharedPlaybooks).length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {activeTab === 0
                ? 'Aucun playbook. Créez votre premier playbook ci-dessus.'
                : 'Aucun playbook partagé avec vous.'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
            {(activeTab === 0 ? ownedPlaybooks : sharedPlaybooks).map((playbook) => (
              <ListItem
                key={playbook.id}
                disablePadding
                sx={{
                  mb: 1,
                  border: '1px solid',
                  borderColor: playbook.id === currentPlaybookId ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  bgcolor: playbook.id === currentPlaybookId ? 'primary.light' : 'background.paper',
                  '&:hover': {
                    bgcolor: playbook.id === currentPlaybookId ? 'primary.light' : 'action.hover'
                  }
                }}
              >
                <ListItemButton onClick={() => handleSelectPlaybook(playbook.id)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body1" fontWeight="bold">
                          {playbook.name}
                        </Typography>
                        {playbook.id === currentPlaybookId && (
                          <Chip label="Actuel" size="small" color="primary" />
                        )}
                        {playbook.is_shared && playbook.user_role && (
                          <Chip
                            icon={playbook.user_role === 'editor' ? <EditIcon /> : <VisibilityIcon />}
                            label={playbook.user_role === 'editor' ? 'Éditeur' : 'Lecteur'}
                            size="small"
                            color={playbook.user_role === 'editor' ? 'success' : 'default'}
                            variant="outlined"
                          />
                        )}
                        {/* Show sharing info for owned playbooks */}
                        {!playbook.is_shared && playbook.shared_with_count && playbook.shared_with_count > 0 && (
                          <Tooltip
                            title={
                              playbook.shared_with_users
                                ? `Partagé avec: ${playbook.shared_with_users.join(', ')}`
                                : `Partagé avec ${playbook.shared_with_count} utilisateur(s)`
                            }
                          >
                            <Chip
                              icon={<ShareIcon />}
                              label={`Partagé (${playbook.shared_with_count})`}
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          </Tooltip>
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        {playbook.is_shared && playbook.owner_username && (
                          <Typography variant="caption" component="span" display="block" sx={{ color: 'primary.main' }}>
                            Propriétaire: {playbook.owner_username}
                          </Typography>
                        )}
                        <Typography variant="caption" component="span" display="block">
                          Créé: {formatDate(playbook.created_at)}
                        </Typography>
                        <Typography variant="caption" component="span" display="block">
                          Modifié: {formatDate(playbook.updated_at)}
                        </Typography>
                      </>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItemButton>
                {/* Only show delete button for owned playbooks */}
                {!playbook.is_shared && (
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteClick(playbook)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>

      {/* Dialog for deleting shared playbooks */}
      <DeleteSharedPlaybookDialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
        playbook={playbookToDelete}
        onDeleted={handlePlaybookDeleted}
        onTransferred={handleOwnershipTransferred}
      />
    </Dialog>
  )
}

export default PlaybookManagerDialog
