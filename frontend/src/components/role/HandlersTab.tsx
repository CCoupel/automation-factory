import React, { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import { useTranslation } from 'react-i18next'
import VisualCanvas from '../canvas/VisualCanvas'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'
import { ProjectArtifact } from '../../services/projectService'
import { getHttpClient } from '../../utils/httpClient'

interface HandlersTabProps {
  handlerArtifacts: ProjectArtifact[]
}

const HandlersTab: React.FC<HandlersTabProps> = ({ handlerArtifacts }) => {
  const { t } = useTranslation('project')
  const setPlays = usePlaybookEditorStore(s => s.setPlays)
  const resetStore = usePlaybookEditorStore(s => s.resetStore)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadHandlers = async () => {
      const mainHandler = handlerArtifacts.find(a => a.path.endsWith('handlers/main.yml'))
      if (!mainHandler?.raw_content) return

      setLoading(true)
      setError(null)
      try {
        const client = getHttpClient()
        const wrappedYaml = `- name: Role Handlers\n  hosts: localhost\n  tasks:\n${mainHandler.raw_content.split('\n').map(l => '    ' + l).join('\n')}`
        const response = await client.post('/yaml-parser/parse', { yaml_content: wrappedYaml })
        const parsed = response.data

        if (parsed.plays && parsed.plays.length > 0) {
          setPlays(parsed.plays)
        }
      } catch (err: any) {
        console.error('Failed to parse role handlers:', err)
        setError(err.message || 'Failed to parse handlers')
      } finally {
        setLoading(false)
      }
    }

    resetStore()
    loadHandlers()

    return () => { resetStore() }
  }, [handlerArtifacts])

  if (handlerArtifacts.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">{t('noHandlers')}</Typography>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="error">{error}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ flex: 1, overflow: 'auto', position: 'relative' }}>
      <VisualCanvas sectionName="handlers" />
    </Box>
  )
}

export default HandlersTab
