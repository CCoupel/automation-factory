import React, { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import { useTranslation } from 'react-i18next'
import VisualCanvas from '../canvas/VisualCanvas'
import { usePlaybookEditorStore } from '../../stores/playbookEditorStore'
import { ProjectArtifact } from '../../services/projectService'
import { getHttpClient } from '../../utils/httpClient'

interface TasksTabProps {
  taskArtifacts: ProjectArtifact[]
}

const TasksTab: React.FC<TasksTabProps> = ({ taskArtifacts }) => {
  const { t } = useTranslation('project')
  const setPlays = usePlaybookEditorStore(s => s.setPlays)
  const resetStore = usePlaybookEditorStore(s => s.resetStore)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTasks = async () => {
      const mainTask = taskArtifacts.find(a => a.path.endsWith('tasks/main.yml'))
      if (!mainTask?.raw_content) return

      setLoading(true)
      setError(null)
      try {
        // Parse via backend YAML parser service
        const client = getHttpClient()
        // Wrap tasks as a minimal playbook for the parser
        const wrappedYaml = `- name: Role Tasks\n  hosts: localhost\n  tasks:\n${mainTask.raw_content.split('\n').map(l => '    ' + l).join('\n')}`
        const response = await client.post('/yaml-parser/parse', { yaml_content: wrappedYaml })
        const parsed = response.data

        if (parsed.plays && parsed.plays.length > 0) {
          setPlays(parsed.plays)
        }
      } catch (err: any) {
        console.error('Failed to parse role tasks:', err)
        setError(err.message || 'Failed to parse tasks')
      } finally {
        setLoading(false)
      }
    }

    resetStore()
    loadTasks()

    return () => { resetStore() }
  }, [taskArtifacts])

  if (taskArtifacts.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">{t('noTasks')}</Typography>
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
      <VisualCanvas sectionName="tasks" />
    </Box>
  )
}

export default TasksTab
