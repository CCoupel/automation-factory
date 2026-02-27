import React from 'react'
import {
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import FolderIcon from '@mui/icons-material/Folder'
import ShareIcon from '@mui/icons-material/Share'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Project } from '../../services/projectService'

interface ProjectCardProps {
  project: Project
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const navigate = useNavigate()
  const { t } = useTranslation('project')

  const updatedDate = new Date(project.updated_at)
  const relativeTime = getRelativeTime(updatedDate)

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardActionArea
        onClick={() => navigate(`/projects/${project.id}`)}
        sx={{ height: '100%' }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <FolderIcon color="primary" />
            <Typography variant="h6" noWrap sx={{ flex: 1 }}>
              {project.name}
            </Typography>
          </Box>

          {project.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {project.description}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {t('lastEdited')}: {relativeTime}
            </Typography>
            {project.is_shared && (
              <Chip
                icon={<ShareIcon />}
                label={project.user_role}
                size="small"
                variant="outlined"
                color="info"
              />
            )}
          </Box>

          {project.owner_username && !project.is_shared && (
            <Typography variant="caption" color="text.secondary">
              {project.owner_username}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default ProjectCard
