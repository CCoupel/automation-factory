import React, { useState } from 'react'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import { useTranslation } from 'react-i18next'
import { ProjectArtifact } from '../../services/projectService'
import { returnSpecService, ReturnSpecEntry } from '../../services/returnSpecService'

interface ArgumentSpec {
  name: string
  type: string
  required: boolean
  default: any
  description: string
}

interface InterfaceTabProps {
  projectId: string
  rolePath: string
  metaArtifacts: ProjectArtifact[]
  returnSpecs: Record<string, ReturnSpecEntry>
  onReturnSpecsChange: (specs: Record<string, ReturnSpecEntry>) => void
}

const VALID_TYPES = ['str', 'int', 'bool', 'list', 'dict', 'float', 'any']
const VALID_SCOPES = ['host', 'play', 'global']

const emptyEntry: ReturnSpecEntry = {
  type: 'str',
  description: '',
  scope: 'host',
  always_set: false,
  choices: null,
  elements: null,
  depends_on: null,
}

const InterfaceTab: React.FC<InterfaceTabProps> = ({
  projectId,
  rolePath,
  metaArtifacts,
  returnSpecs,
  onReturnSpecsChange,
}) => {
  const { t } = useTranslation('project')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formEntry, setFormEntry] = useState<ReturnSpecEntry>({ ...emptyEntry })
  const [inferring, setInferring] = useState(false)

  // Parse argument_specs from meta artifacts
  const argumentSpecs: ArgumentSpec[] = React.useMemo(() => {
    const argSpecArtifact = metaArtifacts.find(a => a.path.endsWith('argument_specs.yml'))
    if (!argSpecArtifact?.content) return []

    const specs: ArgumentSpec[] = []
    const data = argSpecArtifact.content
    // argument_specs format: {entrypoint: {short_description, options: {arg: {type, ...}}}}
    for (const entrypoint of Object.values(data) as any[]) {
      const options = entrypoint?.options || entrypoint?.argument_specs?.options || {}
      for (const [name, spec] of Object.entries(options) as [string, any][]) {
        specs.push({
          name,
          type: spec?.type || 'str',
          required: spec?.required || false,
          default: spec?.default,
          description: spec?.description || '',
        })
      }
    }
    return specs
  }, [metaArtifacts])

  // Parse dependencies from meta/main.yml
  const dependencies: string[] = React.useMemo(() => {
    const mainMeta = metaArtifacts.find(a => a.path.endsWith('meta/main.yml'))
    if (!mainMeta?.content) return []
    const deps = mainMeta.content.dependencies
    if (!Array.isArray(deps)) return []
    return deps.map((d: any) => (typeof d === 'string' ? d : d.role || JSON.stringify(d)))
  }, [metaArtifacts])

  const handleAdd = () => {
    setEditingName(null)
    setFormName('')
    setFormEntry({ ...emptyEntry })
    setDialogOpen(true)
  }

  const handleEdit = (name: string) => {
    setEditingName(name)
    setFormName(name)
    setFormEntry({ ...returnSpecs[name] })
    setDialogOpen(true)
  }

  const handleDelete = (name: string) => {
    const next = { ...returnSpecs }
    delete next[name]
    onReturnSpecsChange(next)
  }

  const handleSave = () => {
    if (!formName.trim()) return
    const next = { ...returnSpecs }
    if (editingName && editingName !== formName) {
      delete next[editingName]
    }
    next[formName.trim()] = formEntry
    onReturnSpecsChange(next)
    setDialogOpen(false)
  }

  const handleInfer = async () => {
    setInferring(true)
    try {
      const result = await returnSpecService.inferReturnSpecs(projectId, rolePath)
      if (Object.keys(result.inferred).length > 0) {
        const merged = { ...returnSpecs }
        for (const [name, spec] of Object.entries(result.inferred)) {
          if (!merged[name]) {
            merged[name] = spec
          }
        }
        onReturnSpecsChange(merged)
      }
    } catch (error) {
      console.error('Failed to infer return specs:', error)
    } finally {
      setInferring(false)
    }
  }

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Inputs (argument_specs) */}
      <Box>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('inputs')}
        </Typography>
        {argumentSpecs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('noArgumentSpecs')}
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('variableName')}</TableCell>
                  <TableCell>{t('variableType')}</TableCell>
                  <TableCell>Required</TableCell>
                  <TableCell>Default</TableCell>
                  <TableCell>{t('description')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {argumentSpecs.map(spec => (
                  <TableRow key={spec.name}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{spec.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={spec.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{spec.required ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                        {spec.default !== undefined ? String(spec.default) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{spec.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Outputs (return_specs) */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {t('outputs')}
          </Typography>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            {t('addOutput')}
          </Button>
          <Button
            size="small"
            startIcon={<AutoFixHighIcon />}
            onClick={handleInfer}
            disabled={inferring}
          >
            {t('inferReturnSpecs')}
          </Button>
        </Box>
        {Object.keys(returnSpecs).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('noReturnSpecs')}
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('variableName')}</TableCell>
                  <TableCell>{t('variableType')}</TableCell>
                  <TableCell>{t('variableScope')}</TableCell>
                  <TableCell>{t('alwaysSet')}</TableCell>
                  <TableCell>{t('description')}</TableCell>
                  <TableCell width={80} />
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(returnSpecs).map(([name, spec]) => (
                  <TableRow key={name}>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">{name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={spec.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{t(`scope_${spec.scope}`)}</TableCell>
                    <TableCell>{spec.always_set ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{spec.description}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(name)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(name)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Dependencies */}
      <Box>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('dependencies')}
        </Typography>
        {dependencies.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('noDependencies')}
          </Typography>
        ) : (
          <List dense>
            {dependencies.map((dep, i) => (
              <ListItem key={i}>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontFamily="monospace">{dep}</Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingName ? t('editOutput') : t('addOutput')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField
            label={t('variableName')}
            value={formName}
            onChange={e => setFormName(e.target.value)}
            fullWidth
            size="small"
            disabled={!!editingName}
          />
          <FormControl size="small" fullWidth>
            <InputLabel>{t('variableType')}</InputLabel>
            <Select
              value={formEntry.type}
              label={t('variableType')}
              onChange={e => setFormEntry({ ...formEntry, type: e.target.value })}
            >
              {VALID_TYPES.map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>{t('variableScope')}</InputLabel>
            <Select
              value={formEntry.scope}
              label={t('variableScope')}
              onChange={e => setFormEntry({ ...formEntry, scope: e.target.value })}
            >
              {VALID_SCOPES.map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={t('description')}
            value={formEntry.description}
            onChange={e => setFormEntry({ ...formEntry, description: e.target.value })}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formEntry.always_set}
                onChange={e => setFormEntry({ ...formEntry, always_set: e.target.checked })}
              />
            }
            label={t('alwaysSet')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default InterfaceTab
