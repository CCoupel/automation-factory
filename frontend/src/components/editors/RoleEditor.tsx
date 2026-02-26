import React, { useState, useMemo } from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { ReturnSpecEntry } from '../../services/returnSpecService'
import InterfaceTab from '../role/InterfaceTab'
import TasksTab from '../role/TasksTab'
import HandlersTab from '../role/HandlersTab'
import TemplatesTab from '../role/TemplatesTab'
import FilesTab from '../role/FilesTab'

interface RoleEditorProps {
  artifactPath: string
  projectId: string
}

const RoleEditor: React.FC<RoleEditorProps> = ({ artifactPath, projectId }) => {
  const { t } = useTranslation('project')
  const [activeTab, setActiveTab] = useState(0)
  const [returnSpecs, setReturnSpecs] = useState<Record<string, ReturnSpecEntry>>({})

  const artifacts = useProjectStore(s => s.artifacts)

  // Group artifacts by sub-path category
  const grouped = useMemo(() => {
    const prefix = artifactPath + '/'
    const roleArtifacts = artifacts.filter(
      a => a.artifact_type === 'role' && a.path.startsWith(prefix)
    )

    const tasks = roleArtifacts.filter(a => a.path.includes('/tasks/'))
    const handlers = roleArtifacts.filter(a => a.path.includes('/handlers/'))
    const meta = roleArtifacts.filter(a => a.path.includes('/meta/'))
    const defaults = roleArtifacts.filter(a => a.path.includes('/defaults/'))
    const templates = roleArtifacts.filter(a => a.path.includes('/templates/'))
    const files = roleArtifacts.filter(a => a.path.includes('/files/'))

    return { tasks, handlers, meta, defaults, templates, files }
  }, [artifacts, artifactPath])

  // Initialize return specs from meta artifacts
  React.useEffect(() => {
    const returnSpecArtifact = grouped.meta.find(a => a.path.endsWith('return_specs.yml'))
    if (returnSpecArtifact?.content) {
      // Parse the content structure: {entrypoint: {returns: {var: spec}}}
      const specs: Record<string, ReturnSpecEntry> = {}
      for (const entry of Object.values(returnSpecArtifact.content) as any[]) {
        const returns = entry?.return_values || entry?.returns || {}
        for (const [name, spec] of Object.entries(returns) as [string, any][]) {
          specs[name] = {
            type: spec?.type || 'any',
            description: spec?.description || '',
            scope: spec?.scope || 'host',
            always_set: spec?.always_set || false,
            choices: spec?.choices || null,
            elements: spec?.elements || null,
            depends_on: spec?.depends_on || null,
          }
        }
      }
      setReturnSpecs(specs)
    }
  }, [grouped.meta])

  const tabs = [
    { label: t('interface'), key: 'interface' },
    { label: t('tasks'), key: 'tasks' },
    { label: t('handlers'), key: 'handlers' },
    { label: t('templates'), key: 'templates' },
    { label: t('files'), key: 'files' },
  ]

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem' } }}
      >
        {tabs.map(tab => (
          <Tab key={tab.key} label={tab.label} />
        ))}
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {activeTab === 0 && (
          <InterfaceTab
            projectId={projectId}
            rolePath={artifactPath}
            metaArtifacts={grouped.meta}
            returnSpecs={returnSpecs}
            onReturnSpecsChange={setReturnSpecs}
          />
        )}
        {activeTab === 1 && <TasksTab taskArtifacts={grouped.tasks} />}
        {activeTab === 2 && <HandlersTab handlerArtifacts={grouped.handlers} />}
        {activeTab === 3 && <TemplatesTab templateArtifacts={grouped.templates} />}
        {activeTab === 4 && <FilesTab fileArtifacts={grouped.files} />}
      </Box>
    </Box>
  )
}

export default RoleEditor
