/**
 * VariableChainPanel
 *
 * Panel content for the "Variables" tab in SystemZone.
 * Calls the validation endpoint and displays issues.
 */

import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import WarningIcon from '@mui/icons-material/Warning'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import {
  variableChainService,
  VariableChainValidationResponse,
  ValidationIssue,
} from '../../services/variableChainService'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'
import { useTranslation } from 'react-i18next'

interface VariableChainPanelProps {
  projectId: string | null
  playbookYaml: string
}

const VariableChainPanel = ({ projectId, playbookYaml }: VariableChainPanelProps) => {
  const { t } = useTranslation('project')
  const [validation, setValidation] = useState<VariableChainValidationResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const highlightElement = usePlaybookEditorStore(s => s.highlightElement)

  const handleValidate = useCallback(async () => {
    if (!projectId || !playbookYaml) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await variableChainService.validateVariableChains(projectId, playbookYaml)
      setValidation(result)
    } catch (err: any) {
      setError(err.message || 'Validation failed')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, playbookYaml])

  const handleIssueClick = (issue: ValidationIssue) => {
    if (issue.module_id) {
      const color = issue.severity === 'error' ? '#f44336' : '#ff9800'
      highlightElement(issue.module_id, 'validation', 3000)
    }
  }

  if (!projectId) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Variable chain validation is only available for project playbooks.
        </Typography>
      </Box>
    )
  }

  const errorCount = validation?.issues.filter(i => i.severity === 'error').length ?? 0
  const warningCount = validation?.issues.filter(i => i.severity === 'warning').length ?? 0

  return (
    <Box sx={{ p: 2 }}>
      {/* Validate button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={isLoading ? <CircularProgress size={16} /> : <PlayArrowIcon />}
          onClick={handleValidate}
          disabled={isLoading}
        >
          {isLoading ? t('validatingVariables') : t('validateVariables')}
        </Button>
      </Box>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {validation && (
        <Box>
          {/* Summary */}
          {validation.is_valid && validation.issues.length === 0 ? (
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
              {t('variablesValid')}
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {errorCount > 0 && (
                <Chip
                  size="small"
                  icon={<ErrorIcon />}
                  label={`${errorCount} error${errorCount > 1 ? 's' : ''}`}
                  color="error"
                  variant="outlined"
                />
              )}
              {warningCount > 0 && (
                <Chip
                  size="small"
                  icon={<WarningIcon />}
                  label={`${warningCount} warning${warningCount > 1 ? 's' : ''}`}
                  color="warning"
                  variant="outlined"
                />
              )}
            </Box>
          )}

          {/* Issues list */}
          {validation.issues.map((issue, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                mb: 1,
                p: 1,
                bgcolor: issue.severity === 'error' ? 'rgba(211, 47, 47, 0.08)' : 'rgba(237, 108, 2, 0.08)',
                borderRadius: 1,
                borderLeft: 3,
                borderColor: issue.severity === 'error' ? 'error.main' : 'warning.main',
                cursor: issue.module_id ? 'pointer' : 'default',
              }}
              onClick={() => handleIssueClick(issue)}
            >
              {issue.severity === 'error' ? (
                <ErrorIcon fontSize="small" color="error" sx={{ mt: 0.25 }} />
              ) : (
                <WarningIcon fontSize="small" color="warning" sx={{ mt: 0.25 }} />
              )}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">
                  {issue.message}
                </Typography>
                {issue.var_name && (
                  <Chip
                    size="small"
                    label={issue.var_name}
                    variant="outlined"
                    sx={{ mt: 0.5, height: 20, fontSize: '0.75rem' }}
                  />
                )}
                {issue.suggestion && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {issue.suggestion}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default VariableChainPanel
