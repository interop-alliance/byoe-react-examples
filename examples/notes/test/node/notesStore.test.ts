/**
 * Round-trips the notes entity store through the encrypted local replica: opens
 * the app's own LocalStore (its COLLECTIONS, the dev seed) on fake-indexeddb,
 * attaches it to a StorageContext of the test's own, carrying the writer id the
 * write verbs stamp with (no session store creates one here), then drives
 * useNotes insert / update / remove
 * and asserts the registry hydrate re-reads the persisted, decrypted rows. A
 * fresh replaceAll([]) before each hydrate proves the docs come back from the
 * replica, not stale in-memory Map state.
 *
 * @vitest-environment node
 */
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  deactivateStorageContext,
  deriveIdentity,
  hasStore,
  LocalStore,
  mintRecordEncryption,
  StorageContext
} from '@interop/was-react'
import { COLLECTIONS } from '../../src/app.config'
import { DEV_SEED } from '../../src/dev/devSeed'
import { registry, useNotes, type Note } from '../../src/stores/notes'

let dbCounter = 0
let store: LocalStore | null = null
/**
 * The session-scoped context the entity actions resolve through; attaching a
 * store makes it the active one.
 */
let context: StorageContext
let dbName = ''
/** The minted encryption descriptors of each test database, by db name. */
const descriptorsByDb = new Map<
  string,
  Record<string, Awaited<ReturnType<typeof mintRecordEncryption>>>
>()

const notesEntry = registry.notes
if (!notesEntry) {
  throw new Error('the notes registry entry is missing')
}

/** The writer id installed for this suite, stamped onto every write. */
const TEST_WRITER_ID = 'test-writer'

/**
 * A note payload as the app writes one: no LWW fields, which the entity
 * store's write verbs stamp themselves.
 */
function makeNote(text: string): Omit<Note, 'updatedAt' | 'writerId'> {
  return {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString()
  }
}

/**
 * Asserts a hydrated note carries the written fields plus LWW stamps the write
 * verb minted: this session's writer id and a parseable ISO instant.
 *
 * @param actual {Note | undefined}
 * @param expected {object} The app-supplied payload.
 */
function expectStoredNote(
  actual: Note | undefined,
  expected: Omit<Note, 'updatedAt' | 'writerId'>
) {
  expect(actual).toMatchObject(expected)
  expect(actual?.writerId).toBe(TEST_WRITER_ID)
  expect(Number.isNaN(Date.parse(actual?.updatedAt ?? ''))).toBe(false)
}

async function openStore(name: string): Promise<LocalStore> {
  // Every private collection is encrypted to the app's identity KAK, derived
  // once from the seed, so the store takes the key material rather than the
  // seed itself.
  const { keyAgreementKey, keyResolver } = await deriveIdentity({
    seed: DEV_SEED
  })
  // Epoch-from-birth: a private collection's cipher only exists from an
  // epoch-bearing encryption descriptor, so this replica mints one per
  // collection, sealed to its own identity KAK -- what the library's anonymous
  // replica does at a collection's local birth. Minted once per database name
  // and reused on reopen (the library persists them beside the anon seed), so
  // a reopened replica decrypts the rows the previous one sealed.
  const cached = descriptorsByDb.get(name)
  const descriptors =
    cached ??
    Object.fromEntries(
      await Promise.all(
        COLLECTIONS.map(async ({ id }) => [
          id,
          await mintRecordEncryption({ keyAgreementKey })
        ])
      )
    )
  descriptorsByDb.set(name, descriptors)
  const opened = await LocalStore.init({
    keyAgreementKey,
    keyResolver,
    collections: COLLECTIONS,
    dbName: name,
    descriptors
  })
  context.attachStore(opened)
  return opened
}

/**
 * Serializes every record of every object store of every IndexedDB database,
 * the replica's storage as it sits on disk, so the encryption-at-rest check
 * reads nothing through the library.
 *
 * @returns {Promise<string>}
 */
async function dumpIndexedDb(): Promise<string> {
  const records: unknown[] = []
  for (const { name } of await indexedDB.databases()) {
    if (!name) {
      continue
    }
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const storeNames = Array.from(db.objectStoreNames)
    if (storeNames.length > 0) {
      const tx = db.transaction(storeNames, 'readonly')
      for (const storeName of storeNames) {
        const rows = await new Promise<unknown[]>((resolve, reject) => {
          const request = tx.objectStore(storeName).getAll()
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => reject(request.error)
        })
        records.push(...rows)
      }
    }
    db.close()
  }
  return JSON.stringify(records)
}

beforeEach(async () => {
  // No session store is created here (the replica is driven directly), so the
  // context carrying the writer id the write verbs stamp with is built by hand.
  context = new StorageContext({ registry, writerId: TEST_WRITER_ID })
  dbName = `byoe-notes-test-${++dbCounter}`
  store = await openStore(dbName)
  useNotes.getState().replaceAll([])
})

afterEach(async () => {
  context.detachStore()
  if (store) {
    await store.close()
    store = null
  }
  deactivateStorageContext(context)
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
    expectStoredNote(byId.get(note.id), note)
  })

  it('updates a note in place, reflected after a fresh hydrate', async () => {
    const note = makeNote('First text')
    await useNotes.getState().insert(note)

    const updated = { ...note, text: 'Second text' }
    await useNotes.getState().update(updated)

    useNotes.getState().replaceAll([])
    await notesEntry.hydrate()

    const byId = useNotes.getState().byId
    expect(byId.size).toBe(1)
    expectStoredNote(byId.get(note.id), updated)
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
    expectStoredNote(byId.get(keep.id), keep)
  })

  it('encrypts at rest: no note text anywhere in IndexedDB', async () => {
    const note = makeNote('distinctive-oat-milk-token')
    await useNotes.getState().insert(note)

    // The envelope id anchors the scan on the row this insert wrote; the note
    // id itself only exists inside the ciphertext.
    const envelopeId = store!.envelopeIdFor('notes', note.id)
    expect(envelopeId).toBeDefined()

    const raw = await dumpIndexedDb()
    expect(raw).toContain(envelopeId)
    expect(raw).not.toContain(note.id)
    expect(raw).not.toContain('distinctive-oat-milk-token')
  })

  it('persists across a store reopen (survives a reload)', async () => {
    const note = makeNote('Durable note')
    await useNotes.getState().insert(note)

    context.detachStore()
    await store!.close()

    store = await openStore(dbName)

    useNotes.getState().replaceAll([])
    await notesEntry.hydrate()

    expectStoredNote(useNotes.getState().byId.get(note.id), note)
  })
})
