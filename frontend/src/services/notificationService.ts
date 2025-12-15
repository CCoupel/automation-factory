/**
 * Notification Service - Frontend SSE client
 * Listens to backend cache update notifications via Server-Sent Events
 */

import { getApiBaseUrl } from '../utils/apiConfig'

interface CacheNotification {
  type: string
  message: string
  data?: any
  timestamp: string
  connection_id?: number
}

type NotificationCallback = (notification: CacheNotification) => void

class NotificationService {
  private eventSource: EventSource | null = null
  private callbacks: Set<NotificationCallback> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000 // 1 second, exponentially increased
  private isConnected = false

  /**
   * Start listening to cache notifications
   */
  connect(): void {
    if (this.eventSource) {
      console.log('📡 SSE already connected')
      return
    }

    console.log('📡 Connecting to Ansible cache notifications...')

    try {
      const baseUrl = getApiBaseUrl()
      // Updated: Use new Ansible API endpoint instead of legacy Galaxy endpoint
      const sseUrl = `${baseUrl}/ansible/cache/notifications`
      console.log('📡 Connecting to SSE:', sseUrl)
      
      this.eventSource = new EventSource(sseUrl)
      
      this.eventSource.onopen = () => {
        console.log('✅ SSE connected to cache notifications')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.reconnectDelay = 1000
      }
      
      this.eventSource.onmessage = (event) => {
        try {
          const notification: CacheNotification = JSON.parse(event.data)
          this.handleNotification(notification)
        } catch (error) {
          console.error('Failed to parse SSE notification:', error)
        }
      }
      
      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error)
        this.isConnected = false
        
        // Attempt to reconnect
        this.scheduleReconnect()
      }
      
    } catch (error) {
      console.error('Failed to create SSE connection:', error)
      this.scheduleReconnect()
    }
  }
  
  /**
   * Stop listening to notifications
   */
  disconnect(): void {
    if (this.eventSource) {
      console.log('❌ Disconnecting from cache notifications')
      this.eventSource.close()
      this.eventSource = null
      this.isConnected = false
    }
  }
  
  /**
   * Subscribe to notifications
   */
  subscribe(callback: NotificationCallback): () => void {
    this.callbacks.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback)
    }
  }
  
  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    }
  }
  
  private handleNotification(notification: CacheNotification): void {
    // Don't log ping keepalives to reduce console noise
    if (notification.type !== 'ping') {
      console.log('📨 Received cache notification:', notification.type, notification.message || '')
    }
    
    // Call all registered callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(notification)
      } catch (error) {
        console.error('Error in notification callback:', error)
      }
    })
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max SSE reconnection attempts reached')
      return
    }
    
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`🔄 Attempting SSE reconnection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.disconnect() // Clean up current connection
        this.connect() // Try to reconnect
      }
    }, delay)
  }
}

// Singleton instance
export const notificationService = new NotificationService()

// Export types
export type { CacheNotification, NotificationCallback }