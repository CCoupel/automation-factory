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
import SearchIcon from '@mui/icons-material/Search'
import { useTranslation } from 'react-i18next'
import { CollectionRequirement } from '../../../services/collectionService'

interface CollectionsTabProps {
  collections: CollectionRequirement[]
  onChange: (collections: CollectionRequirement[]) => void
  onSearchGalaxy: () => void
}

const CollectionsTab: React.FC<CollectionsTabProps> = ({ collections, onChange, onSearchGalaxy }) => {
  const { t } = useTranslation('project')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [newCollection, setNewCollection] = useState<CollectionRequirement>({
    name: '', version: null, source: null,
  })

  const handleAdd = () => {
    if (!newCollection.name.trim()) return
    onChange([...collections, {
      name: newCollection.name.trim(),
      version: newCollection.version?.trim() || null,
      source: newCollection.source?.trim() || null,
    }])
    setNewCollection({ name: '', version: null, source: null })
    setAddDialogOpen(false)
  }

  const handleDelete = (index: number) => {
    onChange(collections.filter((_, i) => i !== index))
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
          {t('addCollection')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={onSearchGalaxy}
        >
          {t('searchGalaxy')}
        </Button>
      </Box>

      {collections.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t('noCollections')}
        </Typography>
      ) : (
        <List dense>
          {collections.map((col, index) => (
            <ListItem
              key={`${col.name}-${index}`}
              secondaryAction={
                deleteConfirm === index ? (
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <Typography variant="caption" color="error">
                      {t('deleteCollectionConfirm', { name: col.name })}
                    </Typography>
                    <Button size="small" color="error" onClick={() => handleDelete(index)}>
                      {t('delete')}
                    </Button>
                    <Button size="small" onClick={() => setDeleteConfirm(null)}>
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Tooltip title={t('deleteCollection')}>
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
                    <Typography variant="body2" fontWeight="bold">{col.name}</Typography>
                    {col.version && (
                      <Chip label={col.version} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                    )}
                  </Box>
                }
                secondary={col.source || undefined}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Add Collection Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('addCollection')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('collectionName')}
            placeholder={t('collectionNamePlaceholder')}
            fullWidth
            value={newCollection.name}
            onChange={e => setNewCollection(prev => ({ ...prev, name: e.target.value }))}
          />
          <TextField
            margin="dense"
            label={t('versionConstraint')}
            placeholder={t('versionPlaceholder')}
            fullWidth
            value={newCollection.version || ''}
            onChange={e => setNewCollection(prev => ({ ...prev, version: e.target.value || null }))}
          />
          <TextField
            margin="dense"
            label={t('sourceUrl')}
            fullWidth
            value={newCollection.source || ''}
            onChange={e => setNewCollection(prev => ({ ...prev, source: e.target.value || null }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!newCollection.name.trim()}>
            {t('addCollection')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CollectionsTab
