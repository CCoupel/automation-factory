import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ZoomProvider } from './contexts/ZoomContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { AnsibleVersionProvider } from './contexts/AnsibleVersionContext'
import { GalaxyProvider } from './contexts/GalaxyContext'
import { GalaxyCacheProvider } from './contexts/GalaxyCacheContext'
import PrivateRoute from './components/auth/PrivateRoute'
import LoginPage from './pages/LoginPage'
import App from './App.tsx'
import VersionEndpoint from './components/VersionEndpoint'
import { logApiConfig } from './utils/apiConfig'
import './index.css'
import './styles/responsive.css'

// Get base path from window config (injected by docker-entrypoint.sh)
const basePath = (window as any).__BASE_PATH__ || ''

// Log API configuration for debugging
logApiConfig()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basePath}>
      <ThemeProvider>
        <ZoomProvider>
          <AuthProvider>
            <AnsibleVersionProvider>
              <GalaxyProvider>
                <GalaxyCacheProvider>
                  <Routes>
                  {/* Public route - Version endpoint */}
                  <Route path="/version" element={<VersionEndpoint />} />

                  {/* Public route - Login page */}
                  <Route path="/login" element={<LoginPage />} />

                  {/* Private route - Main application (protected) */}
                  <Route
                    path="/*"
                    element={
                      <PrivateRoute>
                        <App />
                      </PrivateRoute>
                    }
                  />

                  {/* Redirect any unknown routes to root */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </GalaxyCacheProvider>
              </GalaxyProvider>
            </AnsibleVersionProvider>
          </AuthProvider>
        </ZoomProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
