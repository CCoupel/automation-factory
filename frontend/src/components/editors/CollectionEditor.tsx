import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import {
  collectionService,
  CollectionRequirement,
  RequirementsData,
  RoleRequirement,
} from '../../services/collectionService'
import CollectionsTab from './collections/CollectionsTab'
import RolesTab from './collections/RolesTab'
import GalaxySearchDialog from './collections/GalaxySearchDialog'

interface CollectionEditorProps {
  artifactPath: string
  artifactId: string
  projectId: string
}

const CollectionEditor: React.FC<CollectionEditorProps> = ({ artifactPath, artifactId, projectId }) => {
  const { t } = useTranslation('project')
  const artifacts = useProjectStore(s => s.artifacts)
  const fetchArtifacts = useProjectStore(s => s.fetchArtifacts)

  const [activeTab, setActiveTab] = useState(0)
  const [collections, setCollections] = useState<CollectionRequirement[]>([])
  const [roles, setRoles] = useState<RoleRequirement[]>([])
  const [originalData, setOriginalData] = useState<RequirementsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [galaxyDialogOpen, setGalaxyDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const isDirty = originalData !== null && (
    JSON.stringify(collections) !== JSON.stringify(originalData.collections) ||
    JSON.stringify(roles) !== JSON.stringify(originalData.roles)
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const artifact = artifacts.find(a => a.id === artifactId)
      if (!artifact?.raw_content) {
        setCollections([])
        setRoles([])
        setOriginalData({ collections: [], roles: [] })
        setLoading(false)
        return
      }

      const response = await collectionService.parseRequirements(projectId, artifact.raw_content)
      setCollections(response.data.collections)
      setRoles(response.data.roles)
      setOriginalData(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || t('requirementsParseError'))
    } finally {
      setLoading(false)
    }
  }, [artifactId, artifacts, projectId, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async () => {
    setSaving(true)
    try {
      const data: RequirementsData = { collections, roles }
      const yamlContent = await collectionService.generateYaml(projectId, data)
      await collectionService.updateArtifact(projectId, artifactId, yamlContent, data)
      setOriginalData(data)
      await fetchArtifacts(projectId)
      setSnackbar({ open: true, message: t('requirementsSaved'), severity: 'success' })
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || err.message || t('requirementsParseError'),
        severity: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddFromGalaxy = (fqcn: string, version: string) => {
    // Check if already exists
    if (collections.some(c => c.name === fqcn)) return
    setCollections(prev => [...prev, { name: fqcn, version: `>=${version}`, source: null }])
    setGalaxyDialogOpen(false)
  }

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
          {t('collectionEditor')} — {artifactPath}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          disabled={!isDirty || saving}
          onClick={handleSave}
        >
          Save
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        sx={{ px: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.85rem' } }}
      >
        <Tab label={`${t('collections')} (${collections.length})`} />
        <Tab label={`${t('roles')} (${roles.length})`} />
      </Tabs>

      {/* Tab content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 0 && (
          <CollectionsTab
            collections={collections}
            onChange={setCollections}
            onSearchGalaxy={() => setGalaxyDialogOpen(true)}
          />
        )}
        {activeTab === 1 && (
          <RolesTab roles={roles} onChange={setRoles} />
        )}
      </Box>

      {/* Galaxy Search Dialog */}
      <GalaxySearchDialog
        open={galaxyDialogOpen}
        onClose={() => setGalaxyDialogOpen(false)}
        onAdd={handleAddFromGalaxy}
        projectId={projectId}
      />

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

export default CollectionEditor
