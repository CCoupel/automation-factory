import React, { useState } from 'react'
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material'
import CodeIcon from '@mui/icons-material/Code'
import ExpandLess from '@mui/icons-material/ExpandLess'
import ExpandMore from '@mui/icons-material/ExpandMore'
import { useTranslation } from 'react-i18next'
import { ProjectArtifact } from '../../services/projectService'

interface TemplatesTabProps {
  templateArtifacts: ProjectArtifact[]
}

const TemplatesTab: React.FC<TemplatesTabProps> = ({ templateArtifacts }) => {
  const { t } = useTranslation('project')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (templateArtifacts.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">{t('noTemplates')}</Typography>
      </Box>
    )
  }

  // Extract filename from path
  const getFileName = (path: string) => path.split('/').pop() || path

  return (
    <Box sx={{ overflow: 'auto' }}>
      <List dense>
        {templateArtifacts.map(artifact => {
          const isExpanded = expanded.has(artifact.id)
          return (
            <React.Fragment key={artifact.id}>
              <ListItemButton onClick={() => toggleExpand(artifact.id)} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CodeIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontFamily="monospace">
                      {getFileName(artifact.path)}
                    </Typography>
                  }
                  secondary={artifact.path}
                />
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              <Collapse in={isExpanded} timeout="auto">
                <Box sx={{ mx: 2, mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1, overflow: 'auto' }}>
                  <pre style={{ margin: 0, fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {artifact.raw_content || '(empty)'}
                  </pre>
                </Box>
              </Collapse>
            </React.Fragment>
          )
        })}
      </List>
    </Box>
  )
}

export default TemplatesTab
