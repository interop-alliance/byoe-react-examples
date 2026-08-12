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
 * `updatedAt` and `writerId` are the last-write-wins fields the sync layer
 * resolves remote conflicts on. The app never stamps them: the entity store's
 * persisted write verbs (`insert` / `update` / `upsert`) stamp both themselves
 * on every write. They stay on the payload type because the stored rows carry
 * them, and reads (sorting, display) may use them.
 */
export interface Note {
  id: string
  text: string
  createdAt: string
  updatedAt: string
  writerId: string
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
