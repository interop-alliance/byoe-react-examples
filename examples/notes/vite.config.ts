/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  // Must match APP_ORIGIN in src/app.config.ts: the app-key credential is
  // origin-bound, so the dev server has to serve from this exact port.
  server: {
    port: 5173,
    strictPort: true
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': srcDir
    }
  },
  test: {
    include: ['test/node/**/*.test.ts', 'src/**/*.test.ts']
  }
})
