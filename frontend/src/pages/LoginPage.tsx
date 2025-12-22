import React, { useState } from 'react'
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Container,
  Chip
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useVersionInfo } from '../hooks/useVersionInfo'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'

/**
 * Login/Register Page Component
 *
 * Provides authentication interface with:
 * - Login tab for existing users
 * - Register tab for new users
 * - Email and password validation
 * - Error handling and loading states
 * - Automatic redirect to main app after successful authentication
 *
 * Features:
 * - Material-UI design consistent with the app
 * - Tab-based navigation between login and register
 * - Form validation with error messages
 * - Loading spinner during authentication
 * - Persists session via AuthContext
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { login, register, isLoading } = useAuth()

  // Version info from shared hook
  const { frontendVersion, backendVersion } = useVersionInfo()

  // Tab state (0 = login, 1 = register)
  const [activeTab, setActiveTab] = useState(0)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('')

  // Error state
  const [error, setError] = useState<string | null>(null)

  /**
   * Handle login form submission
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!loginEmail || !loginPassword) {
      setError('Veuillez remplir tous les champs')
      return
    }

    // Attempt login
    const success = await login(loginEmail, loginPassword)

    if (success) {
      // Redirect to main app
      navigate('/')
    } else {
      setError('Email ou mot de passe incorrect')
    }
  }

  /**
   * Handle register form submission
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!registerEmail || !registerUsername || !registerPassword || !registerConfirmPassword) {
      setError('Veuillez remplir tous les champs')
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(registerEmail)) {
      setError('Email invalide')
      return
    }

    // Password validation
    if (registerPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    if (registerPassword !== registerConfirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    // Attempt registration
    const success = await register(registerEmail, registerUsername, registerPassword)

    if (success) {
      // Redirect to main app
      navigate('/')
    } else {
      setError('Erreur lors de l\'inscription. Veuillez réessayer.')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Logo and Title */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <PlayArrowIcon sx={{ fontSize: 60, color: '#667eea', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>
              Ansible Builder
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Constructeur graphique de playbooks Ansible
            </Typography>
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => {
              setActiveTab(newValue)
              setError(null)
            }}
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab label="Connexion" />
            <Tab label="Inscription" />
          </Tabs>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          {activeTab === 0 && (
            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                margin="normal"
                required
                autoFocus
                disabled={isLoading}
              />
              <TextField
                fullWidth
                label="Mot de passe"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                margin="normal"
                required
                disabled={isLoading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{
                  mt: 3,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #63408b 100%)'
                  }
                }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Se connecter'}
              </Button>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 1 && (
            <form onSubmit={handleRegister}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                margin="normal"
                required
                autoFocus
                disabled={isLoading}
              />
              <TextField
                fullWidth
                label="Nom d'utilisateur"
                type="text"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                margin="normal"
                required
                disabled={isLoading}
              />
              <TextField
                fullWidth
                label="Mot de passe"
                type="password"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                margin="normal"
                required
                disabled={isLoading}
                helperText="Minimum 6 caractères"
              />
              <TextField
                fullWidth
                label="Confirmer le mot de passe"
                type="password"
                value={registerConfirmPassword}
                onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                margin="normal"
                required
                disabled={isLoading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                sx={{
                  mt: 3,
                  py: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #63408b 100%)'
                  }
                }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit" /> : 'S\'inscrire'}
              </Button>
            </form>
          )}

          {/* Footer Note */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 3,
              color: '#999'
            }}
          >
            Mode SaaS - Vos playbooks sont sauvegardés sur le cloud
          </Typography>

          {/* Version Information */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 1,
              mt: 2
            }}
          >
            <Chip
              label={`Frontend: ${frontendVersion}`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`Backend: ${backendVersion}`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Box>

        </Paper>
      </Container>
    </Box>
  )
}

export default LoginPage
