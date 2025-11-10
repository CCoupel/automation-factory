import { Box, TextField, Typography } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'

const PlayZone = () => {
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
      <PlayArrowIcon sx={{ fontSize: 32 }} />
      <Typography variant="h6" sx={{ fontWeight: 'bold', minWidth: 150 }}>
        Ansible Builder
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
        <TextField
          label="Playbook Name"
          variant="outlined"
          size="small"
          defaultValue="my-playbook"
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

export default PlayZone
