import { Box, TextField, Typography } from '@mui/material'
import DescriptionIcon from '@mui/icons-material/Description'
import { useState } from 'react'

const PlaybookZone = () => {
  const [playbookName, setPlaybookName] = useState('my-playbook')
  const [playbookVersion, setPlaybookVersion] = useState('1.0.0')

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        bgcolor: 'primary.main',
        color: 'white',
      }}
    >
      <DescriptionIcon sx={{ fontSize: 32 }} />
      <Typography variant="h6" sx={{ fontWeight: 'bold', minWidth: 150 }}>
        Playbook
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
        <TextField
          label="Name"
          variant="outlined"
          size="small"
          value={playbookName}
          onChange={(e) => setPlaybookName(e.target.value)}
          sx={{
            bgcolor: 'white',
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.23)',
              },
            },
          }}
        />

        <TextField
          label="Version"
          variant="outlined"
          size="small"
          value={playbookVersion}
          onChange={(e) => setPlaybookVersion(e.target.value)}
          sx={{
            width: 150,
            bgcolor: 'white',
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.23)',
              },
            },
          }}
        />

        <TextField
          label="Inventory"
          variant="outlined"
          size="small"
          defaultValue="hosts"
          sx={{
            bgcolor: 'white',
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.23)',
              },
            },
          }}
        />

        <TextField
          label="Ansible Version"
          variant="outlined"
          size="small"
          defaultValue="2.15"
          sx={{
            width: 120,
            bgcolor: 'white',
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.23)',
              },
            },
          }}
        />
      </Box>
    </Box>
  )
}

export default PlaybookZone
