import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getApiBaseUrl, getFrontendBaseUrl } from '../apiConfig'

describe('apiConfig', () => {
  const originalWindow = { ...window }

  beforeEach(() => {
    // Reset injected values
    ;(window as any).__API_URL__ = undefined
    ;(window as any).__BASE_PATH__ = undefined
  })

  afterEach(() => {
    ;(window as any).__API_URL__ = undefined
    ;(window as any).__BASE_PATH__ = undefined
  })

  describe('getApiBaseUrl', () => {
    it('uses injected API URL when available', () => {
      ;(window as any).__API_URL__ = 'https://api.example.com'
      expect(getApiBaseUrl()).toBe('https://api.example.com')
    })

    it('uses /api for nginx proxy (port 80)', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', port: '80' },
        writable: true,
      })
      expect(getApiBaseUrl()).toBe('/api')
    })

    it('uses direct backend for vite dev server', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost', port: '5173' },
        writable: true,
      })
      expect(getApiBaseUrl()).toBe('http://localhost:8000/api')
    })

    it('falls back to ./api for production', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com', port: '' },
        writable: true,
      })
      expect(getApiBaseUrl()).toBe('./api')
    })
  })

  describe('getFrontendBaseUrl', () => {
    it('uses injected base path when available', () => {
      ;(window as any).__BASE_PATH__ = '/automation-factory'
      expect(getFrontendBaseUrl()).toBe('/automation-factory')
    })

    it('falls back to current origin', () => {
      Object.defineProperty(window, 'location', {
        value: { hostname: 'example.com', port: '', origin: 'https://example.com', pathname: '/' },
        writable: true,
      })
      expect(getFrontendBaseUrl()).toBe('https://example.com')
    })
  })
})
