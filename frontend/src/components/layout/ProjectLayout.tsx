import React, { useEffect, useState } from 'react'
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Button,
} from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { useResizable } from '../../hooks/useResizable'
import { playbookService } from '../../services/playbookService'
import ProjectHeader from '../project/ProjectHeader'
import ProjectTree from '../project/ProjectTree'
import PlaybookEditor from '../editor/PlaybookEditor'
import ModulesZoneCached from '../zones/ModulesZoneCached'
import SystemZone from '../zones/SystemZone'

const ProjectLayout: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('project')
  const { t: tc } = useTranslation('common')

  const currentProject = useProjectStore(s => s.currentProject)
  const isLoading = useProjectStore(s => s.isLoading)
  const error = useProjectStore(s => s.error)
  const artifacts = useProjectStore(s => s.artifacts)
  const selectedArtifactId = useProjectStore(s => s.selectedArtifactId)
  const fetchProject = useProjectStore(s => s.fetchProject)
  const fetchArtifacts = useProjectStore(s => s.fetchArtifacts)
  const clearCurrentProject = useProjectStore(s => s.clearCurrentProject)
  const clearError = useProjectStore(s => s.clearError)
  const updateArtifact = useProjectStore(s => s.updateArtifact)

  const [hasFetched, setHasFetched] = useState(false)
  const [isCreatingPlaybook, setIsCreatingPlaybook] = useState(false)

  // Left panel state
  const [leftTab, setLeftTab] = useState(0)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false)
  const leftPanel = useResizable({ direction: 'horizontal', initialSize: 280, minSize: 200, maxSize: 500 })

  // Bottom panel state (only used when PlaybookEditor is NOT shown)
  const [isSystemCollapsed, setIsSystemCollapsed] = useState(true)
  const systemPanel = useResizable({ direction: 'vertical', initialSize: 200, minSize: 100, maxSize: 600 })

  // Fetch project then artifacts
  useEffect(() => {
    if (!projectId) return

    let cancelled = false
    const load = async () => {
      await fetchProject(projectId)
      if (!cancelled) {
        await fetchArtifacts(projectId)
      }
      if (!cancelled) {
        setHasFetched(true)
      }
    }
    load()

    return () => {
      cancelled = true
      clearCurrentProject()
    }
  }, [projectId])

  // 404: project not found after fetch completed
  const isNotFound = hasFetched && !isLoading && !currentProject

  useEffect(() => {
    if (isNotFound) {
      const timer = setTimeout(() => navigate('/'), 3000)
      return () => clearTimeout(timer)
    }
  }, [isNotFound, navigate])

  // Resolve selected artifact
  const selectedArtifact = selectedArtifactId
    ? artifacts.find(a => a.id === selectedArtifactId) ?? null
    : null

  const linkedPlaybookId = selectedArtifact?.artifact_type === 'playbook'
    ? (selectedArtifact.content?.playbook_id as string | undefined) ?? null
    : null

  // PlaybookEditor is shown when a playbook artifact with a linked playbook_id is selected
  const isPlaybookEditorShown = !!linkedPlaybookId

  // Create a new playbook and link it to the selected artifact
  const handleCreateAndLink = async () => {
    if (!projectId || !selectedArtifact) return
    setIsCreatingPlaybook(true)
    try {
      const newPlaybook = await playbookService.createPlaybook({
        name: selectedArtifact.path.split('/').pop() ?? t('untitledPlaybook'),
        content: {
          modules: [], links: [], plays: [],
          collapsedBlocks: [], collapsedBlockSections: [],
          metadata: {}, variables: [],
        },
      })
      await updateArtifact(projectId, selectedArtifact.id, {
        content: { playbook_id: newPlaybook.id },
      })
    } catch {
      // error shown via store snackbar
    } finally {
      setIsCreatingPlaybook(false)
    }
  }

  // Show loading spinner while fetching
  if (!hasFetched || isLoading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isNotFound) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">{t('projectNotFound')}</Typography>
        <Typography variant="body2" color="text.secondary">{t('projectNotFoundDesc')}</Typography>
        <Typography variant="caption" color="text.secondary">{t('redirectingHome')}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <ProjectHeader projectName={currentProject?.name || '...'} />

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Left panel */}
        {!isLeftCollapsed && (
          <Box
            sx={{
              width: `${leftPanel.size}px`,
              borderRight: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            <Tabs
              value={leftTab}
              onChange={(_e, v) => setLeftTab(v)}
              variant="fullWidth"
              sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem' } }}
            >
              <Tab label={t('projectTree')} />
              <Tab label={t('modules')} />
            </Tabs>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {leftTab === 0 && <ProjectTree />}
              {leftTab === 1 && <ModulesZoneCached />}
            </Box>

            {/* Resize handle */}
            <Box
              onMouseDown={leftPanel.onMouseDown}
              sx={{
                position: 'absolute',
                top: 0, right: 0, bottom: 0,
                width: '6px',
                cursor: 'ew-resize',
                bgcolor: leftPanel.isResizing ? 'primary.main' : 'transparent',
                '&:hover': { bgcolor: 'primary.light' },
                transition: 'background-color 0.2s',
                zIndex: 10,
              }}
            >
              <Box sx={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '3px', height: '40px',
                borderRadius: '2px',
                bgcolor: leftPanel.isResizing ? 'white' : '#999',
              }} />
            </Box>
          </Box>
        )}

        {/* Center area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
          {isLeftCollapsed && (
            <Tooltip title={t('projectTree')} placement="right">
              <IconButton
                onClick={() => setIsLeftCollapsed(false)}
                sx={{
                  position: 'absolute', top: 8, left: 8, zIndex: 1000,
                  bgcolor: 'background.paper', boxShadow: 2,
                  '&:hover': { bgcolor: 'primary.light' },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Tooltip>
          )}

          {/* PlaybookEditor fills the entire center when shown (handles its own SystemZone) */}
          {isPlaybookEditorShown ? (
            <PlaybookEditor playbookId={linkedPlaybookId!} />
          ) : (
            <>
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                {!selectedArtifact && (
                  <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                    {t('selectArtifact')}
                  </Typography>
                )}
                {selectedArtifact?.artifact_type === 'playbook' && !linkedPlaybookId && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                      {t('noLinkedPlaybook')}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleCreateAndLink}
                      disabled={isCreatingPlaybook}
                    >
                      {isCreatingPlaybook ? tc('loading') : t('createAndOpenPlaybook')}
                    </Button>
                  </Box>
                )}
                {selectedArtifact && selectedArtifact.artifact_type !== 'playbook' && (
                  <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center' }}>
                    {t('comingSoon')}
                  </Typography>
                )}
              </Box>

              {/* System zone only shown when no PlaybookEditor */}
              {!isSystemCollapsed ? (
                <Box
                  sx={{
                    height: `${systemPanel.size}px`,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  <Box
                    onMouseDown={systemPanel.onMouseDown}
                    sx={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0,
                      height: '6px',
                      cursor: 'ns-resize',
                      bgcolor: systemPanel.isResizing ? 'primary.main' : 'transparent',
                      '&:hover': { bgcolor: 'primary.light' },
                      transition: 'background-color 0.2s',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box sx={{ width: '40px', height: '3px', borderRadius: '2px', bgcolor: systemPanel.isResizing ? 'white' : '#999' }} />
                    <Tooltip title={t('modules')} placement="top">
                      <IconButton
                        size="small"
                        onClick={() => setIsSystemCollapsed(true)}
                        sx={{
                          position: 'absolute', right: 8,
                          bgcolor: 'background.paper', boxShadow: 1,
                          '&:hover': { bgcolor: 'primary.light' },
                        }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <SystemZone />
                </Box>
              ) : (
                <Box
                  sx={{
                    height: '30px',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => setIsSystemCollapsed(false)}
                >
                  <Tooltip title={tc('showSystemZone')} placement="top">
                    <IconButton size="small">
                      <ExpandLessIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={clearError}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ProjectLayout
