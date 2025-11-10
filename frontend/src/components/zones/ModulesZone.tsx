import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SearchIcon from '@mui/icons-material/Search'
import FolderIcon from '@mui/icons-material/Folder'
import ExtensionIcon from '@mui/icons-material/Extension'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import { useState } from 'react'

const ModulesZone = () => {
  const [activeTab, setActiveTab] = useState(0)

  // Éléments génériques (blocks, handlers, etc.)
  const genericElements = [
    { name: 'play', description: 'Define a play in the playbook' },
    { name: 'block', description: 'Group tasks with error handling' },
    { name: 'rescue', description: 'Error recovery block' },
    { name: 'always', description: 'Always execute block' },
    { name: 'include_tasks', description: 'Include tasks from file' },
    { name: 'import_tasks', description: 'Import tasks statically' },
  ]

  // Données de démonstration
  const mockCollections = [
    {
      name: 'ansible.builtin',
      modules: [
        { name: 'copy', description: 'Copy files to remote locations' },
        { name: 'file', description: 'Manage files and file properties' },
        { name: 'template', description: 'Template a file out to a target host' },
        { name: 'service', description: 'Manage services' },
        { name: 'package', description: 'Generic OS package manager' },
      ],
    },
    {
      name: 'ansible.posix',
      modules: [
        { name: 'firewalld', description: 'Manage firewalld' },
        { name: 'sysctl', description: 'Manage sysctl entries' },
        { name: 'mount', description: 'Control active and configured mount points' },
      ],
    },
    {
      name: 'community.general',
      modules: [
        { name: 'docker_container', description: 'Manage docker containers' },
        { name: 'git', description: 'Deploy software from git checkouts' },
        { name: 'npm', description: 'Manage node packages with npm' },
      ],
    },
  ]

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #ddd' }}>
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 'bold' }}>
          Elements
        </Typography>

        {/* Tabs pour switcher entre Générique et Modules */}
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="fullWidth"
          sx={{ mb: 1.5 }}
        >
          <Tab label="Generic" />
          <Tab label="Modules" />
        </Tabs>

        <TextField
          fullWidth
          size="small"
          placeholder={activeTab === 0 ? "Search generic..." : "Search modules..."}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 0 ? (
          // Zone Générique
          <List dense>
            {genericElements.map((element, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      'module',
                      JSON.stringify({
                        collection: 'ansible.generic',
                        name: element.name,
                        description: element.description,
                      })
                    )
                  }}
                  sx={{
                    '&:hover': {
                      bgcolor: 'secondary.light',
                      color: 'white',
                    },
                  }}
                >
                  <AccountTreeIcon sx={{ mr: 1, fontSize: 18 }} />
                  <ListItemText
                    primary={element.name}
                    secondary={element.description}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: 'medium',
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      sx: { fontSize: '0.7rem' },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        ) : (
          // Zone Modules (existante)
          <>
          {mockCollections.map((collection, collectionIndex) => (
          <Accordion key={collectionIndex} defaultExpanded={collectionIndex === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FolderIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {collection.name}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <List dense>
                {collection.modules.map((module, moduleIndex) => (
                  <ListItem key={moduleIndex} disablePadding>
                    <ListItemButton
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'module',
                          JSON.stringify({
                            collection: collection.name,
                            name: module.name,
                            description: module.description,
                          })
                        )
                      }}
                      sx={{
                        '&:hover': {
                          bgcolor: 'primary.light',
                          color: 'white',
                        },
                      }}
                    >
                      <ExtensionIcon sx={{ mr: 1, fontSize: 18 }} />
                      <ListItemText
                        primary={module.name}
                        secondary={module.description}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 'medium',
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          sx: { fontSize: '0.7rem' },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
          ))}
          </>
        )}
      </Box>
    </Box>
  )
}

export default ModulesZone
