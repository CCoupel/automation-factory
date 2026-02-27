/**
 * WebSocket hook for real-time project presence tracking
 *
 * Provides:
 * - Connection management to project rooms
 * - Presence tracking with artifact focus
 * - Automatic reconnection
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ProjectConnectedUser {
  user_id: string
  username: string
  connected_at: string
  artifact_focus: string | null
}

interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

interface UseProjectWebSocketOptions {
  onPresenceChange?: (users: ProjectConnectedUser[]) => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

interface UseProjectWebSocketReturn {
  isConnected: boolean
  connectedUsers: ProjectConnectedUser[]
  sendArtifactFocus: (artifactId: string | null) => void
  connect: () => void
  disconnect: () => void
}

export function useProjectWebSocket(
  projectId: string | null,
  options: UseProjectWebSocketOptions = {}
): UseProjectWebSocketReturn {
  const {
    onPresenceChange,
    autoReconnect = true,
    reconnectInterval = 3000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<ProjectConnectedUser[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Store options in refs to avoid dependency issues
  const onPresenceChangeRef = useRef(onPresenceChange)
  const autoReconnectRef = useRef(autoReconnect)
  const reconnectIntervalRef = useRef(reconnectInterval)
  const projectIdRef = useRef(projectId)

  // Update refs when values change
  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange
    autoReconnectRef.current = autoReconnect
    reconnectIntervalRef.current = reconnectInterval
    projectIdRef.current = projectId
  })

  const getWebSocketUrl = useCallback(() => {
    const token = localStorage.getItem('authToken')
    const currentProjectId = projectIdRef.current
    if (!token || !currentProjectId) return null

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = window.location.host
    const basePath = (window as any).__BASE_PATH__ || window.location.pathname.replace(/\/[^/]*$/, '') || ''
    const wsBasePath = basePath.replace(/\/$/, '')

    return `${wsProtocol}//${wsHost}${wsBasePath}/ws/project/${currentProjectId}?token=${token}`
  }, [])

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)

      switch (message.type) {
        case 'presence': {
          const users = message.users as ProjectConnectedUser[]
          setConnectedUsers(users)
          onPresenceChangeRef.current?.(users)
          break
        }

        case 'user_joined':
          setConnectedUsers(prev => {
            const newUser: ProjectConnectedUser = {
              user_id: message.user_id as string,
              username: message.username as string,
              connected_at: message.timestamp as string,
              artifact_focus: null
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

        case 'artifact_focus_changed':
          setConnectedUsers(prev => {
            const updated = prev.map(u =>
              u.user_id === message.user_id
                ? { ...u, artifact_focus: message.artifact_id as string | null }
                : u
            )
            onPresenceChangeRef.current?.(updated)
            return updated
          })
          break

        case 'pong':
          break

        case 'connected':
          break

        case 'error':
          console.error('Project WebSocket error:', message.message)
          break

        default:
          console.warn('Unknown project WebSocket message type:', message.type)
      }
    } catch (error) {
      console.error('Failed to parse project WebSocket message:', error)
    }
  }, [])

  const connect = useCallback(() => {
    const url = getWebSocketUrl()
    if (!url) return

    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
        }
      }, 25000)
    }

    ws.onmessage = handleMessage

    ws.onclose = (event) => {
      setIsConnected(false)
      setConnectedUsers([])

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }

      if (autoReconnectRef.current && event.code !== 1000 && projectIdRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, reconnectIntervalRef.current)
      }
    }

    ws.onerror = (error) => {
      console.error('Project WebSocket error:', error)
    }
  }, [getWebSocketUrl, handleMessage])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }

    setIsConnected(false)
    setConnectedUsers([])
  }, [])

  const sendArtifactFocus = useCallback((artifactId: string | null) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'artifact_focus',
        artifact_id: artifactId
      }))
    }
  }, [])

  // Connect when project ID changes
  useEffect(() => {
    if (projectId) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    connectedUsers,
    sendArtifactFocus,
    connect,
    disconnect
  }
}

export default useProjectWebSocket
