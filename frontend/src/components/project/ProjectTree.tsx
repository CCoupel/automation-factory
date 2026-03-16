import React, { useState, useRef, useCallback, useMemo } from 'react'
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
} from '@mui/material'
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView'
import { TreeItem } from '@mui/x-tree-view/TreeItem'
import FolderIcon from '@mui/icons-material/Folder'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore'
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess'
import EditIcon from '@mui/icons-material/Edit'
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
import { buildFileTree, TreeNode } from '../../utils/fileTreeUtils'

const ARTIFACT_TYPE_ICONS: Record<string, React.ReactElement> = {
  playbook: <DescriptionIcon fontSize="small" />,
  role: <BuildIcon fontSize="small" />,
  inventory: <StorageIcon fontSize="small" />,
  variable_file: <TuneIcon fontSize="small" />,
  template: <CodeIcon fontSize="small" />,
  collection_requirements: <LibraryBooksIcon fontSize="small" />,
  custom_module: <ExtensionIcon fontSize="small" />,
  ansible_cfg: <SettingsIcon fontSize="small" />,
  file: <InsertDriveFileIcon fontSize="small" />,
}

const ARTIFACT_TYPES = [
  'playbook', 'role', 'inventory', 'variable_file', 'template',
  'collection_requirements', 'custom_module', 'ansible_cfg', 'file',
]

function getFileIcon(type?: string): React.ReactElement {
  return ARTIFACT_TYPE_ICONS[type || ''] || <InsertDriveFileIcon fontSize="small" />
}

