import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative paths so the app works at any base path without rewriting
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    strictPort: false, // Allow automatic port selection if 5173 is busy
    allowedHosts: 'all', // Allow connections from nginx proxy
    proxy: {
      '/api': {
        target: 'http://ansible-builder-backend:8000',
        changeOrigin: true,
      },
    },
  },
})
