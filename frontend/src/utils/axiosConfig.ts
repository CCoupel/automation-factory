/**
 * Global Axios Configuration
 * Sets up axios with proper base URL and interceptors
 */

import axios from 'axios'
import { getApiBaseUrl } from './apiConfig'

// Configure axios defaults
const configureAxios = () => {
  const baseURL = getApiBaseUrl()
  console.log('🔧 AXIOS CONFIG: Configuring axios with baseURL:', baseURL)
  console.log('🔧 AXIOS CONFIG: window.__API_URL__ =', (window as any).__API_URL__)
  console.log('🔧 AXIOS CONFIG: window.__BASE_PATH__ =', (window as any).__BASE_PATH__)
  
  // Don't set baseURL to avoid double path issue
  // The nginx proxy will handle the routing
  // axios.defaults.baseURL = baseURL
  
  // Add request interceptor for debugging
  axios.interceptors.request.use(
    (config) => {
      console.log('🚀 AXIOS REQUEST:', {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        fullUrl: config.baseURL ? `${config.baseURL}${config.url}` : config.url
      })
      return config
    },
    (error) => {
      console.error('Axios request error:', error)
      return Promise.reject(error)
    }
  )

  // Add response interceptor for debugging
  axios.interceptors.response.use(
    (response) => {
      console.log('✅ AXIOS RESPONSE:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      })
      return response
    },
    (error) => {
      console.error('❌ AXIOS ERROR:', {
        message: error.message,
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data
      })
      return Promise.reject(error)
    }
  )
}

export { configureAxios }