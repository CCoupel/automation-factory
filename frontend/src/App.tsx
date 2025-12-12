import { CssBaseline } from '@mui/material'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import AccountsManagementPage from './pages/AccountsManagementPage'
import ConfigurationPage from './pages/ConfigurationPage'

function App() {
  return (
    <>
      <CssBaseline />
      <Routes>
        {/* Main workspace */}
        <Route path="/" element={<MainLayout />} />

        {/* Admin pages */}
        <Route path="/admin/accounts" element={<AccountsManagementPage />} />
        <Route path="/admin/configuration" element={<ConfigurationPage />} />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
