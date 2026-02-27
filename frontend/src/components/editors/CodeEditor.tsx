import React from 'react'
import { Alert, Box, Chip, CircularProgress, Typography } from '@mui/material'
import Editor from '@monaco-editor/react'
import { useTranslation } from 'react-i18next'
import { useArtifactEditor } from '../../hooks/useArtifactEditor'

interface CodeEditorProps {
  artifactPath: string
  artifactId: string
  projectId: string
}

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'py': return 'python'
    case 'yml':
    case 'yaml': return 'yaml'
    case 'json': return 'json'
    case 'sh':
    case 'bash': return 'shell'
    case 'js': return 'javascript'
    case 'ts': return 'typescript'
    case 'cfg':
    case 'ini':
    case 'conf': return 'ini'
    default: return 'plaintext'
  }
}

const CodeEditor: React.FC<CodeEditorProps> = ({ artifactPath, artifactId, projectId }) => {
  const { t } = useTranslation('project')
  const { content, loading, error } = useArtifactEditor({ artifactId, projectId, readOnly: true })

  const language = detectLanguage(artifactPath)

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
          {t('codeViewer')} — {artifactPath}
        </Typography>
        <Chip label={t('readOnly')} size="small" variant="outlined" />
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* Monaco Editor */}
      <Box sx={{ flex: 1 }}>
        <Editor
          height="100%"
          language={language}
          value={content}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            wordWrap: 'on',
          }}
        />
      </Box>
    </Box>
  )
}

export default CodeEditor
