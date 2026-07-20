/**
 * Application configuration: environment-variable exports, the collection
 * registry, and the one `WasAppConfig` the library consumes.
 *
 * When renaming this template into a real app, this file is the first stop:
 * app name, credential type/vocab, and the collection list all live here.
 */
import type { WasAppConfig, WasCollectionConfig } from '@interop/was-react'

// Vite injects `import.meta.env` in the browser build; a plain Node context
// (the dev provisioning script, or a bare `tsx` import) has no such object, so
// fall back to an empty record rather than throwing on property access.
const env: Record<string, string | undefined> =
  (import.meta.env as Record<string, string | undefined> | undefined) ?? {}

// This app's own origin: the CHAPI anti-phishing origin binding on the app-key
// credential. Must match the URL the app is actually served from.
export const APP_ORIGIN = env.VITE_APP_ORIGIN || 'http://localhost:5173'

// Auth mode: 'wallet' (default) gates the app behind Login With Wallet
// (CHAPI); 'dev' boots straight into the local anonymous replica with no login
// gate (local-first, optionally dev-connecting under VITE_WAS_DEV_SYNC). It
// maps onto the library's `onboarding` mode below.
export const AUTH_MODE: 'dev' | 'wallet' =
  env.VITE_AUTH_MODE === 'dev' ? 'dev' : 'wallet'

// Dev-sync mode (CHAPI bypassed; dev auth mode only): when truthy, the app
// loads a locally provisioned grants file and replicates to a running
// was-teaching-server using the dev seed's delegated zcaps. Off by default.
export const WAS_DEV_SYNC =
  env.VITE_WAS_DEV_SYNC === 'true' || env.VITE_WAS_DEV_SYNC === '1'

// URL the app fetches the dev grants JSON from (a git-ignored file written
// into `public/` by `pnpm run provision:dev`; Vite serves `public/` at root).
export const WAS_DEV_GRANTS_URL =
  env.VITE_WAS_DEV_GRANTS_URL || '/dev-grants.local.json'

// Replication tuning (optional). Undefined leaves the library defaults.
export const WAS_SYNC_RETRY_MS: number | undefined = env.VITE_WAS_SYNC_RETRY_MS
  ? Number(env.VITE_WAS_SYNC_RETRY_MS)
  : undefined
export const WAS_SYNC_POLL_MS: number | undefined = env.VITE_WAS_SYNC_POLL_MS
  ? Number(env.VITE_WAS_SYNC_POLL_MS)
  : undefined

/**
 * The storage collections: each logical `key` (the app-side / RxDB collection
 * handle) mapped to its WAS collection `id` (a deliberately unprefixed,
 * generic name shared across interoperable apps). This template has one.
 */
export const COLLECTIONS: WasCollectionConfig[] = [
  { key: 'notes', id: 'notes' }
]

/** The app-wide was-react configuration. */
export const appConfig: WasAppConfig = {
  appName: 'BYOE Notes',
  appOrigin: APP_ORIGIN,
  // Wallet mode gates the app behind login; dev mode is local-first (a usable
  // anonymous replica with no login gate). Only affects the router's rendering,
  // never the store's transitions.
  onboarding: AUTH_MODE === 'wallet' ? 'login-gated' : 'local-first',
  collections: COLLECTIONS,
  credential: {
    credentialType: 'ByoeNotesAppKey',
    vocabBase: 'urn:byoe-notes:vocab#'
  },
  sync: {
    ...(WAS_SYNC_RETRY_MS !== undefined && { retryMs: WAS_SYNC_RETRY_MS }),
    ...(WAS_SYNC_POLL_MS !== undefined && { pollMs: WAS_SYNC_POLL_MS })
  }
}
