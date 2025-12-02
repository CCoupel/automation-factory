import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ZoomProvider } from './contexts/ZoomContext'
import { ThemeProvider } from './contexts/ThemeContext'
import PrivateRoute from './components/auth/PrivateRoute'
import LoginPage from './pages/LoginPage'
import App from './App.tsx'
import './index.css'
import './styles/responsive.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ZoomProvider>
          <AuthProvider>
            <Routes>
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
          </AuthProvider>
        </ZoomProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
