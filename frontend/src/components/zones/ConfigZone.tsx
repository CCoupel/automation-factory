import { Box, Typography, TextField, Paper, Divider, Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip, Button } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AssignmentIcon from '@mui/icons-material/Assignment'
import ExtensionIcon from '@mui/icons-material/Extension'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteIcon from '@mui/icons-material/Delete'

interface ConfigZoneProps {
  selectedModule?: {
    id: string
    name: string
    collection: string
    taskName: string
    when?: string
    ignoreErrors?: boolean
    become?: boolean
    loop?: string
    delegateTo?: string
    isBlock?: boolean
    isPlay?: boolean
  } | null
  onCollapse?: () => void
  onDelete?: (id: string) => void
  onUpdateModule?: (id: string, updates: Partial<{
    when?: string
    ignoreErrors?: boolean
    become?: boolean
    loop?: string
    delegateTo?: string
  }>) => void
}

// Configuration des modules (à déplacer vers un fichier de config plus tard)
const moduleConfigs: Record<string, Array<{ name: string; type: string; required: boolean; description: string; default?: string }>> = {
  copy: [
    { name: 'src', type: 'text', required: true, description: 'Source file path' },
    { name: 'dest', type: 'text', required: true, description: 'Destination file path' },
    { name: 'owner', type: 'text', required: false, description: 'File owner' },
    { name: 'group', type: 'text', required: false, description: 'File group' },
    { name: 'mode', type: 'text', required: false, description: 'File permissions', default: '0644' },
    { name: 'backup', type: 'select', required: false, description: 'Create a backup file', default: 'no' },
  ],
  service: [
    { name: 'name', type: 'text', required: true, description: 'Service name' },
    { name: 'state', type: 'select', required: true, description: 'Service state', default: 'started' },
    { name: 'enabled', type: 'select', required: false, description: 'Enable on boot', default: 'yes' },
  ],
  file: [
    { name: 'path', type: 'text', required: true, description: 'File or directory path' },
    { name: 'state', type: 'select', required: false, description: 'File state', default: 'file' },
    { name: 'owner', type: 'text', required: false, description: 'File owner' },
    { name: 'group', type: 'text', required: false, description: 'File group' },
    { name: 'mode', type: 'text', required: false, description: 'File permissions' },
  ],
}

const ConfigZone = ({ selectedModule, onCollapse, onDelete, onUpdateModule }: ConfigZoneProps) => {
  const moduleConfig = selectedModule ? moduleConfigs[selectedModule.name] || [] : []

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #ddd', bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Configuration
            </Typography>
          </Box>
          {onCollapse && (
            <Tooltip title="Hide Configuration">
              <IconButton size="small" onClick={onCollapse}>
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {selectedModule ? 'Configure the selected task' : 'Select a module to configure'}
        </Typography>

        {/* Bouton de suppression */}
        {selectedModule && onDelete && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="error"
              size="small"
              fullWidth
              startIcon={<DeleteIcon />}
              onClick={() => onDelete(selectedModule.id)}
            >
              Delete Task
            </Button>
          </Box>
        )}
      </Box>

      {/* Config Form */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!selectedModule ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Click on a module in the workspace to configure it
            </Typography>
          </Box>
        ) : (
          <>
            {/* Section 1: Attributs de la Tâche */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Task Attributes
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    label="name"
                    fullWidth
                    size="small"
                    value={selectedModule.taskName}
                    helperText="Task name (displayed in playbook)"
                  />

                  <TextField
                    label="when"
                    fullWidth
                    size="small"
                    placeholder="ansible_os_family == 'Debian'"
                    helperText="Conditional execution"
                    value={selectedModule.when || ''}
                    onChange={(e) => onUpdateModule?.(selectedModule.id, { when: e.target.value || undefined })}
                  />

                  {/* Loop - SEULEMENT pour les tâches, pas les blocks */}
                  {!selectedModule.isBlock && !selectedModule.isPlay && (
                    <TextField
                      label="loop"
                      fullWidth
                      size="small"
                      placeholder="{{ item_list }}"
                      helperText="Loop over items"
                      value={selectedModule.loop || ''}
                      onChange={(e) => onUpdateModule?.(selectedModule.id, { loop: e.target.value || undefined })}
                    />
                  )}

                  <TextField
                    label="tags"
                    fullWidth
                    size="small"
                    placeholder="setup, config"
                    helperText="Task tags (comma separated)"
                  />

                  <TextField
                    label="ignore_errors"
                    fullWidth
                    size="small"
                    select
                    SelectProps={{ native: true }}
                    helperText="Continue on error"
                    value={selectedModule.ignoreErrors ? 'yes' : 'no'}
                    onChange={(e) => onUpdateModule?.(selectedModule.id, { ignoreErrors: e.target.value === 'yes' })}
                  >
                    <option value="no">no</option>
                    <option value="yes">yes</option>
                  </TextField>

                  <TextField
                    label="become"
                    fullWidth
                    size="small"
                    select
                    SelectProps={{ native: true }}
                    helperText="Execute with sudo"
                    value={selectedModule.become ? 'yes' : 'no'}
                    onChange={(e) => onUpdateModule?.(selectedModule.id, { become: e.target.value === 'yes' })}
                  >
                    <option value="no">no</option>
                    <option value="yes">yes</option>
                  </TextField>

                  <TextField
                    label="delegate_to"
                    fullWidth
                    size="small"
                    placeholder="hostname or {{ inventory_hostname }}"
                    helperText="Delegate task to another host"
                    value={selectedModule.delegateTo || ''}
                    onChange={(e) => onUpdateModule?.(selectedModule.id, { delegateTo: e.target.value || undefined })}
                  />
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Section 2: Attributs du Module */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ExtensionIcon color="secondary" fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Module: {selectedModule.collection}.{selectedModule.name}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {moduleConfig.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No configuration available for this module yet
                    </Typography>
                  ) : (
                    moduleConfig.map((param) => (
                      <TextField
                        key={param.name}
                        label={param.name + (param.required ? ' *' : '')}
                        fullWidth
                        size="small"
                        type={param.type === 'text' ? 'text' : undefined}
                        select={param.type === 'select'}
                        SelectProps={param.type === 'select' ? { native: true } : undefined}
                        helperText={param.description}
                        defaultValue={param.default || ''}
                      >
                        {param.type === 'select' && param.name === 'backup' && (
                          <>
                            <option value="no">no</option>
                            <option value="yes">yes</option>
                          </>
                        )}
                        {param.type === 'select' && param.name === 'state' && selectedModule.name === 'service' && (
                          <>
                            <option value="started">started</option>
                            <option value="stopped">stopped</option>
                            <option value="restarted">restarted</option>
                            <option value="reloaded">reloaded</option>
                          </>
                        )}
                        {param.type === 'select' && param.name === 'state' && selectedModule.name === 'file' && (
                          <>
                            <option value="file">file</option>
                            <option value="directory">directory</option>
                            <option value="absent">absent</option>
                            <option value="link">link</option>
                          </>
                        )}
                        {param.type === 'select' && param.name === 'enabled' && (
                          <>
                            <option value="yes">yes</option>
                            <option value="no">no</option>
                          </>
                        )}
                      </TextField>
                    ))
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="caption" color="text.secondary">
                  * Required fields
                </Typography>
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </Box>
    </Box>
  )
}

export default ConfigZone
