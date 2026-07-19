/**
 * WAS-backed Playwright config: real replication against a local
 * was-teaching-server booted from the npm package (see
 * test/lib/startWasServer.ts), with dev grants provisioned in globalSetup. The app runs
 * in dev auth mode with dev-sync on, on a dedicated port so it never clashes
 * with the offline suite's dev server. Tests are serialized (a single shared
 * Space).
 *
 * Run: pnpm run test:browser:was
 */
import { defineConfig, devices } from '@playwright/test'

const APP_PORT = 5175
export const WAS_PORT = Number(process.env.WAS_E2E_PORT ?? 3102)
export const WAS_URL = `http://localhost:${WAS_PORT}`

export default defineConfig({
  testDir: './test/browser-was',
  testMatch: /.*\.spec\.ts/,
  // One shared WAS Space across tests; serialize to keep assertions clean.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { outputFolder: 'playwright-report-was' }]],
  outputDir: 'test-results-was',
  timeout: 60_000,
  globalSetup: './test/browser-was/globalSetup.ts',
  globalTeardown: './test/browser-was/globalTeardown.ts',
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
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_AUTH_MODE: 'dev',
      VITE_WAS_DEV_SYNC: 'true',
      // Must EXACTLY equal the server's SERVER_URL (zcap invocation targets).
      VITE_WAS_SERVER_URL: WAS_URL,
      // Snappier backoff + change-feed polling so multi-device convergence
      // and offline/online recovery land within the test timeouts.
      VITE_WAS_SYNC_RETRY_MS: '1500',
      VITE_WAS_SYNC_POLL_MS: '1500'
    }
  }
})
