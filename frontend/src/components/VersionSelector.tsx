import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Typography
} from '@mui/material';
import { useAnsibleVersions } from '../hooks/useAnsibleVersions';

interface VersionSelectorProps {
  disabled?: boolean;
  onChange?: () => void;  // Callback après changement de version
  variant?: 'default' | 'header';  // Style pour header
}

const getVersionLabel = (version: string): string => {
  switch (version) {
    case 'latest':
      return 'Latest (Recommended)';
    case '2.10':
      return 'Ansible 2.10 (Legacy)';
    default:
      return `Ansible ${version}`;
  }
};

const getVersionColor = (version: string) => {
  switch (version) {
    case 'latest':
      return 'primary';
    case '2.10':
      return 'warning';
    default:
      return 'default';
  }
};

export const VersionSelector: React.FC<VersionSelectorProps> = ({
  disabled = false,
  onChange,
  variant = 'default'
}) => {
  const { versions, selectedVersion, selectVersion, loading, error } = useAnsibleVersions();

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={2} sx={{ mb: 2 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary">
          Loading Ansible versions...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        {error}. Using fallback versions.
      </Alert>
    );
  }

  const isHeader = variant === 'header';

  return (
    <FormControl 
      size="small" 
      sx={{ 
        minWidth: 120,
        ...(isHeader && {
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(255, 255, 255, 0.15)',
            color: 'white',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.7)',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: 'var(--font-xs, 12px)',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'rgba(255, 255, 255, 0.9)',
          },
          '& .MuiSelect-select': {
            color: 'white',
            fontSize: 'var(--font-sm, 13px)',
            py: 'var(--spacing-xs, 4px)',
          },
          '& .MuiSvgIcon-root': {
            color: 'rgba(255, 255, 255, 0.7)',
          },
        })
      }}
    >
      <InputLabel id="ansible-version-label">Ansible</InputLabel>
      <Select
        labelId="ansible-version-label"
        value={selectedVersion}
        onChange={(e) => {
          selectVersion(e.target.value);
          onChange?.();
        }}
        label="Ansible"
        disabled={disabled}
      >
        {versions.map((version) => (
          <MenuItem key={version} value={version}>
            {version === 'latest' ? 'Latest' : `v${version}`}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};