import React, { useEffect, useState, useCallback } from 'react'
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Snackbar,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { inventoryService, InventoryData } from '../../services/inventoryService'
import HostsTab from './inventory/HostsTab'
import GroupsTab from './inventory/GroupsTab'
import VariablesTab from './inventory/VariablesTab'

interface InventoryEditorProps {
  artifactPath: string
  artifactId: string
  projectId: string
}

const InventoryEditor: React.FC<InventoryEditorProps> = ({ artifactPath, artifactId, projectId }) => {
  const { t } = useTranslation('project')
  const artifacts = useProjectStore(s => s.artifacts)
  const fetchArtifacts = useProjectStore(s => s.fetchArtifacts)

  const [activeTab, setActiveTab] = useState(0)
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const artifact = artifacts.find(a => a.id === artifactId)

  const loadInventory = useCallback(async () => {
    if (!artifact?.raw_content) {
      setInventoryData({ hosts: [], groups: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await inventoryService.parseInventory(projectId, artifact.raw_content)
      setInventoryData(result.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [artifact?.raw_content, projectId])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  const handleDataChange = useCallback((newData: InventoryData) => {
    setInventoryData(newData)
    setDirty(true)
  }, [])

  const handleSave = async () => {
    if (!inventoryData) return

    setSaving(true)
    try {
      const yamlContent = await inventoryService.generateYaml(projectId, inventoryData)
      await inventoryService.updateArtifact(projectId, artifactId, yamlContent)
      setDirty(false)
      setSnackbar({ open: true, message: t('inventorySaved'), severity: 'success' })
      fetchArtifacts(projectId)
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{t('inventoryParseError')}: {error}</Alert>
      </Box>
    )
  }

  if (!inventoryData) return null

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}>
        <Typography variant="subtitle2" noWrap>
          {artifactPath}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving || !dirty}
        >
          {saving ? t('importing') : t('save', { ns: 'common', defaultValue: 'Save' })}
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        variant="fullWidth"
        sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem' } }}
      >
        <Tab label={t('hosts')} />
        <Tab label={t('groups')} />
        <Tab label={t('variables')} />
      </Tabs>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {activeTab === 0 && (
          <HostsTab data={inventoryData} onChange={handleDataChange} />
        )}
        {activeTab === 1 && (
          <GroupsTab data={inventoryData} onChange={handleDataChange} />
        )}
        {activeTab === 2 && (
          <VariablesTab data={inventoryData} onChange={handleDataChange} />
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default InventoryEditor
