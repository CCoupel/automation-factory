import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useTranslation } from 'react-i18next'
import { useArtifactEditor } from '../../hooks/useArtifactEditor'
import { parseIni, serializeIni, IniData } from '../../utils/iniParser'

interface AnsibleCfgEditorProps {
  artifactPath: string
  artifactId: string
  projectId: string
}

const KNOWN_SECTIONS = ['defaults', 'privilege_escalation', 'connection', 'ssh_connection'] as const
type KnownSection = typeof KNOWN_SECTIONS[number]

const SECTION_I18N_KEYS: Record<KnownSection, string> = {
  defaults: 'ansibleCfgDefaults',
  privilege_escalation: 'ansibleCfgPrivilegeEscalation',
  connection: 'ansibleCfgConnection',
  ssh_connection: 'ansibleCfgSshConnection',
}

const AnsibleCfgEditor: React.FC<AnsibleCfgEditorProps> = ({ artifactPath, artifactId, projectId }) => {
  const { t } = useTranslation('project')
  const { content, setContent, isDirty, loading, saving, error, snackbar, closeSnackbar, save } =
    useArtifactEditor({ artifactId, projectId })

  const [iniData, setIniData] = useState<IniData>({ sections: {}, sectionOrder: [] })
  const [customText, setCustomText] = useState('')

  // Parse INI content into structured data
  useEffect(() => {
    const parsed = parseIni(content)

    // Separate known and custom sections
    const customSections: IniData = { sections: {}, sectionOrder: [] }
    for (const section of parsed.sectionOrder) {
      if (!KNOWN_SECTIONS.includes(section as KnownSection)) {
        customSections.sections[section] = parsed.sections[section]
        customSections.sectionOrder.push(section)
      }
    }
    setCustomText(customSections.sectionOrder.length > 0 ? serializeIni(customSections) : '')
    setIniData(parsed)
  }, [content])

  // Serialize back to INI whenever iniData or customText changes
  const syncToContent = useCallback((data: IniData, custom: string) => {
    // Build known sections
    const knownData: IniData = { sections: {}, sectionOrder: [] }
    for (const section of KNOWN_SECTIONS) {
      if (data.sections[section] && Object.keys(data.sections[section]).length > 0) {
        knownData.sections[section] = data.sections[section]
        knownData.sectionOrder.push(section)
      }
    }
    let result = serializeIni(knownData)
    if (custom.trim()) {
      result = result + custom.trim() + '\n'
    }
    setContent(result)
  }, [setContent])

  const handleValueChange = useCallback((section: string, key: string, value: string) => {
    setIniData(prev => {
      const updated = {
        ...prev,
        sections: {
          ...prev.sections,
          [section]: { ...prev.sections[section], [key]: value },
        },
      }
      syncToContent(updated, customText)
      return updated
    })
  }, [customText, syncToContent])

  const handleAddKey = useCallback((section: string) => {
    const key = `new_key_${Date.now()}`
    setIniData(prev => {
      const sectionData = prev.sections[section] || {}
      const sectionOrder = prev.sectionOrder.includes(section)
        ? prev.sectionOrder
        : [...prev.sectionOrder, section]
      const updated = {
        ...prev,
        sections: { ...prev.sections, [section]: { ...sectionData, [key]: '' } },
        sectionOrder,
      }
      syncToContent(updated, customText)
      return updated
    })
  }, [customText, syncToContent])

  const handleDeleteKey = useCallback((section: string, key: string) => {
    setIniData(prev => {
      const { [key]: _, ...rest } = prev.sections[section] || {}
      const updated = {
        ...prev,
        sections: { ...prev.sections, [section]: rest },
      }
      syncToContent(updated, customText)
      return updated
    })
  }, [customText, syncToContent])

  const handleCustomTextChange = useCallback((value: string) => {
    setCustomText(value)
    syncToContent(iniData, value)
  }, [iniData, syncToContent])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
          {t('ansibleCfgEditor')} — {artifactPath}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          disabled={!isDirty || saving}
          onClick={save}
        >
          Save
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      {/* Known Sections */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {KNOWN_SECTIONS.map(section => (
          <Accordion key={section} defaultExpanded={!!iniData.sections[section]}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">{t(SECTION_I18N_KEYS[section])}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Object.entries(iniData.sections[section] || {}).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      label="Key"
                      value={key}
                      sx={{ flex: 1 }}
                      InputProps={{ readOnly: true }}
                    />
                    <TextField
                      size="small"
                      label="Value"
                      value={value}
                      sx={{ flex: 2 }}
                      onChange={e => handleValueChange(section, key, e.target.value)}
                    />
                    <IconButton size="small" onClick={() => handleDeleteKey(section, key)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddKey(section)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  {t('addCustomKey')}
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}

        {/* Custom Sections */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">{t('ansibleCfgCustomSections')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" color="text.secondary" gutterBottom sx={{ display: 'block', mb: 1 }}>
              {t('ansibleCfgCustomSectionsHint')}
            </Typography>
            <TextField
              multiline
              fullWidth
              minRows={4}
              value={customText}
              onChange={e => handleCustomTextChange(e.target.value)}
              placeholder="[custom_section]\nkey = value"
              sx={{ fontFamily: 'monospace' }}
            />
          </AccordionDetails>
        </Accordion>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={closeSnackbar}>
          {snackbar.message === 'saved' ? t('saved') : snackbar.message === 'saveError' ? t('saveError') : snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default AnsibleCfgEditor
