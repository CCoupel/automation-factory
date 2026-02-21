import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        // Zone components: deeply stateful drag-and-drop editor (WorkZone
        // alone is 5000+ lines). Requires integration tests with full DnD
        // simulation. Tracked for refactoring into testable units.
        'src/components/zones/**',
        // App shell: entry points and layout wiring that only run in a
        // full browser context (provider stack, router, resize observers).
        'src/main.tsx',
        'src/App.tsx',
        'src/components/layout/MainLayout.tsx',
        // WebSocket/SSE: real-time collaboration requires a running
        // backend WebSocket server; covered by E2E tests instead.
        'src/hooks/usePlaybookWebSocket.ts',
        'src/hooks/useCollaborationSync.ts',
        'src/contexts/CollaborationContext.tsx',
      ],
    },
  },
})
