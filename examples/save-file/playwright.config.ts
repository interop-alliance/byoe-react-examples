/**
 * Offline Playwright config: serves the game with Vite and exercises it
 * against the encrypted local replica only (a tier-1 app is fully functional
 * with no wallet and no WAS server). Suited to CI.
 *
 * Run: pnpm run test:browser
 */
import { defineConfig, devices } from '@playwright/test'

const APP_PORT = 5174

export default defineConfig({
  testDir: './test/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: `pnpm exec vite --port ${APP_PORT} --strictPort`,
    url: `http://localhost:${APP_PORT}/`,
    reuseExistingServer: !process.env.CI
  }
})
