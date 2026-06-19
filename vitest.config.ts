import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./app/src/__tests__/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      // Allow tests to import from app/src without relative path hell
    },
  },
})
