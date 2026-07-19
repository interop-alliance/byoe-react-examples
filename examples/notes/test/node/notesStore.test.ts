/**
 * Round-trips the notes entity store through the encrypted local replica: opens
 * the app's own LocalStore (its COLLECTIONS, the dev seed) on fake-indexeddb,
 * installs it, then drives useNotes insert / update / remove and asserts the
 * registry hydrate re-reads the persisted, decrypted rows. A fresh replaceAll([])
 * before each hydrate proves the docs come back from the replica, not stale
 * in-memory Map state.
 *
 * @vitest-environment node
 */
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearLocalStore,
  hasStore,
  LocalStore,
  setLocalStore
} from '@interop/was-react'
import { COLLECTIONS } from '../../src/app.config'
import { DEV_SEED } from '../../src/dev/devSeed'
import { registry, useNotes, type Note } from '../../src/stores/notes'

let dbCounter = 0
let store: LocalStore | null = null
let dbName = ''

const notesEntry = registry.notes
if (!notesEntry) {
  throw new Error('the notes registry entry is missing')
}

function makeNote(text: string): Note {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    text,
    createdAt: now,
    updatedAt: now,
    deviceId: 'test-device'
  }
}

async function openStore(name: string): Promise<LocalStore> {
  const opened = await LocalStore.init({
    seed: DEV_SEED,
    collections: COLLECTIONS,
    dbName: name
  })
  setLocalStore(opened)
  return opened
}

beforeEach(async () => {
  dbName = `byoe-notes-test-${++dbCounter}`
  store = await openStore(dbName)
  useNotes.getState().replaceAll([])
})

afterEach(async () => {
  if (store) {
    await store.close()
    store = null
  }
  if (hasStore()) {
    clearLocalStore()
  }
})

describe('notes store round-trip through the encrypted LocalStore', () => {
  it('installs the store the entity actions reach for', () => {
    expect(hasStore()).toBe(true)
  })

  it('inserts a note and hydrates it back from the replica', async () => {
    const note = makeNote('Buy distinctive-oat-milk-token')
    await useNotes.getState().insert(note)

    // Drop the in-memory Map; hydrate must repopulate it from the replica.
    useNotes.getState().replaceAll([])
    expect(useNotes.getState().byId.size).toBe(0)

    await notesEntry.hydrate()

    const byId = useNotes.getState().byId
    expect(byId.size).toBe(1)
    expect(byId.get(note.id)).toEqual(note)
  })

  it('updates a note in place, reflected after a fresh hydrate', async () => {
    const note = makeNote('First text')
    await useNotes.getState().insert(note)

    const updated: Note = {
      ...note,
      text: 'Second text',
      updatedAt: new Date().toISOString()
    }
    await useNotes.getState().update(updated)

    useNotes.getState().replaceAll([])
    await notesEntry.hydrate()

    const byId = useNotes.getState().byId
    expect(byId.size).toBe(1)
    expect(byId.get(note.id)).toEqual(updated)
  })

  it('removes a note, gone after a fresh hydrate', async () => {
    const keep = makeNote('Keep me')
    const drop = makeNote('Ephemeral')
    await useNotes.getState().insert(keep)
    await useNotes.getState().insert(drop)

    await useNotes.getState().remove(drop.id)

    useNotes.getState().replaceAll([])
    await notesEntry.hydrate()

    const byId = useNotes.getState().byId
    expect(byId.size).toBe(1)
    expect(byId.has(drop.id)).toBe(false)
    expect(byId.get(keep.id)).toEqual(keep)
  })

  it('encrypts at rest: no note text in the stored envelope', async () => {
    const note = makeNote('distinctive-oat-milk-token')
    await useNotes.getState().insert(note)

    const rows = await store!.rxCollection('notes').find().exec()
    expect(rows).toHaveLength(1)
    const raw = JSON.stringify(rows[0]!.toMutableJSON())
    expect(raw).not.toContain('distinctive-oat-milk-token')
  })

  it('persists across a store reopen (survives a reload)', async () => {
    const note = makeNote('Durable note')
    await useNotes.getState().insert(note)

    await store!.close()
    clearLocalStore()

    store = await openStore(dbName)

    useNotes.getState().replaceAll([])
    await notesEntry.hydrate()

    expect(useNotes.getState().byId.get(note.id)).toEqual(note)
  })
})
