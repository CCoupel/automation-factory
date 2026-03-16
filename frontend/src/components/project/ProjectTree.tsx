import React, { useState, useRef, useCallback } from 'react'
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Chip,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
} from '@mui/material'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import DeleteIcon from '@mui/icons-material/Delete'
import DescriptionIcon from '@mui/icons-material/Description'
import BuildIcon from '@mui/icons-material/Build'
import StorageIcon from '@mui/icons-material/Storage'
import TuneIcon from '@mui/icons-material/Tune'
import CodeIcon from '@mui/icons-material/Code'
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'
import ExtensionIcon from '@mui/icons-material/Extension'
import SettingsIcon from '@mui/icons-material/Settings'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '../../stores/projectStore'
import { ProjectArtifact } from '../../services/projectService'
import { playbookService, Playbook } from '../../services/playbookService'

const ARTIFACT_TYPE_CONFIG: Record<string, { icon: React.ReactElement; order: number }> = {
  playbook: { icon: <DescriptionIcon fontSize="small" />, order: 0 },
  role: { icon: <BuildIcon fontSize="small" />, order: 1 },
  inventory: { icon: <StorageIcon fontSize="small" />, order: 2 },
  variable_file: { icon: <TuneIcon fontSize="small" />, order: 3 },
  template: { icon: <CodeIcon fontSize="small" />, order: 4 },
  collection_requirements: { icon: <LibraryBooksIcon fontSize="small" />, order: 5 },
  custom_module: { icon: <ExtensionIcon fontSize="small" />, order: 6 },
  ansible_cfg: { icon: <SettingsIcon fontSize="small" />, order: 7 },
  file: { icon: <InsertDriveFileIcon fontSize="small" />, order: 8 },
}

const ProjectTree: React.FC = () => {
  const { t } = useTranslation('project')
  const navigate = useNavigate()
  const artifacts = useProjectStore(s => s.artifacts)
  const currentProject = useProjectStore(s => s.currentProject)

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['playbook']))
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'info' | 'warning' }>({
    open: false, message: '', severity: 'info',
  })

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; artifact: ProjectArtifact } | null>(null)

  // Cached playbooks to avoid repeated API calls
  const playbooksCacheRef = useRef<Playbook[] | null>(null)

  const getPlaybooks = useCallback(async (): Promise<Playbook[]> => {
    if (playbooksCacheRef.current) return playbooksCacheRef.current
    const playbooks = await playbookService.listPlaybooks()
    playbooksCacheRef.current = playbooks
    return playbooks
  }, [])

  // Group artifacts by type
  const grouped = artifacts.reduce<Record<string, ProjectArtifact[]>>((acc, artifact) => {
    const type = artifact.artifact_type
    if (!acc[type]) acc[type] = []
    acc[type].push(artifact)
    return acc
  }, {})

  // Sort groups by configured order
  const sortedTypes = Object.keys(grouped).sort((a, b) => {
    const orderA = ARTIFACT_TYPE_CONFIG[a]?.order ?? 99
    const orderB = ARTIFACT_TYPE_CONFIG[b]?.order ?? 99
    return orderA - orderB
  })

  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const handleOpenArtifact = async (artifact: ProjectArtifact) => {
    if (artifact.artifact_type === 'playbook') {
      try {
        const playbooks = await getPlaybooks()
        const matchingPlaybook = playbooks.find(p =>
          p.id === artifact.content?.playbook_id ||
          (currentProject && p.name === artifact.path)
        )
        if (matchingPlaybook) {
          navigate(`/playbooks/${matchingPlaybook.id}`)
        } else {
          setSnackbar({
            open: true,
            message: t('noLinkedPlaybook'),
            severity: 'info',
          })
        }
      } catch {
        setSnackbar({
          open: true,
          message: t('failedLoadPlaybooks'),
          severity: 'warning',
        })
      }
    } else {
      setSnackbar({
        open: true,
        message: t('comingSoon'),
        severity: 'info',
      })
    }
  }

  const handleArtifactClick = (artifact: ProjectArtifact) => {
    setSelectedArtifactId(artifact.id)
  }

  const handleArtifactDoubleClick = (artifact: ProjectArtifact) => {
    handleOpenArtifact(artifact)
  }

  const handleContextMenu = (e: React.MouseEvent, artifact: ProjectArtifact) => {
    e.preventDefault()
    setSelectedArtifactId(artifact.id)
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, artifact })
  }

  const handleContextMenuClose = () => {
    setContextMenu(null)
  }

  const handleContextOpen = async () => {
    if (contextMenu) {
      const artifact = contextMenu.artifact
      handleContextMenuClose()
      await handleOpenArtifact(artifact)
    } else {
      handleContextMenuClose()
    }
  }

  const handleContextDelete = () => {
    // TODO: implement artifact deletion via API when available
    handleContextMenuClose()
  }

  const getTypeIcon = (type: string) => {
    return ARTIFACT_TYPE_CONFIG[type]?.icon || <InsertDriveFileIcon fontSize="small" />
  }

  const getTypeLabel = (type: string): string => {
    return t(`artifactTypes.${type}`, type)
  }

  if (artifacts.length === 0) {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('noArtifacts')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('noArtifactsHint')}
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ overflow: 'auto' }}>
      <List dense disablePadding>
        {sortedTypes.map(type => {
          const items = grouped[type]
          const isExpanded = expandedGroups.has(type)

          return (
            <React.Fragment key={type}>
              <ListItemButton onClick={() => toggleGroup(type)} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {getTypeIcon(type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {getTypeLabel(type)}
                      </Typography>
                      <Chip label={items.length} size="small" sx={{ height: 18, fontSize: '0.7rem' }} />
                    </Box>
                  }
                />
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded} timeout="auto">
                <List dense disablePadding>
                  {items.map(artifact => (
                    <ListItemButton
                      key={artifact.id}
                      selected={selectedArtifactId === artifact.id}
                      sx={{ pl: 4, py: 0.25 }}
                      onClick={() => handleArtifactClick(artifact)}
                      onDoubleClick={() => handleArtifactDoubleClick(artifact)}
                      onContextMenu={(e) => handleContextMenu(e, artifact)}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" noWrap>
                            {artifact.path}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </React.Fragment>
          )
        })}
      </List>

      {/* Context menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleContextOpen}>
          <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('openArtifact')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleContextDelete}>
          <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{t('deleteArtifact')}</ListItemText>
        </MenuItem>
      </Menu>

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

export default ProjectTree
