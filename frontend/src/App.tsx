import { CssBaseline } from '@mui/material'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import ProjectLayout from './components/layout/ProjectLayout'
import AccountsManagementPage from './pages/AccountsManagementPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import PrivateRoute from './components/auth/PrivateRoute'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  return (
    <>
      <CssBaseline />
      <ErrorBoundary>
      <Routes>
        {/* Login page - public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Home page - protected */}
        <Route path="/" element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        } />

        {/* Project workbench - protected */}
        <Route path="/projects/:projectId" element={
          <PrivateRoute>
            <ProjectLayout />
          </PrivateRoute>
        } />

        {/* Standalone playbook editor - protected */}
        <Route path="/playbooks/:playbookId" element={
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
      </ErrorBoundary>
    </>
  )
}

export default App
