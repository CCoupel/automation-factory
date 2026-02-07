import { Box, Typography, Button, Tab, Tabs, Paper, CircularProgress, Alert, Chip, Divider } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import InfoIcon from '@mui/icons-material/Info'
import CodeIcon from '@mui/icons-material/Code'
import RuleIcon from '@mui/icons-material/Rule'
import { useState, useEffect, useCallback } from 'react'
import { PlaybookContent } from '../../services/playbookService'
import { playbookPreviewService, FullValidationResponse } from '../../services/playbookPreviewService'
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
  const [validation, setValidation] = useState<FullValidationResponse | null>(null)
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
      // Fetch both preview and full validation in parallel
      const [previewResult, validationResult] = await Promise.all([
        playbookPreviewService.getPreview(content),
        playbookPreviewService.validateFullPreview(content)
      ])

      setYamlContent(previewResult.yaml)
      setPreviewStatus('success')

      setValidation(validationResult)
      // Determine validation status based on results
      if (!validationResult.syntax_valid || validationResult.lint_error_count > 0) {
        setValidationStatus('errors')
      } else if (validationResult.lint_warning_count > 0) {
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
          borderBottom: 1, borderColor: 'divider',
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
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              height: '100%',
              overflow: 'auto',
            }}
          >
            {yamlContent ? (
              <Box sx={{ display: 'flex' }}>
                {/* Column 1: Line numbers */}
                <Box
                  sx={{
                    pr: 1,
                    pl: 1,
                    borderRight: '1px solid #444',
                    color: '#858585',
                    userSelect: 'none',
                    textAlign: 'right',
                    minWidth: '40px',
                  }}
                >
                  {yamlContent.split('\n').map((_, index) => (
                    <Box
                      key={index + 1}
                      sx={{
                        height: '1.4em',
                        lineHeight: '1.4em',
                      }}
                    >
                      {index + 1}
                    </Box>
                  ))}
                </Box>
                {/* Column 2: Validation status indicator */}
                <Box sx={{ width: '4px' }}>
                  {yamlContent.split('\n').map((_, index) => {
                    const lineNum = index + 1
                    const issueOnLine = validation?.lint_issues.find(issue => issue.line === lineNum)
                    const syntaxErrorLine = validation?.syntax_error?.includes(`line ${lineNum}`)

                    let indicatorColor = 'transparent'
                    if (issueOnLine) {
                      indicatorColor = issueOnLine.severity === 'error' ? '#d32f2f' :
                                       issueOnLine.severity === 'warning' ? '#ed6c02' : '#0288d1'
                    } else if (syntaxErrorLine) {
                      indicatorColor = '#d32f2f'
                    }

                    return (
                      <Box
                        key={lineNum}
                        sx={{
                          height: '1.4em',
                          lineHeight: '1.4em',
                          bgcolor: indicatorColor,
                        }}
                      />
                    )
                  })}
                </Box>
                {/* Column 3: Code content */}
                <Box sx={{ flex: 1, pl: 1 }}>
                  {yamlContent.split('\n').map((line, index) => {
                    const lineNum = index + 1
                    const issueOnLine = validation?.lint_issues.find(issue => issue.line === lineNum)
                    const syntaxErrorLine = validation?.syntax_error?.includes(`line ${lineNum}`)

                    let bgColor = 'transparent'
                    if (issueOnLine) {
                      bgColor = issueOnLine.severity === 'error' ? 'rgba(211, 47, 47, 0.15)' :
                                issueOnLine.severity === 'warning' ? 'rgba(237, 108, 2, 0.15)' : 'rgba(2, 136, 209, 0.15)'
                    } else if (syntaxErrorLine) {
                      bgColor = 'rgba(211, 47, 47, 0.15)'
                    }

                    return (
                      <Box
                        key={lineNum}
                        sx={{
                          height: '1.4em',
                          lineHeight: '1.4em',
                          bgcolor: bgColor,
                          whiteSpace: 'pre',
                        }}
                      >
                        {line || ' '}
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            ) : (
              <Box sx={{ p: 2 }}>
                <Typography variant="body2" sx={{ color: '#888' }}>
                  {isLoading ? 'Loading preview...' : 'No content to preview. Add some tasks to your playbook.'}
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* Validation Tab */}
        {activeTab === 1 && (
          <Paper elevation={0} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {validation ? (
              <Box>
                {/* Ansible Version Badge */}
                {validation.ansible_version && (
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      size="small"
                      label={`Validated with Ansible ${validation.ansible_version}`}
                      color="default"
                      variant="outlined"
                    />
                  </Box>
                )}

                {/* Overall Status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {validation.is_valid && validation.lint_warning_count === 0 ? (
                    <>
                      <CheckCircleIcon color="success" />
                      <Typography variant="h6" color="success.main">
                        Playbook is valid
                      </Typography>
                    </>
                  ) : validation.is_valid && validation.lint_warning_count > 0 ? (
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

                {/* Syntax Check Section */}
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CodeIcon fontSize="small" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      Syntax Check
                    </Typography>
                    {validation.syntax_valid ? (
                      <Chip size="small" label="Passed" color="success" />
                    ) : (
                      <Chip size="small" label="Failed" color="error" />
                    )}
                  </Box>
                  {validation.syntax_error && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1 }}>
                      <ErrorIcon fontSize="small" color="error" sx={{ mt: 0.25 }} />
                      <Typography variant="body2" color="error.main" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {validation.syntax_error}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Lint Section */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <RuleIcon fontSize="small" />
                    <Typography variant="subtitle2" fontWeight="bold">
                      Ansible Lint
                    </Typography>
                    {!validation.lint_available ? (
                      <Chip size="small" label="Not Available" color="default" />
                    ) : validation.lint_passed ? (
                      <Chip size="small" label="Passed" color="success" />
                    ) : (
                      <Chip size="small" label="Issues Found" color="warning" />
                    )}
                  </Box>

                  {/* Lint Summary */}
                  {validation.lint_available && (
                    <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                      {validation.lint_error_count > 0 && (
                        <Chip
                          size="small"
                          icon={<ErrorIcon />}
                          label={`${validation.lint_error_count} Error${validation.lint_error_count > 1 ? 's' : ''}`}
                          color="error"
                          variant="outlined"
                        />
                      )}
                      {validation.lint_warning_count > 0 && (
                        <Chip
                          size="small"
                          icon={<WarningIcon />}
                          label={`${validation.lint_warning_count} Warning${validation.lint_warning_count > 1 ? 's' : ''}`}
                          color="warning"
                          variant="outlined"
                        />
                      )}
                      {validation.lint_info_count > 0 && (
                        <Chip
                          size="small"
                          icon={<InfoIcon />}
                          label={`${validation.lint_info_count} Info`}
                          color="info"
                          variant="outlined"
                        />
                      )}
                      {validation.lint_error_count === 0 && validation.lint_warning_count === 0 && validation.lint_info_count === 0 && (
                        <Typography variant="body2" color="success.main">
                          No lint issues found
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Lint Issues List */}
                  {validation.lint_issues.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      {validation.lint_issues.map((issue, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1,
                            mb: 1,
                            p: 1,
                            bgcolor: issue.severity === 'error' ? 'error.lighter' :
                                     issue.severity === 'warning' ? 'warning.lighter' : 'info.lighter',
                            borderRadius: 1,
                            borderLeft: 3,
                            borderColor: issue.severity === 'error' ? 'error.main' :
                                         issue.severity === 'warning' ? 'warning.main' : 'info.main',
                          }}
                        >
                          {issue.severity === 'error' ? (
                            <ErrorIcon fontSize="small" color="error" sx={{ mt: 0.25 }} />
                          ) : issue.severity === 'warning' ? (
                            <WarningIcon fontSize="small" color="warning" sx={{ mt: 0.25 }} />
                          ) : (
                            <InfoIcon fontSize="small" color="info" sx={{ mt: 0.25 }} />
                          )}
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" fontWeight="bold">
                                {issue.rule_id}
                              </Typography>
                              {issue.line && (
                                <Chip size="small" label={`Line ${issue.line}`} variant="outlined" sx={{ height: 20 }} />
                              )}
                            </Box>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                              {issue.message}
                            </Typography>
                            {issue.rule_description && (
                              <Typography variant="caption" color="text.secondary">
                                {issue.rule_description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>

                {/* All good message */}
                {validation.is_valid && validation.syntax_valid && validation.lint_error_count === 0 && validation.lint_warning_count === 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    No issues found. Your playbook is ready to use.
                  </Alert>
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
