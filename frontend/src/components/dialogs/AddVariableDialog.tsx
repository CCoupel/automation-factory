import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box
} from '@mui/material'

interface AddVariableDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (key: string, value: string) => void
  existingKeys: string[]
}

const AddVariableDialog: React.FC<AddVariableDialogProps> = ({
  open,
  onClose,
  onAdd,
  existingKeys
}) => {
  const [variableKey, setVariableKey] = useState('')
  const [variableValue, setVariableValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setVariableKey('')
      setVariableValue('')
      setError(null)
    }
  }, [open])

  // Check for duplicate keys
  const isDuplicate = variableKey.trim() !== '' && existingKeys.includes(variableKey.trim())

  const handleAdd = () => {
    const trimmedKey = variableKey.trim()

    if (!trimmedKey) {
      setError('Variable name cannot be empty')
      return
    }

    if (isDuplicate) {
      setError('A variable with this name already exists')
      return
    }

    onAdd(trimmedKey, variableValue)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isDuplicate && variableKey.trim()) {
      handleAdd()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Variable</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Variable Name"
            fullWidth
            value={variableKey}
            onChange={(e) => setVariableKey(e.target.value)}
            onKeyDown={handleKeyDown}
            error={isDuplicate}
            helperText={isDuplicate ? 'Duplicate variable name' : ''}
            autoFocus
          />

          <TextField
            label="Variable Value"
            fullWidth
            value={variableValue}
            onChange={(e) => setVariableValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleAdd}
          variant="contained"
          disabled={!variableKey.trim() || isDuplicate}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddVariableDialog
