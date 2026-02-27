import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import Editor from '@monaco-editor/react'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useArtifactEditor } from '../../hooks/useArtifactEditor'
import { extractJinjaVariables, extractYamlVariableNames } from '../../utils/jinjaVariables'

interface TemplateEditorProps {
  artifactPath: string
  artifactId: string
  projectId: string
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ artifactPath, artifactId, projectId }) => {
  const { t } = useTranslation('project')
  const { content, setContent, isDirty, loading, saving, error, snackbar, closeSnackbar, save } =
    useArtifactEditor({ artifactId, projectId })

  const variableFileArtifacts = useProjectStore(s =>
    s.artifacts.filter(a => a.artifact_type === 'variable_file')
  )

  // Debounced template variables
  const [templateVars, setTemplateVars] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setTemplateVars(extractJinjaVariables(content))
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [content])

  // Build variable source map from all variable_file artifacts
  const variableSourceMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const artifact of variableFileArtifacts) {
      if (!artifact.raw_content) continue
      const names = extractYamlVariableNames(artifact.raw_content)
      for (const name of names) {
        if (!map[name]) {
          map[name] = artifact.path
        }
      }
    }
    return map
  }, [variableFileArtifacts])

  const handleEditorChange = useCallback((value: string | undefined) => {
    setContent(value ?? '')
  }, [setContent])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
          {t('templateEditor')} — {artifactPath}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          disabled={!isDirty || saving}
          onClick={save}
        >
          Save
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* Editor + Variable Panel */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Monaco Editor */}
        <Box sx={{ flex: 1 }}>
          <Editor
            height="100%"
            language="html"
            value={content}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              wordWrap: 'on',
            }}
          />
        </Box>

        {/* Variable Panel */}
        <Box
          sx={{
            width: 240,
            borderLeft: 1,
            borderColor: 'divider',
            overflow: 'auto',
            p: 1.5,
            flexShrink: 0,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {t('variablesPanel')}
          </Typography>
          <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
            {t('usedVariables')}
          </Typography>

          {templateVars.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('noVariablesUsed')}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {templateVars.map(varName => {
                const source = variableSourceMap[varName]
                return (
                  <Tooltip
                    key={varName}
                    title={source ? t('knownVariable', { source }) : t('unknownVariable')}
                    arrow
                  >
                    <Chip
                      label={varName}
                      size="small"
                      color={source ? 'success' : 'warning'}
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  </Tooltip>
                )
              })}
            </Box>
          )}
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={closeSnackbar}>
          {snackbar.message === 'saved' ? t('saved') : snackbar.message === 'saveError' ? t('saveError') : snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default TemplateEditor
