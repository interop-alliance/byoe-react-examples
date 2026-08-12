/**
 * The whole was-react wiring of a tier-1 app: `defineDocumentApp` takes the
 * app identity plus the one sandbox document (its WAS collection id and its
 * initial value) and returns the config + registry for `WasSessionProvider`
 * and the typed `useAppDocument` hook the components consume. No entity stores,
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

// This app's canonical URL: what names THIS application among the applications
// served from its origin, so the app-key identity is scoped to the triple
// (user, origin, appUrl). Absolute, fragment-less, and same-origin with the
// origin above.
export const APP_URL = env.VITE_APP_URL || `${APP_ORIGIN}/text-editor`

// The document before the first write: a short welcome explaining how the app
// works. It is ordinary document text -- edit or delete it and the change
// persists like any other; Clear Data restores it with the fresh document.
const INITIAL_TEXT = `Welcome to the Text Editor example app.

Everything you type here is encrypted and automatically saved to this browser's IndexedDB storage. Edit this text, reload the page, and it is still here -- no account needed.

To keep a copy, use "Export (Download) File" and bring it back later with "Import (Load) File". Or click "Save to Web Spaces" to connect your wallet and sync this document to your own Web Space.

"Clear Data" erases the copy on this device and starts over with this welcome text.`

/** The one document this app is about: the text in a single textbox. */
export interface TextDocument {
  text: string
}

export const { config, registry, useAppDocument } =
  defineDocumentApp<TextDocument>({
    appName: 'Text Editor',
    appOrigin: APP_ORIGIN,
    appUrl: APP_URL,
    document: {
      collectionId: 'text-editor-document',
      initial: { text: INITIAL_TEXT }
    },
    dbName: 'text-editor',
    storageKeyPrefix: 'text-editor:'
  })
