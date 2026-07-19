/**
 * Wallet-login (Login With Wallet) Playwright config. Boots three servers,
 * none of which need a pre-existing checkout: a local was-teaching-server
 * (from the npm package, via test/lib/startWasServer.ts), the freewallet dev
 * server (cloned into the git-ignored .e2e/ on first run, or a local checkout
 * via FREEWALLET_DIR -- see test/lib/startWallet.ts), and this app in wallet
 * auth mode. CHAPI is driven through the library's non-production e2e bridge
 * (no mediator). Ports are distinct from every other suite so configs can
 * never clash.
 *
 * Run: pnpm run test:browser:wallet
 */
import { defineConfig, devices } from '@playwright/test'

const APP_PORT = 5177
const WALLET_PORT = 5277
const WAS_PORT = 3103
export const APP_URL = `http://localhost:${APP_PORT}`
export const WALLET_URL = `http://localhost:${WALLET_PORT}`
export const WAS_URL = `http://localhost:${WAS_PORT}`

export default defineConfig({
  testDir: './test/browser-wallet',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['html', { outputFolder: 'playwright-report-wallet' }]],
  outputDir: 'test-results-wallet',
  timeout: 360_000,
  use: {
    baseURL: APP_URL,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      // Local WAS teaching server; SERVER_URL must exactly match the URL both
      // the wallet and this app sign zcap requests against. State lands in
      // the git-ignored .e2e/was-data-wallet, wiped on boot.
      command: 'pnpm exec tsx test/lib/startWasServer.ts',
      url: WAS_URL,
      reuseExistingServer: !process.env.CI,
      env: {
        PORT: String(WAS_PORT),
        SERVER_URL: WAS_URL,
        DATA_DIR: '.e2e/was-data-wallet'
      },
      timeout: 60_000
    },
    {
      // freewallet dev server pointed at the local WAS server (its KMS rides
      // on the WAS server's in-process /kms facet). The generous timeout
      // covers the first-run clone + install.
      command: 'pnpm exec tsx test/lib/startWallet.ts',
      url: WALLET_URL,
      reuseExistingServer: false,
      env: {
        WALLET_PORT: String(WALLET_PORT),
        VITE_WAS_SERVER_URL: WAS_URL
      },
      timeout: 300_000
    },
    {
      // This app in wallet auth mode.
      command: `pnpm exec vite --port ${APP_PORT} --strictPort`,
      url: `${APP_URL}/`,
      reuseExistingServer: false,
      env: {
        VITE_AUTH_MODE: 'wallet',
        VITE_APP_ORIGIN: APP_URL,
        VITE_WAS_SERVER_URL: WAS_URL,
        VITE_WAS_SYNC_RETRY_MS: '1500',
        VITE_WAS_SYNC_POLL_MS: '1500'
      },
      timeout: 60_000
    }
  ]
})