function collectAllFolderIds(nodes: TreeNode[]): string[] {
  const ids: string[] = []
  const walk = (list: TreeNode[]) => {
    for (const node of list) {
      if (node.isFolder) {
        ids.push(node.id)
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return ids
}

function collectChildArtifacts(node: TreeNode): ProjectArtifact[] {
  const result: ProjectArtifact[] = []
  const walk = (n: TreeNode) => {
    if (!n.isFolder && n.artifact) {
      result.push(n.artifact)
    }
    for (const child of n.children) {
      walk(child)
    }
  }
  walk(node)
  return result
}

type DialogMode =
  | { type: 'createFile'; parentPath: string }
  | { type: 'createFolder'; parentPath: string }
  | { type: 'rename'; node: TreeNode }
  | { type: 'deleteFile'; node: TreeNode }
  | { type: 'deleteFolder'; node: TreeNode }

const ProjectTree: React.FC = () => {
  const { t } = useTranslation('project')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()

  const artifacts = useProjectStore(s => s.artifacts)
  const currentProject = useProjectStore(s => s.currentProject)
  const selectedArtifactId = useProjectStore(s => s.selectedArtifactId)
  const setSelectedArtifact = useProjectStore(s => s.setSelectedArtifact)
  const createArtifact = useProjectStore(s => s.createArtifact)
  const updateArtifact = useProjectStore(s => s.updateArtifact)
  const deleteArtifact = useProjectStore(s => s.deleteArtifact)

  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [dialog, setDialog] = useState<DialogMode | null>(null)
  const [dialogName, setDialogName] = useState('')
  const [dialogFileType, setDialogFileType] = useState('file')
  const [dialogLoading, setDialogLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false, message: '', severity: 'info',
  })

  const playbooksCacheRef = useRef<Playbook[] | null>(null)

  const getPlaybooks = useCallback(async (): Promise<Playbook[]> => {
    if (playbooksCacheRef.current) return playbooksCacheRef.current
    const playbooks = await playbookService.listPlaybooks()
    playbooksCacheRef.current = playbooks
    return playbooks
  }, [])

  const tree = useMemo(() => buildFileTree(artifacts), [artifacts])
  const allFolderIds = useMemo(() => collectAllFolderIds(tree), [tree])

  const projectId = currentProject?.id

  // --- Toolbar actions ---

  const handleExpandAll = () => setExpandedItems(allFolderIds)
  const handleCollapseAll = () => setExpandedItems([])

  const openCreateFileDialog = (parentPath: string) => {
    setDialogName('')
    setDialogFileType('file')
    setDialog({ type: 'createFile', parentPath })
  }

  const openCreateFolderDialog = (parentPath: string) => {
    setDialogName('')
    setDialog({ type: 'createFolder', parentPath })
  }

  const openRenameDialog = (node: TreeNode) => {
    setDialogName(node.name)
    setDialog({ type: 'rename', node })
  }

  const openDeleteDialog = (node: TreeNode) => {
    if (node.isFolder) {
      setDialog({ type: 'deleteFolder', node })
    } else {
      setDialog({ type: 'deleteFile', node })
    }
  }

  // --- Dialog handlers ---

  const handleDialogClose = () => {
    if (dialogLoading) return
    setDialog(null)
  }

  const handleDialogSubmit = async () => {
    if (!dialog || !projectId) return

    setDialogLoading(true)
    try {
      if (dialog.type === 'createFile') {
        const path = dialog.parentPath ? `${dialog.parentPath}/${dialogName}` : dialogName
        if (artifacts.some(a => a.path === path)) {
          setSnackbar({ open: true, message: t('pathAlreadyExists'), severity: 'warning' })
          setDialogLoading(false)
          return
        }
        await createArtifact(projectId, { artifact_type: dialogFileType, path })
        setSnackbar({ open: true, message: t('createFile'), severity: 'success' })
      } else if (dialog.type === 'createFolder') {
        const path = dialog.parentPath ? `${dialog.parentPath}/${dialogName}` : dialogName
        const folderPath = `${path}/.gitkeep`
        if (artifacts.some(a => a.path === folderPath)) {
          setSnackbar({ open: true, message: t('pathAlreadyExists'), severity: 'warning' })
          setDialogLoading(false)
          return
        }
        await createArtifact(projectId, { artifact_type: 'file', path: folderPath })
        setSnackbar({ open: true, message: t('createFolder'), severity: 'success' })
      } else if (dialog.type === 'rename') {
        const { node } = dialog
        if (node.isFolder) {
          const childArtifacts = collectChildArtifacts(node)
          await Promise.all(childArtifacts.map(a => {
            const newPath = a.path.replace(node.path, node.path.replace(node.name, dialogName))
            return updateArtifact(projectId, a.id, { path: newPath })
          }))
        } else if (node.artifact) {
          const parts = node.path.split('/')
          parts[parts.length - 1] = dialogName
          const newPath = parts.join('/')
          await updateArtifact(projectId, node.artifact.id, { path: newPath })
        }
        setSnackbar({ open: true, message: t('rename'), severity: 'success' })
      } else if (dialog.type === 'deleteFile') {
        const { node } = dialog
        if (node.artifact) {
          await deleteArtifact(projectId, node.artifact.id)
        }
        setSnackbar({ open: true, message: t('deleteFile'), severity: 'success' })
      } else if (dialog.type === 'deleteFolder') {
        const { node } = dialog
        const childArtifacts = collectChildArtifacts(node)
        await Promise.all(childArtifacts.map(a => deleteArtifact(projectId, a.id)))
        setSnackbar({ open: true, message: t('deleteFolder'), severity: 'success' })
      }
      setDialog(null)
    } catch {
      setSnackbar({ open: true, message: String(t('delete')), severity: 'error' })
    } finally {
      setDialogLoading(false)
    }
  }

  // --- File click handlers ---

  const handleFileClick = (node: TreeNode) => {
    if (!node.isFolder && node.artifact) {
      setSelectedArtifact(node.artifact.id)
    }
  }

  const handleFileDoubleClick = async (node: TreeNode) => {
    if (node.isFolder || !node.artifact) return
    if (node.artifactType === 'playbook') {
      try {
        const playbooks = await getPlaybooks()
        const match = playbooks.find(p =>
          p.id === node.artifact?.content?.playbook_id ||
          (currentProject && p.name === node.artifact?.path)
        )
        if (match) {
          navigate(`/playbooks/${match.id}`)
        } else {
          setSnackbar({ open: true, message: t('noLinkedPlaybook'), severity: 'info' })
        }
      } catch {
        setSnackbar({ open: true, message: t('failedLoadPlaybooks'), severity: 'warning' })
      }
    } else {
      setSnackbar({ open: true, message: t('comingSoon'), severity: 'info' })
    }
  }

  // --- Inline action buttons ---

  const FolderActions: React.FC<{ node: TreeNode }> = ({ node }) => (
    <Box
      className="tree-actions"
      sx={{ display: 'flex', ml: 'auto', opacity: 0, transition: 'opacity 0.15s' }}
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip title={t('addSubfolder')} placement="top">
        <IconButton size="small" onClick={() => openCreateFolderDialog(node.path)}>
          <CreateNewFolderIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('addFile')} placement="top">
        <IconButton size="small" onClick={() => openCreateFileDialog(node.path)}>
          <NoteAddIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('rename')} placement="top">
        <IconButton size="small" onClick={() => openRenameDialog(node)}>
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('deleteFolder')} placement="top">
        <IconButton size="small" onClick={() => openDeleteDialog(node)}>
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )

  const FileActions: React.FC<{ node: TreeNode }> = ({ node }) => (
    <Box
      className="tree-actions"
      sx={{ display: 'flex', ml: 'auto', opacity: 0, transition: 'opacity 0.15s' }}
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip title={t('rename')} placement="top">
        <IconButton size="small" onClick={() => openRenameDialog(node)}>
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('deleteFile')} placement="top">
        <IconButton size="small" onClick={() => openDeleteDialog(node)}>
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )

  // --- Recursive tree rendering ---

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    if (node.isFolder) {
      return (
        <TreeItem
          key={node.id}
          itemId={node.id}
          label={
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, pr: 1,
              '&:hover .tree-actions': { opacity: 1 },
            }}>
              <FolderIcon sx={{ fontSize: 18, color: 'action.active' }} />
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                {node.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                {node.children.length}
              </Typography>
              <FolderActions node={node} />
            </Box>
          }
        >
          {node.children.map(renderTreeNode)}
        </TreeItem>
      )
    }

    const isSelected = selectedArtifactId === node.id
    return (
      <TreeItem
        key={node.id}
        itemId={node.id}
        label={
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, pr: 1,
              bgcolor: isSelected ? 'action.selected' : 'transparent',
              borderRadius: 0.5,
              '&:hover .tree-actions': { opacity: 1 },
            }}
            onClick={() => handleFileClick(node)}
            onDoubleClick={() => handleFileDoubleClick(node)}
          >
            {getFileIcon(node.artifactType)}
            <Typography variant="body2" noWrap sx={{ flex: 1 }}>
              {node.name}
            </Typography>
            <FileActions node={node} />
          </Box>
        }
      />
    )
  }

  // --- Dialog content ---

  const renderDialog = () => {
    if (!dialog) return null

    if (dialog.type === 'createFile') {
      return (
        <Dialog open onClose={handleDialogClose} maxWidth="xs" fullWidth>
          <DialogTitle>{t('newFile')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
            <TextField
              autoFocus
              label={t('fileName')}
              value={dialogName}
              onChange={(e) => setDialogName(e.target.value)}
              size="small"
              fullWidth
            />
            <FormControl size="small" fullWidth>
              <InputLabel>{t('fileType')}</InputLabel>
              <Select
                value={dialogFileType}
                label={t('fileType')}
                onChange={(e) => setDialogFileType(e.target.value)}
              >
                {ARTIFACT_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getFileIcon(type)}
                      {t(`artifactTypes.${type}`, type)}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} disabled={dialogLoading}>{tc('cancel')}</Button>
            <Button onClick={handleDialogSubmit} variant="contained" disabled={!dialogName.trim() || dialogLoading}>
              {t('create')}
            </Button>
          </DialogActions>
        </Dialog>
      )
    }

    if (dialog.type === 'createFolder') {
      return (
        <Dialog open onClose={handleDialogClose} maxWidth="xs" fullWidth>
          <DialogTitle>{t('newFolder')}</DialogTitle>
          <DialogContent sx={{ pt: '8px !important' }}>
            <TextField
              autoFocus
              label={t('folderName')}
              value={dialogName}
              onChange={(e) => setDialogName(e.target.value)}
              size="small"
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} disabled={dialogLoading}>{tc('cancel')}</Button>
            <Button onClick={handleDialogSubmit} variant="contained" disabled={!dialogName.trim() || dialogLoading}>
              {t('create')}
            </Button>
          </DialogActions>
        </Dialog>
      )
    }

    if (dialog.type === 'rename') {
      return (
        <Dialog open onClose={handleDialogClose} maxWidth="xs" fullWidth>
          <DialogTitle>{t('rename')}</DialogTitle>
          <DialogContent sx={{ pt: '8px !important' }}>
            <TextField
              autoFocus
              label={dialog.node.isFolder ? t('folderName') : t('fileName')}
              value={dialogName}
              onChange={(e) => setDialogName(e.target.value)}
              size="small"
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} disabled={dialogLoading}>{tc('cancel')}</Button>
            <Button onClick={handleDialogSubmit} variant="contained" disabled={!dialogName.trim() || dialogLoading}>
              {t('rename')}
            </Button>
          </DialogActions>
        </Dialog>
      )
    }

    if (dialog.type === 'deleteFile' || dialog.type === 'deleteFolder') {
      const confirmKey = dialog.type === 'deleteFile' ? 'deleteFileConfirm' : 'deleteFolderConfirm'
      return (
        <Dialog open onClose={handleDialogClose} maxWidth="xs" fullWidth>
          <DialogTitle>{dialog.type === 'deleteFile' ? t('deleteFile') : t('deleteFolder')}</DialogTitle>
          <DialogContent>
            <Typography>{t(confirmKey, { name: dialog.node.name })}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} disabled={dialogLoading}>{tc('cancel')}</Button>
            <Button onClick={handleDialogSubmit} color="error" variant="contained" disabled={dialogLoading}>
              {t('delete')}
            </Button>
          </DialogActions>
        </Dialog>
      )
    }

    return null
  }

  // --- Empty state ---

  if (artifacts.length === 0) {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('noArtifacts')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('noArtifactsHint')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Tooltip title={t('newFolder')}>
            <IconButton size="small" onClick={() => openCreateFolderDialog('')}>
              <CreateNewFolderIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('newFile')}>
            <IconButton size="small" onClick={() => openCreateFileDialog('')}>
              <NoteAddIcon />
            </IconButton>
          </Tooltip>
        </Box>
        {renderDialog()}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    )
  }

  // --- Main render ---

  return (
    <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tooltip title={t('newFolder')}>
          <IconButton size="small" onClick={() => openCreateFolderDialog('')}>
            <CreateNewFolderIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('newFile')}>
          <IconButton size="small" onClick={() => openCreateFileDialog('')}>
            <NoteAddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={t('expandAll')}>
          <IconButton size="small" onClick={handleExpandAll}>
            <UnfoldMoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('collapseAll')}>
          <IconButton size="small" onClick={handleCollapseAll}>
            <UnfoldLessIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tree */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 0.5 }}>
        <SimpleTreeView<false>
          multiSelect={false}
          expandedItems={expandedItems}
          onExpandedItemsChange={(_event, itemIds) => setExpandedItems(itemIds)}
          selectedItems={selectedArtifactId}
          onSelectedItemsChange={(_event, itemId) => {
            if (itemId && !itemId.startsWith('folder:')) {
              setSelectedArtifact(itemId)
            }
          }}
          sx={{
            '& .MuiTreeItem-content': { py: 0.25 },
            '& .MuiTreeItem-label': { fontSize: '0.85rem' },
          }}
        >
          {tree.map(renderTreeNode)}
        </SimpleTreeView>
      </Box>

      {renderDialog()}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ProjectTree
