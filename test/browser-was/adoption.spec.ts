/**
 * WAS adoption suite: a note created in the anonymous `local` replica (while
 * dev-connect is degraded to local-only) must survive being adopted into the
 * connected replica once dev-connect finds its grants, and must then replicate
 * to a fresh profile through the shared WAS Space -- proving the adopted note
 * reached the server.
 *
 * Dev-connect's `connectWithGrants` defaults to adopting (`adopt: 'merge'`), so
 * connecting migrates the local note into the connected replica; no app code
 * drives that here. Same real was-teaching-server, dev seed, and grants as the
 * replication suite; serialized (one shared Space), note texts unique per run.
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

/** Waits for the sync-status chip to settle on the synced state. */
async function expectSynced(page: Page): Promise<void> {
  await expect(page.getByTestId('sync-status-chip')).toHaveAttribute(
    'data-sync-state',
    'synced',
    { timeout: 30_000 }
  )
}

test('a local-only note is adopted on connect and replicates', async ({
  browser
}) => {
  const text = `adopt-${Date.now()}`
  const ctxA = await browser.newContext()
  const a = await ctxA.newPage()

  // Degrade dev-connect to local-only by 404-ing the grants fetch BEFORE the
  // app loads: loadDevGrants returns null and the app stays in `local`.
  await a.route('**/dev-grants.local.json', route =>
    route.fulfill({ status: 404 })
  )
  await a.goto('/')
  await expect(addInput(a)).toBeVisible({ timeout: 30_000 })

  // Created in the anonymous `local` replica (dev mode is local-first).
  await addNote(a, text)

  // Restore the grants and reload: dev-connect now connects, and its default
  // `adopt: 'merge'` migrates the local note into the connected replica.
  await a.unroute('**/dev-grants.local.json')
  await a.reload()
  await expect(noteRow(a, text)).toBeVisible({ timeout: 30_000 })
  await expectSynced(a)

  // A fresh profile pulls the envelope on open: proof the adopted note was
  // pushed all the way to the WAS server.
  const ctxB = await browser.newContext()
  const b = await openProfile(ctxB)
  await expect(noteRow(b, text)).toBeVisible({ timeout: 30_000 })

  // Clean up the shared Space: soft-delete the adopted note.
  await b.getByRole('button', { name: `delete ${text}` }).click()
  await expect(noteRow(b, text)).toHaveCount(0)

  await ctxA.close()
  await ctxB.close()
})
