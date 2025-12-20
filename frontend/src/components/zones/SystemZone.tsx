import { Box, Typography, Button, Tab, Tabs, Paper, CircularProgress, Alert } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import { useState, useEffect, useCallback } from 'react'
import { PlaybookContent } from '../../services/playbookService'
import { playbookPreviewService, ValidationResponse } from '../../services/playbookPreviewService'
import { useAuth } from '../../contexts/AuthContext'

interface SystemZoneProps {
  getPlaybookContent?: () => PlaybookContent | undefined
  onSaveComplete?: boolean // Triggered when playbook is saved
}

type PreviewStatus = 'idle' | 'loading' | 'success' | 'error'
type ValidationStatus = 'idle' | 'loading' | 'valid' | 'warnings' | 'errors'

const SystemZone = ({ getPlaybookContent, onSaveComplete }: SystemZoneProps) => {
  const [activeTab, setActiveTab] = useState(0)
  const [yamlContent, setYamlContent] = useState<string>('')
  const [validation, setValidation] = useState<ValidationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle')
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle')
  const { isAuthenticated } = useAuth()

  // Fetch preview and validation
  const fetchPreview = useCallback(async () => {
    if (!getPlaybookContent || !isAuthenticated) {
      return
    }

    const content = getPlaybookContent()
    if (!content) {
      return
    }

    setIsLoading(true)
    setError(null)
    setPreviewStatus('loading')
    setValidationStatus('loading')

    try {
      // Fetch both preview and validation in parallel
      const [previewResult, validationResult] = await Promise.all([
        playbookPreviewService.getPreview(content),
        playbookPreviewService.validatePreview(content)
      ])

      setYamlContent(previewResult.yaml)
      setPreviewStatus('success')

      setValidation(validationResult)
      // Determine validation status based on results
      if (validationResult.errors.length > 0) {
        setValidationStatus('errors')
      } else if (validationResult.warnings.length > 0) {
        setValidationStatus('warnings')
      } else {
        setValidationStatus('valid')
      }
    } catch (err: any) {
      console.error('Preview/Validation error:', err)
      setError(err.message || 'Failed to fetch preview')
      setPreviewStatus('error')
      setValidationStatus('errors')
    } finally {
      setIsLoading(false)
    }
  }, [getPlaybookContent, isAuthenticated])

  // Fetch on initial mount
  useEffect(() => {
    fetchPreview()
  }, []) // Only on mount

  // Fetch when save is complete (onSaveComplete changes)
  useEffect(() => {
    if (onSaveComplete) {
      fetchPreview()
    }
  }, [onSaveComplete, fetchPreview])

  // Handle manual refresh
  const handleRefresh = () => {
    fetchPreview()
  }

  // Handle download
  const handleDownload = () => {
    if (yamlContent) {
      const content = getPlaybookContent?.()
      const filename = content?.metadata?.playbookName || 'playbook'
      playbookPreviewService.downloadYaml(yamlContent, filename)
    }
  }

  // Get tab color based on status
  const getPreviewTabColor = () => {
    switch (previewStatus) {
      case 'success': return 'success.main'
      case 'error': return 'error.main'
      case 'loading': return 'text.secondary'
      default: return 'text.primary'
    }
  }

  const getValidationTabColor = () => {
    switch (validationStatus) {
      case 'valid': return 'success.main'
      case 'warnings': return 'warning.main'
      case 'errors': return 'error.main'
      case 'loading': return 'text.secondary'
      default: return 'text.primary'
    }
  }

  // Fallback for unauthenticated state
  if (!isAuthenticated) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
            flex: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Please log in to see the playbook preview
          </Typography>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with actions */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          bgcolor: 'background.paper',
          borderBottom: '1px solid #ddd',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 600,
            }
          }}
        >
          <Tab
            label="Preview"
            sx={{
              color: getPreviewTabColor(),
              '&.Mui-selected': { color: getPreviewTabColor() }
            }}
          />
          <Tab
            label="Validation"
            sx={{
              color: getValidationTabColor(),
              '&.Mui-selected': { color: getValidationTabColor() }
            }}
          />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isLoading && <CircularProgress size={20} />}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            size="small"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            size="small"
            onClick={handleDownload}
            disabled={!yamlContent || isLoading}
          >
            Download YAML
          </Button>
        </Box>
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Preview Tab */}
        {activeTab === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              height: '100%',
              overflow: 'auto',
            }}
          >
            {yamlContent ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{yamlContent}</pre>
            ) : (
              <Typography variant="body2" sx={{ color: '#888' }}>
                {isLoading ? 'Loading preview...' : 'No content to preview. Add some tasks to your playbook.'}
              </Typography>
            )}
          </Paper>
        )}

        {/* Validation Tab */}
        {activeTab === 1 && (
          <Paper elevation={0} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {validation ? (
              <Box>
                {/* Overall Status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {validation.is_valid && validation.warnings.length === 0 ? (
                    <>
                      <CheckCircleIcon color="success" />
                      <Typography variant="h6" color="success.main">
                        Playbook is valid
                      </Typography>
                    </>
                  ) : validation.is_valid && validation.warnings.length > 0 ? (
                    <>
                      <WarningIcon color="warning" />
                      <Typography variant="h6" color="warning.main">
                        Playbook is valid with warnings
                      </Typography>
                    </>
                  ) : (
                    <>
                      <ErrorIcon color="error" />
                      <Typography variant="h6" color="error.main">
                        Playbook has errors
                      </Typography>
                    </>
                  )}
                </Box>

                {/* Errors */}
                {validation.errors.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Errors ({validation.errors.length})
                    </Typography>
                    {validation.errors.map((err, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                        <ErrorIcon fontSize="small" color="error" sx={{ mt: 0.25 }} />
                        <Typography variant="body2" color="error.main">
                          {err}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Warnings */}
                {validation.warnings.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                      Warnings ({validation.warnings.length})
                    </Typography>
                    {validation.warnings.map((warn, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                        <WarningIcon fontSize="small" color="warning" sx={{ mt: 0.25 }} />
                        <Typography variant="body2" color="warning.main">
                          {warn}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* All good message */}
                {validation.is_valid && validation.errors.length === 0 && validation.warnings.length === 0 && (
                  <Typography variant="body2" color="success.main">
                    No issues found. Your playbook is ready to use.
                  </Typography>
                )}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {isLoading ? 'Validating...' : 'No validation results available. Click Refresh to validate.'}
              </Typography>
            )}
          </Paper>
        )}
      </Box>
    </Box>
  )
}

export default SystemZone
