/**
 * WebSocket hook for real-time project collaboration
 *
 * Provides:
 * - Connection management to project rooms
 * - Real-time update notifications
 * - Presence tracking (connected users)
 * - Automatic reconnection
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ConnectedUser {
  user_id: string
  username: string
  connected_at: string
  current_artifact_id?: string
}

export interface ProjectUpdate {
  type: 'update'
  update_type: string
  user_id: string
  username: string
  data: Record<string, unknown>
  timestamp: string
  artifact_id?: string
}

// Backward compatibility alias
export type PlaybookUpdate = ProjectUpdate

interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

export interface EventAck {
  type: 'event_ack'
  sequence_number?: number
}

interface UseProjectWebSocketOptions {
  onUpdate?: (update: ProjectUpdate) => void
  onPresenceChange?: (users: ConnectedUser[]) => void
  onEventAck?: (ack: EventAck) => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

interface UseProjectWebSocketReturn {
  isConnected: boolean
  connectedUsers: ConnectedUser[]
  lastSequenceNumber: number | null
  sendUpdate: (updateType: string, data: Record<string, unknown>) => void
  sendSetArtifact: (artifactId: string) => void
  connect: () => void
  disconnect: () => void
}

export function useProjectWebSocket(
  projectId: string | null,
  options: UseProjectWebSocketOptions = {}
): UseProjectWebSocketReturn {
  const {
    onUpdate,
    onPresenceChange,
    onEventAck,
    autoReconnect = true,
    reconnectInterval = 3000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [lastSequenceNumber, setLastSequenceNumber] = useState<number | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Store options in refs to avoid dependency issues
  const onUpdateRef = useRef(onUpdate)
  const onPresenceChangeRef = useRef(onPresenceChange)
  const onEventAckRef = useRef(onEventAck)
  const autoReconnectRef = useRef(autoReconnect)
  const reconnectIntervalRef = useRef(reconnectInterval)
  const projectIdRef = useRef(projectId)

  // Update refs when values change
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onPresenceChangeRef.current = onPresenceChange
    onEventAckRef.current = onEventAck
    autoReconnectRef.current = autoReconnect
    reconnectIntervalRef.current = reconnectInterval
    projectIdRef.current = projectId
  })

  // Get WebSocket URL from environment or derive from window location
  const getWebSocketUrl = useCallback(() => {
    const token = localStorage.getItem('authToken')
    const currentProjectId = projectIdRef.current
    console.log('[WS] getWebSocketUrl - token:', token ? 'exists' : 'MISSING', 'projectId:', currentProjectId)
    if (!token || !currentProjectId) return null

    // Use environment variable if available, otherwise derive from location
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = window.location.host
    // Use runtime injection only — do NOT derive from pathname (would pick up route segments)
    const wsBasePath = ((window as any).__BASE_PATH__ || '').replace(/\/$/, '')


    const url = `${wsProtocol}//${wsHost}${wsBasePath}/ws/project/${currentProjectId}?token=${token.substring(0, 20)}...`
    console.log('[WS] WebSocket URL:', url)
    return `${wsProtocol}//${wsHost}${wsBasePath}/ws/project/${currentProjectId}?token=${token}`
  }, [])

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)

      switch (message.type) {
        case 'presence':
          const users = message.users as ConnectedUser[]
          setConnectedUsers(users)
          onPresenceChangeRef.current?.(users)
          break

        case 'user_joined':
          setConnectedUsers(prev => {
            const newUser: ConnectedUser = {
              user_id: message.user_id as string,
              username: message.username as string,
              connected_at: message.timestamp as string
            }
            const updated = [...prev, newUser]
            onPresenceChangeRef.current?.(updated)
            return updated
          })
          break

        case 'user_left':
          setConnectedUsers(prev => {
            const updated = prev.filter(u => u.user_id !== message.user_id)
            onPresenceChangeRef.current?.(updated)
            return updated
          })
          break

        case 'artifact_update':
          // A user changed their current artifact
          setConnectedUsers(prev => {
            const updated = prev.map(u =>
              u.user_id === message.user_id
                ? { ...u, current_artifact_id: (message.artifact_id as string) || undefined }
                : u
            )
            onPresenceChangeRef.current?.(updated)
            return updated
          })
          break

        case 'update':
          onUpdateRef.current?.(message as unknown as ProjectUpdate)
          break

        case 'event_ack': {
          const ack: EventAck = {
            type: 'event_ack',
            sequence_number: message.sequence_number as number | undefined
          }
          if (ack.sequence_number != null) {
            setLastSequenceNumber(ack.sequence_number)
          }
          onEventAckRef.current?.(ack)
          break
        }

        case 'pong':
          // Keep-alive response, no action needed
          break

        case 'connected':
          // Initial connection confirmation with role info
          console.log('[WS] Connected to project with role:', message.role)
          break

        case 'error':
          console.error('WebSocket error:', message.message)
          break

        default:
          console.warn('Unknown WebSocket message type:', message.type)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }, [])

  const connect = useCallback(() => {
    const url = getWebSocketUrl()
    if (!url) {
      console.warn('Cannot connect: missing token or project ID')
      return
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected to project:', projectIdRef.current)
      setIsConnected(true)

      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
        }
      }, 25000) // Send ping every 25 seconds
    }

    ws.onmessage = handleMessage

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      setIsConnected(false)
      setConnectedUsers([])

      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }

      // Auto reconnect if enabled and not a clean close or auth/access error
      const noReconnectCodes = [1000, 4001, 4003]
      if (autoReconnectRef.current && !noReconnectCodes.includes(event.code) && projectIdRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...')
          connect()
        }, reconnectIntervalRef.current)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }, [getWebSocketUrl, handleMessage])

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }

    setIsConnected(false)
    setConnectedUsers([])
    setLastSequenceNumber(null)
  }, [])

  const sendSetArtifact = useCallback((artifactId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = { type: 'set_artifact', artifact_id: artifactId }
      console.log('[WS] Sending set_artifact:', artifactId || '(clear)')
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  const sendUpdate = useCallback((updateType: string, data: Record<string, unknown>) => {
    console.log('[WS] sendUpdate called:', updateType, 'wsRef:', wsRef.current ? 'exists' : 'null', 'readyState:', wsRef.current?.readyState)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'update',
        update_type: updateType,
        data
      }
      console.log('[WS] Sending message:', JSON.stringify(message).substring(0, 200))
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('[WS] WebSocket not connected, cannot send update. readyState:', wsRef.current?.readyState)
    }
  }, [])

  // Connect when project ID changes
  useEffect(() => {
    console.log('[WS] useEffect triggered - projectId:', projectId)
    if (projectId) {
      console.log('[WS] Calling connect() for project:', projectId)
      connect()
    } else {
      console.log('[WS] No projectId, calling disconnect()')
      disconnect()
    }

    return () => {
      console.log('[WS] Cleanup - calling disconnect()')
      disconnect()
    }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    connectedUsers,
    lastSequenceNumber,
    sendUpdate,
    sendSetArtifact,
    connect,
    disconnect
  }
}

// Backward compatibility alias
export const usePlaybookWebSocket = useProjectWebSocket

export default useProjectWebSocket
