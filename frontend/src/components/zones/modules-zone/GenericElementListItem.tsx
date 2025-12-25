import {
  Box,
  Typography,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material'
import AccountTreeIcon from '@mui/icons-material/AccountTree'

export interface GenericElement {
  name: string
  description: string
}

interface GenericElementListItemProps {
  element: GenericElement
}

export const GenericElementListItem = ({ element }: GenericElementListItemProps) => {
  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {element.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {element.description}
          </Typography>
          <Typography variant="caption" display="block">
            Type: Generic Ansible construct
          </Typography>
          <Typography variant="caption" display="block">
            Collection: ansible.generic
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
                collection: 'ansible.generic',
                name: element.name,
                description: element.description,
              })
            )
          }}
          sx={{
            '&:hover': {
              bgcolor: 'secondary.light',
              color: 'white',
            },
          }}
        >
          <AccountTreeIcon sx={{ mr: 1, fontSize: 18 }} />
          <ListItemText
            primary={element.name}
            secondary={element.description}
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
