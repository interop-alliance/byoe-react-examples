/**
 * WAS replication suite: real end-to-end sync against a local
 * was-teaching-server (booted + provisioned in globalSetup). Each browser
 * context is an independent IndexedDB replica; they all share the SAME dev seed
 * and grants, so they replicate through one WAS Space.
 *
 * The pull side is poll-based (no server-side live stream): a fresh context
 * pulls on open, and an already-open context re-pulls on the app's periodic
 * reSync (tuned low in this config), so the tests wait rather than force a
 * reload. Expect timeouts are generous because each hop is a poll interval plus
 * a round trip. Note texts are unique per run because the Space is shared and
 * long-lived. Tests are serialized (one shared Space).
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test'

/** The add-note input. MUI puts the aria-label on the field wrapper, so target
 * the actual <input> by its placeholder. */
function addInput(page: Page) {
  return page.getByPlaceholder('A new note...')
}

/** The list row locator for a note by its exact text on `page`. */
function noteRow(page: Page, text: string) {
  return page.getByTestId('notes-list').getByText(text, { exact: true })
}

/** Opens a fresh profile (isolated IndexedDB) and waits for it to be ready. */
async function openProfile(context: BrowserContext): Promise<Page> {
  const page = await context.newPage()
  await page.goto('/')
  await expect(addInput(page)).toBeVisible({ timeout: 30_000 })
  return page
}

/** Adds a note with the given text on `page` and waits for its row. */
async function addNote(page: Page, text: string): Promise<void> {
  await addInput(page).fill(text)
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(noteRow(page, text)).toBeVisible()
}

/** Edits the note with `from` text to `to` via the row's inline editor. */
async function editNote(page: Page, from: string, to: string): Promise<void> {
  await page.getByRole('button', { name: `edit ${from}` }).click()
  const field = page.getByLabel('edit note').locator('input')
  await field.fill(to)
  await page.getByRole('button', { name: 'Save' }).click()
}

/** Waits for the sync-status chip to settle on the synced state. */
async function expectSynced(page: Page): Promise<void> {
  await expect(page.getByTestId('sync-status-chip')).toHaveAttribute(
    'data-sync-state',
    'synced',
    { timeout: 30_000 }
  )
}

test('the app boots into dev-sync and reaches the synced state', async ({
  browser
}) => {
  const context = await browser.newContext()
  const page = await openProfile(context)

  // Replication started against the WAS server and settled: proof the dev
  // grants provisioned in globalSetup are accepted end to end.
  await expectSynced(page)

  await context.close()
})

test('a note replicates to a second fresh profile', async ({ browser }) => {
  const text = `repl-${Date.now()}`
  const ctxA = await browser.newContext()
  const a = await openProfile(ctxA)

  await addNote(a, text)
  await expectSynced(a)

  // A fresh profile with the same seed + grants pulls the envelope on open and
  // hydrates the note, with no manual reload.
  const ctxB = await browser.newContext()
  const b = await openProfile(ctxB)
  await expect(noteRow(b, text)).toBeVisible({ timeout: 30_000 })

  await ctxA.close()
  await ctxB.close()
})

test('a note added in one profile converges to an already-open profile', async ({
  browser
}) => {
  const text = `live-${Date.now()}`
  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const a = await openProfile(ctxA)
  const b = await openProfile(ctxB)

  // B is already open (past its initial pull) when A creates the note, so B can
  // only see it via the app's periodic reSync polling the changes feed.
  await addNote(a, text)
  await expectSynced(a)
  await expect(noteRow(b, text)).toBeVisible({ timeout: 30_000 })

  await ctxA.close()
  await ctxB.close()
})

test('an edit replicates to a second fresh profile', async ({ browser }) => {
  const original = `edit-${Date.now()}`
  const edited = `${original}-v2`
  const ctxA = await browser.newContext()
  const a = await openProfile(ctxA)

  await addNote(a, original)
  await expectSynced(a)

  // Edit in place. The push is a conditional overwrite of the same envelope;
  // a version-skew 412 is resolved by the payload LWW (updatedAt, deviceId)
  // and re-pushed, so the new text must land server-side.
  await editNote(a, original, edited)
  await expect(noteRow(a, edited)).toBeVisible()

  const ctxB = await browser.newContext()
  const b = await openProfile(ctxB)
  await expect(noteRow(b, edited)).toBeVisible({ timeout: 30_000 })
  await expect(noteRow(b, original)).toHaveCount(0)

  await ctxA.close()
  await ctxB.close()
})

test('a delete replicates to a second fresh profile', async ({
  browser
}) => {
  const text = `del-${Date.now()}`
  const ctxA = await browser.newContext()
  const a = await openProfile(ctxA)

  await addNote(a, text)
  await expectSynced(a)

  // Soft-delete tombstone, pushed as a conditional server-side delete.
  await a.getByRole('button', { name: `delete ${text}` }).click()
  await expect(noteRow(a, text)).toHaveCount(0)

  const ctxB = await browser.newContext()
  const b = await openProfile(ctxB)
  await expectSynced(b)
  await expect(noteRow(b, text)).toHaveCount(0)

  await ctxA.close()
  await ctxB.close()
})
