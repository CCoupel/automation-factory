/**
 * Collaboration Context
 *
 * Provides real-time collaboration state for playbook editing.
 * Manages WebSocket connections, presence tracking, and update notifications.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { usePlaybookWebSocket, ConnectedUser, PlaybookUpdate } from '../hooks/usePlaybookWebSocket'
import { useAuth } from './AuthContext'

interface CollaborationContextType {
  // Connection state
  isConnected: boolean
  connectedUsers: ConnectedUser[]
  currentPlaybookId: string | null

  // Actions
  connectToPlaybook: (playbookId: string) => void
  disconnectFromPlaybook: () => void
  sendUpdate: (updateType: string, data: Record<string, unknown>) => void

  // Update notifications
  lastUpdate: PlaybookUpdate | null
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
  onPlaybookUpdate?: (update: PlaybookUpdate) => void
}

export const CollaborationProvider: React.FC<CollaborationProviderProps> = ({
  children,
  onPlaybookUpdate
}) => {
  const { user } = useAuth()
  const [currentPlaybookId, setCurrentPlaybookId] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<PlaybookUpdate | null>(null)
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null)
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Handle incoming updates
  const handleUpdate = useCallback((update: PlaybookUpdate) => {
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
    onPlaybookUpdate?.(update)
  }, [onPlaybookUpdate])

  // Handle presence changes
  const handlePresenceChange = useCallback((users: ConnectedUser[]) => {
    console.log('Presence changed:', users.length, 'users connected')
  }, [])

  // WebSocket hook
  const {
    isConnected,
    connectedUsers,
    sendUpdate,
    connect,
    disconnect
  } = usePlaybookWebSocket(currentPlaybookId, {
    onUpdate: handleUpdate,
    onPresenceChange: handlePresenceChange,
    autoReconnect: true
  })

  // Store disconnect in ref to avoid dependency issues
  const disconnectRef = useRef(disconnect)
  useEffect(() => {
    disconnectRef.current = disconnect
  })

  // Connect to a playbook room - stable callback
  const connectToPlaybook = useCallback((playbookId: string) => {
    console.log('[Collab] connectToPlaybook called with:', playbookId)
    setCurrentPlaybookId(prev => {
      console.log('[Collab] setCurrentPlaybookId - prev:', prev, 'new:', playbookId)
      if (playbookId !== prev) {
        return playbookId
      }
      return prev
    })
  }, [])

  // Disconnect from current playbook - stable callback
  const disconnectFromPlaybook = useCallback(() => {
    disconnectRef.current()
    setCurrentPlaybookId(null)
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

  const value: CollaborationContextType = {
    isConnected,
    connectedUsers,
    currentPlaybookId,
    connectToPlaybook,
    disconnectFromPlaybook,
    sendUpdate,
    lastUpdate,
    highlightedElement,
    clearHighlight
  }

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  )
}

export default CollaborationContext
