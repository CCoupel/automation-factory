/**
 * WebSocket hook for real-time playbook collaboration
 *
 * Provides:
 * - Connection management to playbook rooms
 * - Real-time update notifications
 * - Presence tracking (connected users)
 * - Automatic reconnection
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ConnectedUser {
  user_id: string
  username: string
  connected_at: string
}

export interface PlaybookUpdate {
  type: 'update'
  update_type: string
  user_id: string
  username: string
  data: Record<string, unknown>
  timestamp: string
}

interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

interface UsePlaybookWebSocketOptions {
  onUpdate?: (update: PlaybookUpdate) => void
  onPresenceChange?: (users: ConnectedUser[]) => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

interface UsePlaybookWebSocketReturn {
  isConnected: boolean
  connectedUsers: ConnectedUser[]
  sendUpdate: (updateType: string, data: Record<string, unknown>) => void
  connect: () => void
  disconnect: () => void
}

export function usePlaybookWebSocket(
  playbookId: string | null,
  options: UsePlaybookWebSocketOptions = {}
): UsePlaybookWebSocketReturn {
  const {
    onUpdate,
    onPresenceChange,
    autoReconnect = true,
    reconnectInterval = 3000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Store options in refs to avoid dependency issues
  const onUpdateRef = useRef(onUpdate)
  const onPresenceChangeRef = useRef(onPresenceChange)
  const autoReconnectRef = useRef(autoReconnect)
  const reconnectIntervalRef = useRef(reconnectInterval)
  const playbookIdRef = useRef(playbookId)

  // Update refs when values change
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onPresenceChangeRef.current = onPresenceChange
    autoReconnectRef.current = autoReconnect
    reconnectIntervalRef.current = reconnectInterval
    playbookIdRef.current = playbookId
  })

  // Get WebSocket URL from environment or derive from window location
  const getWebSocketUrl = useCallback(() => {
    const token = localStorage.getItem('authToken')
    const currentPlaybookId = playbookIdRef.current
    console.log('[WS] getWebSocketUrl - token:', token ? 'exists' : 'MISSING', 'playbookId:', currentPlaybookId)
    if (!token || !currentPlaybookId) return null

    // Use environment variable if available, otherwise derive from location
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = window.location.host
    // Get base path from runtime injection or derive from pathname
    const basePath = (window as any).__BASE_PATH__ || window.location.pathname.replace(/\/[^/]*$/, '') || ''
    const wsBasePath = basePath.replace(/\/$/, '')


    const url = `${wsProtocol}//${wsHost}${wsBasePath}/ws/playbook/${currentPlaybookId}?token=${token.substring(0, 20)}...`
    console.log('[WS] WebSocket URL:', url)
    return `${wsProtocol}//${wsHost}${wsBasePath}/ws/playbook/${currentPlaybookId}?token=${token}`
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

        case 'update':
          onUpdateRef.current?.(message as unknown as PlaybookUpdate)
          break

        case 'pong':
          // Keep-alive response, no action needed
          break

        case 'connected':
          // Initial connection confirmation with role info
          console.log('[WS] Connected to playbook with role:', message.role)
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
      console.warn('Cannot connect: missing token or playbook ID')
      return
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close()
    }

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected to playbook:', playbookIdRef.current)
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

      // Auto reconnect if enabled and not a clean close
      if (autoReconnectRef.current && event.code !== 1000 && playbookIdRef.current) {
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

  // Connect when playbook ID changes
  useEffect(() => {
    console.log('[WS] useEffect triggered - playbookId:', playbookId)
    if (playbookId) {
      console.log('[WS] Calling connect() for playbook:', playbookId)
      connect()
    } else {
      console.log('[WS] No playbookId, calling disconnect()')
      disconnect()
    }

    return () => {
      console.log('[WS] Cleanup - calling disconnect()')
      disconnect()
    }
  }, [playbookId]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    connectedUsers,
    sendUpdate,
    connect,
    disconnect
  }
}

export default usePlaybookWebSocket
