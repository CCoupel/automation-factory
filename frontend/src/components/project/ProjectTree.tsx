import React, { useState } from 'react'
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
} from '@mui/material'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
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
import { useEditorStore } from '../../stores/editorStore'
import { ProjectArtifact } from '../../services/projectService'
import { playbookService } from '../../services/playbookService'

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
  const openTab = useEditorStore(s => s.openTab)

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['playbook']))
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'info' | 'warning' }>({
    open: false, message: '', severity: 'info',
  })

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

  const handleArtifactDoubleClick = async (artifact: ProjectArtifact) => {
    if (artifact.artifact_type === 'playbook') {
      // Try to find matching playbook by searching user's playbooks
      try {
        const playbooks = await playbookService.listPlaybooks()
        // Find playbook linked to this project artifact
        // The artifact content may contain a playbook_id reference, or match by name
        const matchingPlaybook = playbooks.find(p =>
          p.id === artifact.content?.playbook_id ||
          (currentProject && p.name === artifact.path)
        )
        if (matchingPlaybook) {
          navigate(`/playbooks/${matchingPlaybook.id}`)
        } else {
          setSnackbar({
            open: true,
            message: 'No linked playbook found for this artifact.',
            severity: 'info',
          })
        }
      } catch {
        setSnackbar({
          open: true,
          message: 'Failed to load playbooks.',
          severity: 'warning',
        })
      }
    } else if (artifact.artifact_type === 'inventory') {
      openTab({
        title: artifact.path.split('/').pop() || 'Inventory',
        type: 'inventory',
        artifactId: artifact.id,
        artifactPath: artifact.path,
      })
    } else {
      setSnackbar({
        open: true,
        message: t('comingSoon'),
        severity: 'info',
      })
    }
  }

  const getTypeIcon = (type: string) => {
    return ARTIFACT_TYPE_CONFIG[type]?.icon || <InsertDriveFileIcon fontSize="small" />
  }

  const getTypeLabel = (type: string): string => {
    return t(`artifactTypes.${type}`, type)
  }

  if (artifacts.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('selectArtifact')}
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
                      sx={{ pl: 4, py: 0.25 }}
                      onDoubleClick={() => handleArtifactDoubleClick(artifact)}
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
