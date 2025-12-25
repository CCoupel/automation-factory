import {
  Box,
  Typography,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
} from '@mui/material'
import ExtensionIcon from '@mui/icons-material/Extension'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { isVersionCompatible, getIncompatibilityReason } from '../../../utils/versionUtils'

export interface Collection {
  name: string
  description?: string
  latest_version: string
  download_count: number
  created_at: string
  updated_at: string
  requires_ansible?: string
  deprecated?: boolean
}

interface CollectionListItemProps {
  collection: Collection
  namespace: string
  ansibleVersion: string
  onNavigateToVersions: (namespace: string, collection: string) => void
  onNavigateToModules: (namespace: string, collection: string, version: string) => void
}

export const CollectionListItem = ({
  collection,
  namespace,
  ansibleVersion,
  onNavigateToVersions,
  onNavigateToModules,
}: CollectionListItemProps) => {
  const isIncompatible = collection.requires_ansible &&
    !isVersionCompatible(ansibleVersion, collection.requires_ansible)

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {collection.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {collection.description || 'No description available'}
          </Typography>
          <Typography variant="caption" display="block">
            Latest version: {collection.latest_version}
          </Typography>
          {collection.requires_ansible && (
            <Typography variant="caption" display="block">
              Requires Ansible: {collection.requires_ansible}
            </Typography>
          )}
          <Typography variant="caption" display="block">
            Downloads: {collection.download_count.toLocaleString()}
          </Typography>
          <Typography variant="caption" display="block">
            Created: {new Date(collection.created_at).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" display="block">
            Updated: {new Date(collection.updated_at).toLocaleDateString()}
          </Typography>
          {collection.deprecated && (
            <Typography variant="caption" display="block" color="warning.main">
              ⚠️ Deprecated
            </Typography>
          )}
          {isIncompatible && (
            <Typography variant="caption" display="block" color="error.main" sx={{ fontWeight: 'bold' }}>
              ⚠️ {getIncompatibilityReason(ansibleVersion, collection.requires_ansible!)}
            </Typography>
          )}
          <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
            Left click: browse versions • Right click: latest version
          </Typography>
        </Box>
      }
      placement="right"
      arrow
    >
      <ListItem disablePadding>
        <ListItemButton
          onClick={() => onNavigateToVersions(namespace, collection.name)}
          onContextMenu={(e) => {
            e.preventDefault()
            onNavigateToModules(namespace, collection.name, collection.latest_version)
          }}
          disabled={isIncompatible}
          sx={{
            opacity: isIncompatible ? 0.4 : 1,
            '&:hover': {
              bgcolor: isIncompatible ? 'transparent' : 'action.hover',
              cursor: isIncompatible ? 'not-allowed' : 'context-menu',
            },
          }}
        >
          <ExtensionIcon sx={{
            mr: 1,
            color: isIncompatible ? 'error.main' : 'secondary.main'
          }} />
          <ListItemText
            primary={collection.name}
            secondary={
              <>
                <Typography component="span" variant="caption" display="block">
                  {collection.description || 'No description'}
                </Typography>
                <Typography component="span" variant="caption" color="text.secondary" display="block">
                  v{collection.latest_version} • {collection.download_count.toLocaleString()} downloads
                </Typography>
                {isIncompatible && (
                  <Typography component="span" variant="caption" color="error.main" display="block" sx={{ fontWeight: 'bold' }}>
                    ⚠️ Incompatible with Ansible {ansibleVersion}
                  </Typography>
                )}
              </>
            }
            primaryTypographyProps={{
              variant: 'body2',
              fontWeight: 'medium',
              color: isIncompatible ? 'text.disabled' : 'text.primary'
            }}
            secondaryTypographyProps={{
              component: 'div'
            }}
          />
          <ChevronRightIcon sx={{ color: isIncompatible ? 'text.disabled' : 'inherit' }} />
        </ListItemButton>
      </ListItem>
    </Tooltip>
  )
}
