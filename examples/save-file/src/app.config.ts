/**
 * The whole was-react wiring of a tier-1 app: `defineDocumentApp` takes the
 * app identity plus the one sandbox document (its WAS collection id and its
 * initial value) and returns the config + registry for `WasSessionProvider`
 * and the typed `useDocument` hook the components consume. No entity stores,
 * grants, or sync internals appear anywhere in this app.
 */
import { defineDocumentApp } from '@interop/was-react'

// Vite injects `import.meta.env` in the browser build; fall back to an empty
// record in a plain Node context rather than throwing on property access.
const env: Record<string, string | undefined> =
  (import.meta.env as Record<string, string | undefined> | undefined) ?? {}

// This app's own origin: the CHAPI anti-phishing origin binding on the app-key
// credential. Must match the URL the app is actually served from.
export const APP_ORIGIN = env.VITE_APP_ORIGIN || 'http://localhost:5174'

// Remote WAS server URL: the expected host of every granted zcap's
// invocationTarget once the user connects a wallet.
export const WAS_SERVER_URL = env.VITE_WAS_SERVER_URL || 'http://localhost:3002'

/** The one document this app is about: a game save file. */
export interface SaveFile {
  minerals: number
  drillLevel: number
}

export const { config, registry, useDocument } = defineDocumentApp<SaveFile>({
  appName: 'Space Miner',
  appOrigin: APP_ORIGIN,
  wasServerUrl: WAS_SERVER_URL,
  document: {
    collectionId: 'space-miner-save',
    initial: { minerals: 0, drillLevel: 1 }
  },
  credential: {
    credentialType: 'SpaceMinerAppKey',
    vocabBase: 'urn:space-miner:vocab#'
  }
})
