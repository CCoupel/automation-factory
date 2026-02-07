import React from 'react'
import {
  Box,
  IconButton,
  Tooltip,
  ButtonGroup,
  Typography
} from '@mui/material'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { useZoom, ZoomLevel } from '../../contexts/ZoomContext'

/**
 * Zoom Control Component
 *
 * Allows users to adjust the interface zoom level (desktop only)
 * Positioned in the top-right corner of the interface
 */
const ZoomControl: React.FC = () => {
  const { zoomLevel, setZoomLevel, fontSize } = useZoom()

  const zoomLevels: ZoomLevel[] = ['small', 'medium', 'large', 'xlarge']
  const currentIndex = zoomLevels.indexOf(zoomLevel)

  const handleZoomIn = () => {
    if (currentIndex < zoomLevels.length - 1) {
      setZoomLevel(zoomLevels[currentIndex + 1])
    }
  }

  const handleZoomOut = () => {
    if (currentIndex > 0) {
      setZoomLevel(zoomLevels[currentIndex - 1])
    }
  }

  const handleReset = () => {
    setZoomLevel('medium')
  }

  const getZoomLabel = () => {
    const labels = {
      small: '75%',
      medium: '100%',
      large: '125%',
      xlarge: '150%'
    }
    return labels[zoomLevel]
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        bgcolor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 1,
        padding: '4px 8px',
        boxShadow: 1
      }}
    >
      <ButtonGroup size="small" variant="outlined">
        <Tooltip title="Zoom arrière">
          <span>
            <IconButton
              size="small"
              onClick={handleZoomOut}
              disabled={currentIndex === 0}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Réinitialiser le zoom">
          <IconButton
            size="small"
            onClick={handleReset}
            disabled={zoomLevel === 'medium'}
          >
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Zoom avant">
          <span>
            <IconButton
              size="small"
              onClick={handleZoomIn}
              disabled={currentIndex === zoomLevels.length - 1}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </ButtonGroup>

      <Typography
        variant="caption"
        sx={{
          minWidth: '45px',
          textAlign: 'center',
          fontWeight: 500,
          color: 'text.secondary'
        }}
      >
        {getZoomLabel()}
      </Typography>
    </Box>
  )
}

export default ZoomControl
