import { Box, Button, Chip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

const VarsZone = () => {
  // Variables de démonstration
  const mockVars = [
    { key: 'ansible_user', value: 'root' },
    { key: 'ansible_port', value: '22' },
    { key: 'app_name', value: 'myapp' },
  ]

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', minWidth: 80 }}>
        Variables:
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {mockVars.map((variable, index) => (
          <Chip
            key={index}
            label={`${variable.key}: ${variable.value}`}
            size="small"
            onDelete={() => console.log('Delete var:', variable.key)}
            color="primary"
            variant="outlined"
          />
        ))}

        <Button
          size="small"
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={() => console.log('Add variable')}
        >
          Add Variable
        </Button>
      </Box>
    </Box>
  )
}

export default VarsZone
