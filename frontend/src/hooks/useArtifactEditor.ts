import { useCallback, useEffect, useState, useRef } from 'react'
import { useProjectStore } from '../stores/projectStore'
import { collectionService } from '../services/collectionService'

interface UseArtifactEditorOptions {
  artifactId: string
  projectId: string
  readOnly?: boolean
}

interface UseArtifactEditorReturn {
  content: string
  setContent: (value: string) => void
  isDirty: boolean
  loading: boolean
  saving: boolean
  error: string | null
  snackbar: { open: boolean; message: string; severity: 'success' | 'error' }
  closeSnackbar: () => void
  save: () => Promise<void>
}

export function useArtifactEditor({ artifactId, projectId, readOnly }: UseArtifactEditorOptions): UseArtifactEditorReturn {
  const artifacts = useProjectStore(s => s.artifacts)
  const fetchArtifacts = useProjectStore(s => s.fetchArtifacts)

  const [content, setContentState] = useState('')
  const contentRef = useRef('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const originalContent = useRef('')

  const setContent = useCallback((value: string) => {
    contentRef.current = value
    setContentState(value)
  }, [])
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const loadContent = useCallback(() => {
    setLoading(true)
    setError(null)
    const artifact = artifacts.find(a => a.id === artifactId)
    const raw = artifact?.raw_content ?? ''
    setContentState(raw)
    contentRef.current = raw
    originalContent.current = raw
    setLoading(false)
  }, [artifactId, artifacts])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const isDirty = !readOnly && content !== originalContent.current

  const save = useCallback(async () => {
    if (readOnly) return
    setSaving(true)
    try {
      const currentContent = contentRef.current
      await collectionService.updateArtifact(projectId, artifactId, currentContent)
      originalContent.current = currentContent
      await fetchArtifacts(projectId)
      setSnackbar({ open: true, message: 'saved', severity: 'success' })
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || err.message || 'saveError',
        severity: 'error',
      })
    } finally {
      setSaving(false)
    }
  }, [artifactId, projectId, readOnly, fetchArtifacts])

  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }, [])

  return { content, setContent, isDirty, loading, saving, error, snackbar, closeSnackbar, save }
}
