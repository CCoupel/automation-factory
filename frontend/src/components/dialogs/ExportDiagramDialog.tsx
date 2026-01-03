import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormControl,
  FormLabel,
  Checkbox,
  Divider,
  Paper,
  Chip,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ImageIcon from '@mui/icons-material/Image'
import { Play } from '../../types/playbook'
import {
  exportABD,
  exportMermaid,
  exportSVG
} from '../../services/diagramExportApiService'
import { ExportFormat, MermaidExportOptions, SVGExportOptions } from '../../types/diagram-export'

interface ExportDiagramDialogProps {
  open: boolean
  onClose: () => void
  plays: Play[]
  playbookName: string
  playbookId?: string
  collapsedBlocks: string[]
  collapsedBlockSections: string[]
  collapsedPlaySections: string[]
  activePlayIndex: number
}

const ExportDiagramDialog: React.FC<ExportDiagramDialogProps> = ({
  open,
  onClose,
  plays,
  playbookName,
  playbookId,
  collapsedBlocks,
  collapsedBlockSections,
  collapsedPlaySections,
  activePlayIndex
}) => {
  // State
  const [format, setFormat] = useState<ExportFormat>('abd')
  const [exporting, setExporting] = useState(false)

  // ABD Options
  const [includeUIState, setIncludeUIState] = useState(true)
  const [includeIntegrity, setIncludeIntegrity] = useState(true)
  const [prettyPrint, setPrettyPrint] = useState(false)

  // Mermaid Options
  const [mermaidDirection, setMermaidDirection] = useState<'TB' | 'LR'>('TB')
  const [includePlays, setIncludePlays] = useState(true)
  const [includeSections, setIncludeSections] = useState(true)
  const [includeBlocks, setIncludeBlocks] = useState(true)

  // SVG Options
  const [svgScale, setSvgScale] = useState<number>(1)
  const [svgBackground, setSvgBackground] = useState<string>('#ffffff')

  // Stats
  const moduleCount = plays.reduce((s, p) => s + p.modules.length, 0)
  const linkCount = plays.reduce((s, p) => s + p.links.length, 0)
  const variableCount = plays.reduce((s, p) => s + (p.variables?.length || 0), 0)

  const handleExport = useCallback(async () => {
    setExporting(true)

    try {
      if (format === 'abd') {
        await exportABD(plays, playbookName, {
          playbookId,
          includeUIState,
          includeIntegrity,
          prettyPrint,
          collapsedBlocks,
          collapsedBlockSections,
          collapsedPlaySections,
          activePlayIndex,
        })
      } else if (format === 'mermaid') {
        const options: MermaidExportOptions = {
          direction: mermaidDirection,
          includePlays,
          includeSections,
          includeBlocks,
        }
        await exportMermaid(plays, playbookName, options)
      } else if (format === 'svg') {
        const options: SVGExportOptions = {
          scale: svgScale,
          backgroundColor: svgBackground,
          padding: 20,
          collapsedBlocks,
        }
        await exportSVG(plays, playbookName, options)
      }

      onClose()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }, [
    format,
    plays,
    playbookName,
    playbookId,
    collapsedBlocks,
    collapsedBlockSections,
    collapsedPlaySections,
    activePlayIndex,
    includeUIState,
    includeIntegrity,
    prettyPrint,
    mermaidDirection,
    includePlays,
    includeSections,
    includeBlocks,
    svgScale,
    svgBackground,
    onClose
  ])

  const formatInfo = {
    abd: {
      icon: <InsertDriveFileIcon />,
      title: 'Ansible Builder Diagram (.abd)',
      description: 'Full diagram backup with all data. Can be re-imported later.',
      extension: '.abd',
    },
    mermaid: {
      icon: <AccountTreeIcon />,
      title: 'Mermaid Flowchart (.md)',
      description: 'Markdown with Mermaid diagram. Renders in GitHub, GitLab, Notion.',
      extension: '.md',
    },
    svg: {
      icon: <ImageIcon />,
      title: 'SVG Image (.svg)',
      description: 'Vector image for presentations, documentation, or printing.',
      extension: '.svg',
    },
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Export Diagram</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Stats */}
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom>
              {playbookName || 'Untitled Playbook'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={`${plays.length} Play(s)`} />
              <Chip size="small" label={`${moduleCount} Module(s)`} />
              <Chip size="small" label={`${linkCount} Link(s)`} />
              <Chip size="small" label={`${variableCount} Variable(s)`} />
            </Box>
          </Paper>

          {/* Format Selection */}
          <FormControl component="fieldset">
            <FormLabel component="legend">Export Format</FormLabel>
            <RadioGroup
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
            >
              {(Object.keys(formatInfo) as ExportFormat[]).map((fmt) => (
                <Paper
                  key={fmt}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mb: 1,
                    cursor: 'pointer',
                    bgcolor: format === fmt ? 'action.selected' : 'background.paper',
                    borderColor: format === fmt ? 'primary.main' : 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => setFormat(fmt)}
                >
                  <FormControlLabel
                    value={fmt}
                    control={<Radio size="small" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        {formatInfo[fmt].icon}
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {formatInfo[fmt].title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatInfo[fmt].description}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                  />
                </Paper>
              ))}
            </RadioGroup>
          </FormControl>

          <Divider />

          {/* Format-specific options */}
          {format === 'abd' && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                ABD Options
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeUIState}
                    onChange={(e) => setIncludeUIState(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Include UI state (collapsed blocks, active play)</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeIntegrity}
                    onChange={(e) => setIncludeIntegrity(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Include integrity checks (checksums)</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={prettyPrint}
                    onChange={(e) => setPrettyPrint(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Pretty print JSON (larger file, readable)</Typography>}
              />
            </Box>
          )}

          {format === 'mermaid' && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Mermaid Options
              </Typography>
              <FormControl component="fieldset" sx={{ mb: 1 }}>
                <FormLabel component="legend" sx={{ fontSize: '0.75rem' }}>Direction</FormLabel>
                <RadioGroup
                  row
                  value={mermaidDirection}
                  onChange={(e) => setMermaidDirection(e.target.value as 'TB' | 'LR')}
                >
                  <FormControlLabel
                    value="TB"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">Top to Bottom</Typography>}
                  />
                  <FormControlLabel
                    value="LR"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">Left to Right</Typography>}
                  />
                </RadioGroup>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includePlays}
                    onChange={(e) => setIncludePlays(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Include play subgraphs</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeSections}
                    onChange={(e) => setIncludeSections(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Include section subgraphs (pre_tasks, tasks, etc.)</Typography>}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeBlocks}
                    onChange={(e) => setIncludeBlocks(e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="body2">Include block subgraphs</Typography>}
              />
            </Box>
          )}

          {format === 'svg' && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                SVG Options
              </Typography>
              <FormControl component="fieldset" sx={{ mb: 1 }}>
                <FormLabel component="legend" sx={{ fontSize: '0.75rem' }}>Scale</FormLabel>
                <RadioGroup
                  row
                  value={svgScale.toString()}
                  onChange={(e) => setSvgScale(parseFloat(e.target.value))}
                >
                  <FormControlLabel value="0.5" control={<Radio size="small" />} label="50%" />
                  <FormControlLabel value="1" control={<Radio size="small" />} label="100%" />
                  <FormControlLabel value="1.5" control={<Radio size="small" />} label="150%" />
                  <FormControlLabel value="2" control={<Radio size="small" />} label="200%" />
                </RadioGroup>
              </FormControl>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontSize: '0.75rem' }}>Background</FormLabel>
                <RadioGroup
                  row
                  value={svgBackground}
                  onChange={(e) => setSvgBackground(e.target.value)}
                >
                  <FormControlLabel
                    value="#ffffff"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">White</Typography>}
                  />
                  <FormControlLabel
                    value="transparent"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">Transparent</Typography>}
                  />
                  <FormControlLabel
                    value="#f5f5f5"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">Light Gray</Typography>}
                  />
                </RadioGroup>
              </FormControl>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleExport}
          variant="contained"
          startIcon={<DownloadIcon />}
          disabled={exporting || plays.length === 0}
        >
          {exporting ? 'Exporting...' : `Export ${formatInfo[format].extension}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ExportDiagramDialog
