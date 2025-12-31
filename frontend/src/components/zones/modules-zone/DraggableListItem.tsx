/**
 * DraggableListItem - Base component for draggable module list items
 *
 * Used by ModuleListItem and GenericElementListItem to eliminate duplication.
 * Provides consistent drag-and-drop behavior and tooltip display.
 */

import { ReactNode } from 'react'
import {
  Box,
  Typography,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  SxProps,
  Theme,
} from '@mui/material'

export interface DraggableItemData {
  collection: string
  name: string
  description?: string
}

export interface TooltipInfo {
  title: string
  description?: string
  details?: Array<{ label: string; value: string | ReactNode }>
  hint?: string
}

interface DraggableListItemProps {
  /** Data to be set on drag */
  dragData: DraggableItemData
  /** Tooltip content */
  tooltip: TooltipInfo
  /** Primary text */
  primary: string
  /** Secondary text */
  secondary?: string
  /** Icon to display */
  icon: ReactNode
  /** Hover background color */
  hoverBgColor?: string
  /** Additional styles for the ListItemButton */
  sx?: SxProps<Theme>
}

/**
 * Reusable draggable list item component with tooltip
 */
export const DraggableListItem = ({
  dragData,
  tooltip,
  primary,
  secondary,
  icon,
  hoverBgColor = 'primary.light',
  sx,
}: DraggableListItemProps) => {
  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {tooltip.title}
          </Typography>
          {tooltip.description && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              {tooltip.description}
            </Typography>
          )}
          {tooltip.details?.map((detail, index) => (
            <Typography key={index} variant="caption" display="block">
              {detail.label}: {detail.value}
            </Typography>
          ))}
          {tooltip.hint && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
              {tooltip.hint}
            </Typography>
          )}
        </Box>
      }
      placement="right"
      arrow
    >
      <ListItem disablePadding>
        <ListItemButton
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('module', JSON.stringify(dragData))
          }}
          sx={{
            '&:hover': {
              bgcolor: hoverBgColor,
              color: 'white',
            },
            ...sx,
          }}
        >
          {icon}
          <ListItemText
            primary={primary}
            secondary={secondary}
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
