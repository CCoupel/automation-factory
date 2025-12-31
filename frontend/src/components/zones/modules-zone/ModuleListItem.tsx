/**
 * ModuleListItem - Galaxy module list item with drag support
 */

import ExtensionIcon from '@mui/icons-material/Extension'
import { DraggableListItem } from './DraggableListItem'

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
}: ModuleListItemProps) => {
  return (
    <DraggableListItem
      dragData={{
        collection: `${namespace}.${collection}`,
        name: module.name,
        description: module.description,
      }}
      tooltip={{
        title: module.name,
        description: module.description || 'No description available',
        details: [
          { label: 'Type', value: module.content_type || 'module' },
          { label: 'Collection', value: `${namespace}.${collection}` },
        ],
        hint: 'Drag to add to playbook',
      }}
      primary={module.name}
      secondary={module.description || 'No description'}
      icon={<ExtensionIcon sx={{ mr: 1, fontSize: 18 }} />}
      hoverBgColor="primary.light"
    />
  )
}
