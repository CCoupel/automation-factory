import React, { useEffect, useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Tabs,
  Tab,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemButton,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FolderIcon from '@mui/icons-material/Folder'
import DescriptionIcon from '@mui/icons-material/Description'
import CloudDownloadIcon from '@mui/icons-material/CloudDownload'
import LogoutIcon from '@mui/icons-material/Logout'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import LanguageIcon from '@mui/icons-material/Language'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useProjectStore } from '../stores/projectStore'
import { playbookService, Playbook } from '../services/playbookService'
import ProjectCard from '../components/home/ProjectCard'
import CreateProjectDialog from '../components/home/CreateProjectDialog'
import ImportGitDialog from '../components/home/ImportGitDialog'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('project')
  const { t: tc } = useTranslation('common')
  const { i18n } = useTranslation()
  const { user, logout } = useAuth()
  const { themeMode, darkMode, cycleThemeMode } = useTheme()

  const [activeTab, setActiveTab] = useState(0)
  const [fabAnchor, setFabAnchor] = useState<null | HTMLElement>(null)
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [importGitDialogOpen, setImportGitDialogOpen] = useState(false)

  // Projects from store
  const projects = useProjectStore(s => s.projects)
  const isLoading = useProjectStore(s => s.isLoading)
  const error = useProjectStore(s => s.error)
  const fetchProjects = useProjectStore(s => s.fetchProjects)

  // Standalone playbooks
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [playbooksLoading, setPlaybooksLoading] = useState(false)

  useEffect(() => {
    fetchProjects()
    loadPlaybooks()
  }, [])

  const loadPlaybooks = async () => {
    setPlaybooksLoading(true)
    try {
      const data = await playbookService.listPlaybooks()
      setPlaybooks(data)
    } catch {
      // Handled silently
    } finally {
      setPlaybooksLoading(false)
    }
  }

  const handleCreatePlaybook = async () => {
    setFabAnchor(null)
    try {
      const newPlaybook = await playbookService.createPlaybook({
        name: 'Untitled Playbook',
        description: '',
        content: {
          modules: [],
          links: [],
          plays: [{
            id: 'play-1',
            name: 'Play 1',
            hosts: 'all',
            gatherFacts: true,
            become: false,
          }],
          collapsedBlocks: [],
          collapsedBlockSections: [],
          metadata: { playbookName: 'Untitled Playbook' },
          variables: [],
        },
      })
      navigate(`/playbooks/${newPlaybook.id}`)
    } catch {
      // Handled silently
    }
  }

  const handleLogout = async () => {
    setUserMenuAnchor(null)
    await logout()
    navigate('/login')
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Bar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {tc('appName')}
          </Typography>

          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)}>
                <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem', bgcolor: 'primary.main' }}>
                  {user.username?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={() => setUserMenuAnchor(null)}
              >
                <MenuItem disabled>
                  <ListItemText primary={user.username} secondary={user.email} />
                </MenuItem>
                <Divider />

                {user.role === 'admin' && (
                  <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/admin/accounts') }}>
                    <ListItemIcon><SupervisorAccountIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>{tc('accountsManagement')}</ListItemText>
                  </MenuItem>
                )}

                <MenuItem onClick={() => { cycleThemeMode() }}>
                  <ListItemIcon>
                    {themeMode === 'light' && <Brightness7Icon fontSize="small" />}
                    {themeMode === 'dark' && <Brightness4Icon fontSize="small" />}
                    {themeMode === 'system' && <SettingsBrightnessIcon fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      themeMode === 'light' ? tc('lightMode') :
                      themeMode === 'dark' ? tc('darkMode') :
                      tc('systemAuto')
                    }
                  />
                  <Chip
                    label={themeMode === 'light' ? 'Light' : themeMode === 'dark' ? 'Dark' : 'Auto'}
                    size="small" variant="outlined"
                    sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                  />
                </MenuItem>

                <MenuItem onClick={() => {
                  const next = i18n.language?.startsWith('fr') ? 'en' : 'fr'
                  i18n.changeLanguage(next)
                }}>
                  <ListItemIcon><LanguageIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={tc('language')} />
                  <Chip
                    label={i18n.language?.startsWith('fr') ? 'FR' : 'EN'}
                    size="small" variant="outlined"
                    sx={{ ml: 1, fontSize: '0.7rem', height: 20 }}
                  />
                </MenuItem>

                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>{tc('logout')}</ListItemText>
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          sx={{ mb: 3 }}
        >
          <Tab label={`${t('projects')} (${projects.length})`} />
          <Tab label={`${t('standalonePlaybooks')} (${playbooks.length})`} />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {/* Projects Tab */}
        {activeTab === 0 && (
          <Box>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : projects.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                {t('noProjects')}
              </Typography>
            ) : (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 2,
              }}>
                {projects.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* Standalone Playbooks Tab */}
        {activeTab === 1 && (
          <Box>
            {playbooksLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : playbooks.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                {t('noPlaybooks')}
              </Typography>
            ) : (
              <List>
                {playbooks.map(playbook => (
                  <ListItem key={playbook.id} disablePadding>
                    <ListItemButton onClick={() => navigate(`/playbooks/${playbook.id}`)}>
                      <ListItemIcon><DescriptionIcon /></ListItemIcon>
                      <ListItemText
                        primary={playbook.name}
                        secondary={playbook.description || undefined}
                      />
                      {playbook.is_shared && (
                        <Chip
                          label={playbook.user_role}
                          size="small"
                          variant="outlined"
                          color="info"
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </Box>

      {/* FAB with dropdown */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={(e) => setFabAnchor(e.currentTarget)}
      >
        <AddIcon />
      </Fab>
      <Menu
        anchorEl={fabAnchor}
        open={Boolean(fabAnchor)}
        onClose={() => setFabAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { setFabAnchor(null); setCreateDialogOpen(true) }}>
          <ListItemIcon><FolderIcon /></ListItemIcon>
          <ListItemText>{t('newProject')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleCreatePlaybook}>
          <ListItemIcon><DescriptionIcon /></ListItemIcon>
          <ListItemText>{t('newPlaybook')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setFabAnchor(null); setImportGitDialogOpen(true) }}>
          <ListItemIcon><CloudDownloadIcon /></ListItemIcon>
          <ListItemText>{t('importFromGit')}</ListItemText>
        </MenuItem>
      </Menu>

      <CreateProjectDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />

      <ImportGitDialog
        open={importGitDialogOpen}
        onClose={() => setImportGitDialogOpen(false)}
      />
    </Box>
  )
}

export default HomePage
