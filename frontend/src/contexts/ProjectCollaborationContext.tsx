/**
 * Project Collaboration Context
 *
 * Provides real-time project presence tracking.
 * Manages WebSocket connections and artifact focus.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useProjectWebSocket, ProjectConnectedUser } from '../hooks/useProjectWebSocket'
import { useAuth } from './AuthContext'

interface ProjectCollaborationContextType {
  isConnected: boolean
  connectedUsers: ProjectConnectedUser[]
  connectToProject: (projectId: string) => void
  disconnectFromProject: () => void
  sendArtifactFocus: (artifactId: string | null) => void
  getUsersOnArtifact: (artifactId: string) => ProjectConnectedUser[]
}

const ProjectCollaborationContext = createContext<ProjectCollaborationContextType | null>(null)

export const useProjectCollaboration = () => {
  const context = useContext(ProjectCollaborationContext)
  if (!context) {
    throw new Error('useProjectCollaboration must be used within a ProjectCollaborationProvider')
  }
  return context
}

interface ProjectCollaborationProviderProps {
  children: React.ReactNode
}

export const ProjectCollaborationProvider: React.FC<ProjectCollaborationProviderProps> = ({
  children
}) => {
  const { user } = useAuth()
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)

  const {
    isConnected,
    connectedUsers,
    sendArtifactFocus,
    disconnect
  } = useProjectWebSocket(currentProjectId, {
    autoReconnect: true
  })

  const disconnectRef = useRef(disconnect)
  useEffect(() => {
    disconnectRef.current = disconnect
  })

  const connectToProject = useCallback((projectId: string) => {
    setCurrentProjectId(prev => {
      if (projectId !== prev) {
        return projectId
      }
      return prev
    })
  }, [])

  const disconnectFromProject = useCallback(() => {
    disconnectRef.current()
    setCurrentProjectId(null)
  }, [])

  const getUsersOnArtifact = useCallback((artifactId: string): ProjectConnectedUser[] => {
    return connectedUsers.filter(
      u => u.artifact_focus === artifactId && u.user_id !== user?.id
    )
  }, [connectedUsers, user?.id])

  const value: ProjectCollaborationContextType = useMemo(() => ({
    isConnected,
    connectedUsers,
    connectToProject,
    disconnectFromProject,
    sendArtifactFocus,
    getUsersOnArtifact
  }), [isConnected, connectedUsers, connectToProject, disconnectFromProject, sendArtifactFocus, getUsersOnArtifact])

  return (
    <ProjectCollaborationContext.Provider value={value}>
      {children}
    </ProjectCollaborationContext.Provider>
  )
}

export default ProjectCollaborationContext
