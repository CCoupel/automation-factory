import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  AlertTitle,
  Checkbox,
  FormControlLabel,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Paper,
  Chip,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import InfoIcon from '@mui/icons-material/Info'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import {
  importDiagram,
  readFileAsText,
  ImportResult
} from '../../services/diagramImportService'
import { ValidationError, ImportOptions, DIAGRAM_FORMAT } from '../../types/diagram-export'

interface ImportDiagramDialogProps {
  open: boolean
  onClose: () => void
  onImport: (result: ImportResult) => void
}

const ImportDiagramDialog: React.FC<ImportDiagramDialogProps> = ({
  open,
  onClose,
  onImport
}) => {
  // State
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Options
  const [restoreUIState, setRestoreUIState] = useState(true)
  const [validateIntegrity, setValidateIntegrity] = useState(true)

  // Reset state when dialog closes
  const handleClose = useCallback(() => {
    setFile(null)
    setResult(null)
    setDragOver(false)
    setShowDetails(false)
    setLoading(false)
    onClose()
  }, [onClose])

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    // Validate file extension
    if (!selectedFile.name.endsWith(DIAGRAM_FORMAT.FILE_EXTENSION)) {
      setResult({
        success: false,
        plays: [],
        uiState: {
          collapsedBlocks: [],
          collapsedBlockSections: [],
          collapsedPlaySections: [],
          activePlayIndex: 0,
        },
        metadata: { name: 'Invalid File' },
        validation: {
          valid: false,
          canImport: false,
          needsMigration: false,
          errors: [{
            code: 'INVALID_EXTENSION',
            message: `Invalid file extension. Expected ${DIAGRAM_FORMAT.FILE_EXTENSION}`,
            severity: 'error',
          }],
          warnings: [],
          info: [],
        },
      })
      return
    }

    setFile(selectedFile)
    setLoading(true)
    setResult(null)

    try {
      const content = await readFileAsText(selectedFile)
      const options: ImportOptions = {
        restoreUIState,
        validateIntegrity,
        allowWarnings: false,
      }
      const importResult = await importDiagram(content, options)
      setResult(importResult)
    } catch (error) {
      setResult({
        success: false,
        plays: [],
        uiState: {
          collapsedBlocks: [],
          collapsedBlockSections: [],
          collapsedPlaySections: [],
          activePlayIndex: 0,
        },
        metadata: { name: 'Read Error' },
        validation: {
          valid: false,
          canImport: false,
          needsMigration: false,
          errors: [{
            code: 'READ_ERROR',
            message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error',
          }],
          warnings: [],
          info: [],
        },
      })
    } finally {
      setLoading(false)
    }
  }, [restoreUIState, validateIntegrity])

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  // Handle import confirmation
  const handleImport = () => {
    if (result && result.success) {
      onImport(result)
      handleClose()
    }
  }

  // Render validation messages
  const renderValidationMessages = (
    messages: ValidationError[],
    type: 'error' | 'warning' | 'info'
  ) => {
    if (messages.length === 0) return null

    const icon = type === 'error' ? <ErrorIcon color="error" /> :
      type === 'warning' ? <WarningIcon color="warning" /> :
      <InfoIcon color="info" />

    return (
      <List dense disablePadding>
        {messages.map((msg, index) => (
          <ListItem key={`${type}-${index}`} disablePadding sx={{ py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              {icon}
            </ListItemIcon>
            <ListItemText
              primary={msg.message}
              secondary={msg.field ? `Field: ${msg.field}` : undefined}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Diagram</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* File Drop Zone */}
          <Paper
            variant="outlined"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: dragOver ? 'action.hover' : 'background.paper',
              borderStyle: 'dashed',
              borderColor: dragOver ? 'primary.main' : 'divider',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'action.hover',
                borderColor: 'primary.main',
              },
            }}
            onClick={() => document.getElementById('diagram-file-input')?.click()}
          >
            <input
              id="diagram-file-input"
              type="file"
              accept={DIAGRAM_FORMAT.FILE_EXTENSION}
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />
            <UploadFileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="body1" gutterBottom>
              {file ? file.name : 'Drop a diagram file here or click to select'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported format: {DIAGRAM_FORMAT.FILE_EXTENSION} (Automation Factory Diagram)
            </Typography>
          </Paper>

          {/* Loading */}
          {loading && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Validating file...
              </Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Validation Result */}
          {result && !loading && (
            <Box>
              {result.success ? (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  <AlertTitle>Valid Diagram</AlertTitle>
                  <Typography variant="body2">
                    <strong>{result.metadata.name}</strong> - {result.plays.length} play(s)
                  </Typography>
                  {result.validation.needsMigration && (
                    <Chip
                      size="small"
                      label={`Migrated from v${result.validation.sourceVersion} to v${result.validation.targetVersion}`}
                      color="info"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Alert>
              ) : (
                <Alert severity="error">
                  <AlertTitle>Import Failed</AlertTitle>
                  <Typography variant="body2">
                    The file cannot be imported due to validation errors.
                  </Typography>
                </Alert>
              )}

              {/* Warnings */}
              {result.validation.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <AlertTitle>Warnings ({result.validation.warnings.length})</AlertTitle>
                  {renderValidationMessages(result.validation.warnings, 'warning')}
                </Alert>
              )}

              {/* Errors */}
              {result.validation.errors.length > 0 && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  <AlertTitle>Errors ({result.validation.errors.length})</AlertTitle>
                  {renderValidationMessages(result.validation.errors, 'error')}
                </Alert>
              )}

              {/* Details Toggle */}
              {(result.validation.info.length > 0 || result.success) && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    onClick={() => setShowDetails(!showDetails)}
                  >
                    {showDetails ? 'Hide' : 'Show'} Details
                  </Button>
                  <Collapse in={showDetails}>
                    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                      {result.success && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Content Summary
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip size="small" label={`${result.plays.length} Play(s)`} />
                            <Chip
                              size="small"
                              label={`${result.plays.reduce((s, p) => s + p.modules.length, 0)} Module(s)`}
                            />
                            <Chip
                              size="small"
                              label={`${result.plays.reduce((s, p) => s + p.links.length, 0)} Link(s)`}
                            />
                            <Chip
                              size="small"
                              label={`${result.plays.reduce((s, p) => s + (p.variables?.length || 0), 0)} Variable(s)`}
                            />
                          </Box>
                        </Box>
                      )}
                      {result.validation.info.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            Information
                          </Typography>
                          {renderValidationMessages(result.validation.info, 'info')}
                        </Box>
                      )}
                    </Paper>
                  </Collapse>
                </Box>
              )}
            </Box>
          )}

          {/* Import Options */}
          {!result && !loading && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Import Options
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={restoreUIState}
                    onChange={(e) => setRestoreUIState(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    Restore UI state (collapsed blocks, active play)
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={validateIntegrity}
                    onChange={(e) => setValidateIntegrity(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    Validate file integrity (checksum verification)
                  </Typography>
                }
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!result || !result.success}
        >
          Import
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ImportDiagramDialog
