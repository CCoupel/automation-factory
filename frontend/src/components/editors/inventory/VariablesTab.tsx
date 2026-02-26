import React, { useState } from 'react'
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  TextField,
  IconButton,
  Button,
  Divider,
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import FolderIcon from '@mui/icons-material/Folder'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { InventoryData } from '../../../services/inventoryService'

interface VariablesTabProps {
  data: InventoryData
  onChange: (data: InventoryData) => void
}

type Selection = { type: 'host'; name: string } | { type: 'group'; name: string }

const VariablesTab: React.FC<VariablesTabProps> = ({ data, onChange }) => {
  const { t } = useTranslation('project')
  const [selected, setSelected] = useState<Selection | null>(null)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const getVariables = (): Record<string, any> => {
    if (!selected) return {}
    if (selected.type === 'host') {
      const host = data.hosts.find(h => h.name === selected.name)
      return host?.variables || {}
    }
    const group = data.groups.find(g => g.name === selected.name)
    return group?.variables || {}
  }

  const updateVariables = (newVars: Record<string, any>) => {
    if (!selected) return

    if (selected.type === 'host') {
      onChange({
        ...data,
        hosts: data.hosts.map(h =>
          h.name === selected.name ? { ...h, variables: newVars } : h
        ),
      })
    } else {
      onChange({
        ...data,
        groups: data.groups.map(g =>
          g.name === selected.name ? { ...g, variables: newVars } : g
        ),
      })
    }
  }

  const handleAddVariable = () => {
    if (!newKey.trim()) return
    const vars = { ...getVariables() }

    // Try to parse value as JSON for structured types
    let parsedValue: any = newValue
    try {
      parsedValue = JSON.parse(newValue)
    } catch {
      // Keep as string
    }

    vars[newKey.trim()] = parsedValue
    updateVariables(vars)
    setNewKey('')
    setNewValue('')
  }

  const handleDeleteVariable = (key: string) => {
    const vars = { ...getVariables() }
    delete vars[key]
    updateVariables(vars)
  }

  const handleUpdateValue = (key: string, value: string) => {
    const vars = { ...getVariables() }
    try {
      vars[key] = JSON.parse(value)
    } catch {
      vars[key] = value
    }
    updateVariables(vars)
  }

  const variables = getVariables()
  const varEntries = Object.entries(variables)

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* Left pane - selection */}
      <Box sx={{ width: 220, borderRight: '1px solid', borderColor: 'divider', overflow: 'auto', flexShrink: 0 }}>
        {data.hosts.length > 0 && (
          <>
            <Typography variant="caption" sx={{ px: 1.5, py: 0.5, display: 'block', fontWeight: 'bold' }}>
              {t('hostVariables')}
            </Typography>
            <List dense disablePadding>
              {data.hosts.map(host => (
                <ListItemButton
                  key={`host-${host.name}`}
                  selected={selected?.type === 'host' && selected.name === host.name}
                  onClick={() => setSelected({ type: 'host', name: host.name })}
                  sx={{ py: 0.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2" noWrap>{host.name}</Typography>}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
        {data.groups.length > 0 && (
          <>
            <Divider />
            <Typography variant="caption" sx={{ px: 1.5, py: 0.5, display: 'block', fontWeight: 'bold' }}>
              {t('groupVariables')}
            </Typography>
            <List dense disablePadding>
              {data.groups.map(group => (
                <ListItemButton
                  key={`group-${group.name}`}
                  selected={selected?.type === 'group' && selected.name === group.name}
                  onClick={() => setSelected({ type: 'group', name: group.name })}
                  sx={{ py: 0.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <FolderIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2" noWrap>{group.name}</Typography>}
                  />
                </ListItemButton>
              ))}
            </List>
          </>
        )}
      </Box>

      {/* Right pane - variable editor */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {!selected ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" color="text.secondary">
              {t('selectArtifact')}
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {selected.type === 'host' ? t('hostVariables') : t('groupVariables')}: {selected.name}
            </Typography>

            {/* Existing variables */}
            {varEntries.map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  value={key}
                  disabled
                  sx={{ width: 180 }}
                  label="Key"
                />
                <TextField
                  size="small"
                  value={typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  onChange={e => handleUpdateValue(key, e.target.value)}
                  sx={{ flex: 1 }}
                  label="Value"
                />
                <IconButton size="small" onClick={() => handleDeleteVariable(key)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}

            {/* Add new variable */}
            <Box sx={{ display: 'flex', gap: 1, mt: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                placeholder="key"
                sx={{ width: 180 }}
                onKeyDown={e => { if (e.key === 'Enter') handleAddVariable() }}
              />
              <TextField
                size="small"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="value"
                sx={{ flex: 1 }}
                onKeyDown={e => { if (e.key === 'Enter') handleAddVariable() }}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={handleAddVariable}
                disabled={!newKey.trim()}
                startIcon={<AddIcon />}
              >
                {t('addHost', { defaultValue: 'Add' }).split(' ')[0]}
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}

export default VariablesTab
