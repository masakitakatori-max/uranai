import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api/shichusuimei': 'http://127.0.0.1:8788' } },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['node_modules/**', 'dist/**', 'site-build/**', 'e2e/**'],
  },
})
