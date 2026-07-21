/**
 * The one example collection: a zustand entity store of notes, plus the
 * {@link StoreRegistry} the library's rehydrate mechanism drives (hydrate on
 * login, per-doc patch on remote sync, clear on logout).
 *
 * When adding a collection to an app built from this template: add a
 * `{ key, id }` entry to `COLLECTIONS` in app.config.ts, create its entity
 * store here, and give it a registry entry.
 */
import { createEntityStore, type StoreRegistry } from '@interop/was-react'

/**
 * `updatedAt` and `clientId` are REQUIRED by the sync layer: remote conflicts
 * are resolved last-writer-wins on the payload's own `(updatedAt, clientId)`,
 * so every insert/update must stamp both (see NotesPage). A payload without
 * them loses every conflict to the server copy.
 */
export interface Note {
  id: string
  text: string
  createdAt: string
  updatedAt: string
  clientId: string
}

/** Zustand hook holding the decrypted notes as a `Map<uuid, Note>`. */
export const useNotes = createEntityStore<Note>('notes')

/**
 * Per-collection handlers for the rehydrate mechanism. `upsert` maps to the
 * entity store's non-persisting `patch` (the sync stream already owns the
 * persisted row) and `clear` to `replaceAll([])`.
 */
export const registry: StoreRegistry = {
  notes: {
    hydrate: () => useNotes.getState().hydrate(),
    upsert: doc => useNotes.getState().patch(doc as Note),
    drop: uuid => useNotes.getState().drop(uuid),
    clear: () => useNotes.getState().replaceAll([])
  }
}
