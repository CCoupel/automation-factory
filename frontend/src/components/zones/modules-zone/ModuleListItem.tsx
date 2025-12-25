import {
  Box,
  Typography,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material'
import ExtensionIcon from '@mui/icons-material/Extension'

export interface ModuleInfo {
  name: string
  description?: string
  content_type?: string
}

interface ModuleListItemProps {
  module: ModuleInfo
  namespace: string
  collection: string
  index: number
}

export const ModuleListItem = ({
  module,
  namespace,
  collection,
  index,
}: ModuleListItemProps) => {
  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {module.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {module.description || 'No description available'}
          </Typography>
          <Typography variant="caption" display="block">
            Type: {module.content_type}
          </Typography>
          <Typography variant="caption" display="block">
            Collection: {namespace}.{collection}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
            Drag to add to playbook
          </Typography>
        </Box>
      }
      placement="right"
      arrow
    >
      <ListItem disablePadding>
        <ListItemButton
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(
              'module',
              JSON.stringify({
                collection: `${namespace}.${collection}`,
                name: module.name,
                description: module.description,
              })
            )
          }}
          sx={{
            '&:hover': {
              bgcolor: 'primary.light',
              color: 'white',
            },
          }}
        >
          <ExtensionIcon sx={{ mr: 1, fontSize: 18 }} />
          <ListItemText
            primary={module.name}
            secondary={module.description || 'No description'}
            primaryTypographyProps={{
              variant: 'body2',
              fontWeight: 'medium',
            }}
            secondaryTypographyProps={{
              variant: 'caption',
              sx: { fontSize: '0.7rem' },
            }}
          />
        </ListItemButton>
      </ListItem>
    </Tooltip>
  )
}
