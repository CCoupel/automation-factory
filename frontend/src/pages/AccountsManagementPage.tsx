import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Switch,
  Tooltip,
  AppBar,
  Toolbar,
  Button,
  Chip,
  Alert
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import PersonIcon from '@mui/icons-material/Person'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

interface UserAccount {
  id: string
  email: string
  username: string
  is_admin: boolean
  is_active: boolean
  created_at: string
}

const AccountsManagementPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Redirect if not admin
    if (user?.role !== 'admin') {
      navigate('/')
      return
    }

    fetchAccounts()
  }, [user, navigate])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('authToken')
      const response = await axios.get('http://localhost:8000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAccounts(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch accounts')
      console.error('Error fetching accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.patch(
        `http://localhost:8000/api/admin/users/${userId}`,
        { is_admin: !currentIsAdmin },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Update local state
      setAccounts(accounts.map(acc =>
        acc.id === userId ? { ...acc, is_admin: !currentIsAdmin } : acc
      ))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user role')
      console.error('Error updating role:', err)
    }
  }

  const handleToggleActive = async (userId: string, currentIsActive: boolean) => {
    try {
      const token = localStorage.getItem('authToken')
      await axios.patch(
        `http://localhost:8000/api/admin/users/${userId}`,
        { is_active: !currentIsActive },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Update local state
      setAccounts(accounts.map(acc =>
        acc.id === userId ? { ...acc, is_active: !currentIsActive } : acc
      ))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user status')
      console.error('Error updating status:', err)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <AdminPanelSettingsIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Accounts Management
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Logged in as: {user?.username}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            User Accounts
          </Typography>

          {loading ? (
            <Typography>Loading accounts...</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Username</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Admin</TableCell>
                    <TableCell align="center">Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {account.is_admin ? (
                            <AdminPanelSettingsIcon fontSize="small" color="primary" />
                          ) : (
                            <PersonIcon fontSize="small" color="action" />
                          )}
                          {account.username}
                        </Box>
                      </TableCell>
                      <TableCell>{account.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={account.is_admin ? 'Admin' : 'User'}
                          color={account.is_admin ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={account.is_active ? 'Active' : 'Inactive'}
                          color={account.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(account.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip
                          title={
                            account.email === 'admin@ansible-builder.local'
                              ? 'Cannot modify default admin account'
                              : account.is_admin
                              ? 'Revoke admin privileges'
                              : 'Grant admin privileges'
                          }
                        >
                          <span>
                            <Switch
                              checked={account.is_admin}
                              onChange={() => handleToggleAdmin(account.id, account.is_admin)}
                              disabled={account.email === 'admin@ansible-builder.local'}
                              color="primary"
                              size="small"
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip
                          title={
                            account.email === 'admin@ansible-builder.local'
                              ? 'Cannot disable default admin account'
                              : account.is_active
                              ? 'Disable account'
                              : 'Enable account'
                          }
                        >
                          <span>
                            <Switch
                              checked={account.is_active}
                              onChange={() => handleToggleActive(account.id, account.is_active)}
                              disabled={account.email === 'admin@ansible-builder.local'}
                              color="success"
                              size="small"
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total accounts: {accounts.length}
            </Typography>
            <Button variant="outlined" onClick={fetchAccounts}>
              Refresh
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default AccountsManagementPage
