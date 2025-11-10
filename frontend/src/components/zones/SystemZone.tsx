import { Box, Typography, Button, Tab, Tabs, Paper } from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import BuildIcon from '@mui/icons-material/Build'
import { useState } from 'react'

const SystemZone = () => {
  const [activeTab, setActiveTab] = useState(0)

  const mockYaml = `---
- name: My Playbook
  hosts: all
  tasks:
    - name: Copy file
      ansible.builtin.copy:
        src: /source/file
        dest: /dest/file

    - name: Start service
      ansible.builtin.service:
        name: nginx
        state: started`

  const mockLogs = `[2024-01-08 12:00:00] Playbook initialized
[2024-01-08 12:00:01] Added module: copy
[2024-01-08 12:00:02] Added module: service
[2024-01-08 12:00:03] Ready to compile`

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with actions */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          bgcolor: 'background.paper',
          borderBottom: '1px solid #ddd',
        }}
      >
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab label="Preview" />
          <Tab label="Logs" />
          <Tab label="Validation" />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<BuildIcon />}
            size="small"
            onClick={() => console.log('Compile playbook')}
          >
            Compile
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            size="small"
            onClick={() => console.log('Download playbook')}
          >
            Download YAML
          </Button>
        </Box>
      </Box>

      {/* Content Area */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              height: '100%',
              overflow: 'auto',
            }}
          >
            <pre style={{ margin: 0 }}>{mockYaml}</pre>
          </Paper>
        )}

        {activeTab === 1 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: '#f5f5f5',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              height: '100%',
              overflow: 'auto',
            }}
          >
            <pre style={{ margin: 0 }}>{mockLogs}</pre>
          </Paper>
        )}

        {activeTab === 2 && (
          <Paper elevation={0} sx={{ p: 2, height: '100%' }}>
            <Typography variant="body2" color="success.main">
              ✓ Playbook syntax is valid
            </Typography>
            <Typography variant="body2" color="success.main">
              ✓ All modules are properly configured
            </Typography>
            <Typography variant="body2" color="warning.main">
              ⚠ Warning: Consider adding error handling
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  )
}

export default SystemZone
