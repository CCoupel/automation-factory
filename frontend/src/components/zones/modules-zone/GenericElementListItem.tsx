/**
 * GenericElementListItem - Generic Ansible element (block, include, etc.)
 */

import AccountTreeIcon from '@mui/icons-material/AccountTree'
import { DraggableListItem } from './DraggableListItem'

export interface GenericElement {
  name: string
  description: string
}

interface GenericElementListItemProps {
  element: GenericElement
}

export const GenericElementListItem = ({ element }: GenericElementListItemProps) => {
  return (
    <DraggableListItem
      dragData={{
        collection: 'ansible.generic',
        name: element.name,
        description: element.description,
      }}
      tooltip={{
        title: element.name,
        description: element.description,
        details: [
          { label: 'Type', value: 'Generic Ansible construct' },
          { label: 'Collection', value: 'ansible.generic' },
        ],
        hint: 'Drag to add to playbook',
      }}
      primary={element.name}
      secondary={element.description}
      icon={<AccountTreeIcon sx={{ mr: 1, fontSize: 18 }} />}
      hoverBgColor="secondary.light"
    />
  )
}
