import {
  Box,
  Typography,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Tooltip,
} from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { Namespace } from '../../../services/ansibleApiService'

interface NamespaceListItemProps {
  namespace: Namespace
  onNavigate: (name: string) => void
  showFavoriteButton?: boolean
  isFavorite: boolean
  onToggleFavorite: (namespace: string, event: React.MouseEvent) => void
}

export const NamespaceListItem = ({
  namespace,
  onNavigate,
  showFavoriteButton = true,
  isFavorite,
  onToggleFavorite,
}: NamespaceListItemProps) => {
  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {namespace.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Ansible namespace containing collections
          </Typography>
          <Typography variant="caption" display="block">
            Collections: {namespace.collection_count || 0}
          </Typography>
          <Typography variant="caption" display="block">
            Total downloads: {(namespace.total_downloads || 0).toLocaleString()}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
            Click to browse collections
          </Typography>
        </Box>
      }
      placement="right"
      arrow
    >
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => onNavigate(namespace.name)}
          sx={{
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
          <ListItemText
            primary={namespace.name}
            secondary={`${namespace.collection_count || 0} collections • ${(namespace.total_downloads || 0).toLocaleString()} downloads`}
            primaryTypographyProps={{
              variant: 'body2',
              fontWeight: 'medium',
            }}
            secondaryTypographyProps={{
              variant: 'caption',
            }}
          />
          {showFavoriteButton && (
            <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
              <IconButton
                size="small"
                onClick={(e) => onToggleFavorite(namespace.name, e)}
                sx={{
                  mr: 1,
                  color: isFavorite ? 'warning.main' : 'text.secondary',
                  '&:hover': {
                    color: isFavorite ? 'warning.dark' : 'warning.light',
                  }
                }}
              >
                {isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          <ChevronRightIcon />
        </ListItemButton>
      </ListItem>
    </Tooltip>
  )
}
