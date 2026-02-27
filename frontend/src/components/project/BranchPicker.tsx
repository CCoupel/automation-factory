import React, { useCallback, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  TextField,
  Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import CloudIcon from '@mui/icons-material/Cloud'
import { useTranslation } from 'react-i18next'
import { gitOperationsService, GitBranchInfo } from '../../services/gitOperationsService'

interface BranchPickerProps {
  projectId: string
  currentBranch: string
  onBranchSwitch: (branch: string, artifactsImported: number) => void
}

const BranchPicker: React.FC<BranchPickerProps> = ({ projectId, currentBranch, onBranchSwitch }) => {
  const { t } = useTranslation('project')
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [branches, setBranches] = useState<GitBranchInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [creating, setCreating] = useState(false)
  const [switchTarget, setSwitchTarget] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)

  const fetchBranches = useCallback(async () => {
    setLoading(true)
    try {
      const data = await gitOperationsService.listBranches(projectId)
      setBranches(data.branches)
    } catch {
      // Silently fail — popover will just show empty
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
    fetchBranches()
  }

  const handleClose = () => {
    setAnchorEl(null)
    setNewBranchName('')
  }

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return
    setCreating(true)
    try {
      await gitOperationsService.createBranch(projectId, newBranchName.trim())
      setNewBranchName('')
      fetchBranches()
    } catch {
      // Error logged in service
    } finally {
      setCreating(false)
    }
  }

  const handleSwitchConfirm = async () => {
    if (!switchTarget) return
    setSwitching(true)
    try {
      const result = await gitOperationsService.switchBranch(projectId, switchTarget)
      setSwitchTarget(null)
      handleClose()
      onBranchSwitch(result.branch, result.artifacts_imported)
    } catch {
      // Error logged in service
    } finally {
      setSwitching(false)
    }
  }

  const open = Boolean(anchorEl)

  return (
    <>
      <Chip
        label={currentBranch.length > 20 ? currentBranch.slice(0, 20) + '...' : currentBranch}
        size="small"
        variant="outlined"
        onClick={handleOpen}
        sx={{ cursor: 'pointer', maxWidth: 180, fontSize: '0.75rem' }}
        title={currentBranch}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ width: 280, maxHeight: 400, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
            {t('branches')}
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : (
            <List dense sx={{ py: 0 }}>
              {branches.map((branch) => (
                <ListItemButton
                  key={branch.name}
                  onClick={() => {
                    if (!branch.is_current) {
                      setSwitchTarget(branch.name)
                    }
                  }}
                  selected={branch.is_current}
                >
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    {branch.is_current ? (
                      <CheckIcon fontSize="small" color="primary" />
                    ) : branch.is_remote ? (
                      <CloudIcon fontSize="small" color="action" />
                    ) : null}
                  </ListItemIcon>
                  <ListItemText
                    primary={branch.name}
                    primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}

          <Divider />
          <Box sx={{ p: 1, display: 'flex', gap: 0.5 }}>
            <TextField
              size="small"
              placeholder={t('newBranchPlaceholder')}
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBranch()}
              sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: '0.8rem', py: 0.5 } }}
            />
            <Button
              size="small"
              variant="contained"
              onClick={handleCreateBranch}
              disabled={!newBranchName.trim() || creating}
              sx={{ fontSize: '0.7rem', minWidth: 0, px: 1 }}
            >
              {creating ? <CircularProgress size={14} /> : t('createBranch')}
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Switch confirmation dialog */}
      <Dialog open={Boolean(switchTarget)} onClose={() => setSwitchTarget(null)}>
        <DialogTitle>{t('switchBranch')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('switchBranchConfirm', { branch: switchTarget })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSwitchTarget(null)} disabled={switching}>
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={handleSwitchConfirm}
            variant="contained"
            color="warning"
            disabled={switching}
          >
            {switching ? <CircularProgress size={16} /> : t('switchBranch')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default BranchPicker
