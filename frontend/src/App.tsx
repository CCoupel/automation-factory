import { CssBaseline } from '@mui/material'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import AccountsManagementPage from './pages/AccountsManagementPage'
import LoginPage from './pages/LoginPage'
import PrivateRoute from './components/auth/PrivateRoute'

function App() {
  return (
    <>
      <CssBaseline />
      <Routes>
        {/* Login page - public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Main workspace - protected */}
        <Route path="/" element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        } />

        {/* Admin pages - protected */}
        <Route path="/admin/accounts" element={
          <PrivateRoute>
            <AccountsManagementPage />
          </PrivateRoute>
        } />

        {/* Redirect old configuration route to home (now a dialog) */}
        <Route path="/admin/configuration" element={<Navigate to="/" replace />} />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
