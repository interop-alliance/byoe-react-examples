/**
 * Round-trips the notes entity store through the encrypted local replica: opens
 * the app's own LocalStore (its COLLECTIONS, the dev seed) on fake-indexeddb,
 * installs it along with a writer id (no session store creates one here, and
 * the write verbs stamp with it), then drives useNotes insert / update / remove
 * and asserts the registry hydrate re-reads the persisted, decrypted rows. A
 * fresh replaceAll([]) before each hydrate proves the docs come back from the
 * replica, not stale in-memory Map state.
 *
 * @vitest-environment node
 */
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mintRecordEncryption } from '@interop/wallet-core/keyring'
import {
  clearLocalStore,
  deriveIdentity,
  hasStore,
  LocalStore,
  setLocalStore,
  setWriterId
} from '@interop/was-react'
import { COLLECTIONS } from '../../src/app.config'
import { DEV_SEED } from '../../src/dev/devSeed'
import { registry, useNotes, type Note } from '../../src/stores/notes'

let dbCounter = 0
let store: LocalStore | null = null
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
  setLocalStore(opened)
  return opened
}

beforeEach(async () => {
  // No session store is created here (the replica is driven directly), so the
  // writer id the write verbs stamp with has to be installed by hand.
  setWriterId(TEST_WRITER_ID)
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

    expectStoredNote(useNotes.getState().byId.get(note.id), note)
  })
})
