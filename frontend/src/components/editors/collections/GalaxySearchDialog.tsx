import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { collectionService, CollectionSearchResult } from '../../../services/collectionService'

interface GalaxySearchDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (fqcn: string, version: string) => void
  projectId: string
}

const GalaxySearchDialog: React.FC<GalaxySearchDialogProps> = ({ open, onClose, onAdd, projectId }) => {
  const { t } = useTranslation('project')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CollectionSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const data = await collectionService.searchCollections(projectId, searchQuery)
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(query)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('searchGalaxy')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          placeholder={t('searchGalaxyPlaceholder')}
          fullWidth
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            {t('searchNoResults')}
          </Typography>
        )}

        {!loading && results.length > 0 && (
          <List dense>
            {results.map(result => (
              <ListItem
                key={result.fqcn}
                secondaryAction={
                  <Button size="small" variant="outlined" onClick={() => onAdd(result.fqcn, result.version)}>
                    {t('addFromGalaxy')}
                  </Button>
                }
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{result.fqcn}</Typography>
                      <Typography variant="caption" color="text.secondary">v{result.version}</Typography>
                      {result.download_count != null && (
                        <Typography variant="caption" color="text.secondary">
                          ({result.download_count.toLocaleString()} downloads)
                        </Typography>
                      )}
                    </Box>
                  }
                  secondary={result.description}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default GalaxySearchDialog
