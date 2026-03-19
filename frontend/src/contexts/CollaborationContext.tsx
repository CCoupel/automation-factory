/**
 * Collaboration Context
 *
 * Provides real-time collaboration state for project editing.
 * Manages WebSocket connections, presence tracking, and update notifications.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useProjectWebSocket, ConnectedUser, ProjectUpdate } from '../hooks/useProjectWebSocket'
import { useAuth } from './AuthContext'

interface CollaborationContextType {
  // Connection state
  isConnected: boolean
  connectedUsers: ConnectedUser[]
  currentProjectId: string | null

  // Actions
  connectToProject: (projectId: string) => void
  disconnectFromProject: () => void
  sendUpdate: (updateType: string, data: Record<string, unknown>) => void
  sendSetArtifact: (artifactId: string) => void

  // Update notifications
  lastUpdate: ProjectUpdate | null
  highlightedElement: string | null
  clearHighlight: () => void
}

const CollaborationContext = createContext<CollaborationContextType | null>(null)

export const useCollaboration = () => {
  const context = useContext(CollaborationContext)
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider')
  }
  return context
}

interface CollaborationProviderProps {
  children: React.ReactNode
  onProjectUpdate?: (update: ProjectUpdate) => void
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({
  children,
  onProjectUpdate
}) => {
  const { user } = useAuth()
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<ProjectUpdate | null>(null)
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null)
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle incoming updates
  const handleUpdate = useCallback((update: ProjectUpdate) => {
    setLastUpdate(update)

    // Set highlight for 2 seconds
    if (update.data?.element_id) {
      setHighlightedElement(update.data.element_id as string)

      // Clear previous timeout
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }

      // Clear highlight after 2 seconds
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedElement(null)
      }, 2000)
    }

    // Call external handler if provided
    onProjectUpdate?.(update)
  }, [onProjectUpdate])

  // Handle presence changes
  const handlePresenceChange = useCallback((users: ConnectedUser[]) => {
    console.log('Presence changed:', users.length, 'users connected')
  }, [])

  // WebSocket hook
  const {
    isConnected,
    connectedUsers,
    sendUpdate,
    sendSetArtifact,
    connect,
    disconnect
  } = useProjectWebSocket(currentProjectId, {
    onUpdate: handleUpdate,
    onPresenceChange: handlePresenceChange,
    autoReconnect: true
  })

  // Store disconnect in ref to avoid dependency issues
  const disconnectRef = useRef(disconnect)
  useEffect(() => {
    disconnectRef.current = disconnect
  })

  // Connect to a project room - stable callback
  const connectToProject = useCallback((projectId: string) => {
    console.log('[Collab] connectToProject called with:', projectId)
    setCurrentProjectId(prev => {
      console.log('[Collab] setCurrentProjectId - prev:', prev, 'new:', projectId)
      if (projectId !== prev) {
        return projectId
      }
      return prev
    })
  }, [])

  // Disconnect from current project - stable callback
  const disconnectFromProject = useCallback(() => {
    disconnectRef.current()
    setCurrentProjectId(null)
    setLastUpdate(null)
    setHighlightedElement(null)
  }, [])

  // Clear highlight manually
  const clearHighlight = useCallback(() => {
    setHighlightedElement(null)
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  const value = useMemo<CollaborationContextType>(() => ({
    isConnected,
    connectedUsers,
    currentProjectId,
    connectToProject,
    disconnectFromProject,
    sendUpdate,
    sendSetArtifact,
    lastUpdate,
    highlightedElement,
    clearHighlight
  }), [
    isConnected,
    connectedUsers,
    currentProjectId,
    connectToProject,
    disconnectFromProject,
    sendUpdate,
    sendSetArtifact,
    lastUpdate,
    highlightedElement,
    clearHighlight
  ])

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  )
}

export default CollaborationContext
