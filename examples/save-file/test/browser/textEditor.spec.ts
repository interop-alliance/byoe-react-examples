/**
 * Offline tier: the editor boots straight into the `local` state (encrypted
 * anonymous replica; no wallet, no WAS server) and the whole document loop
 * works there -- typed text persists across a reload, the document exports as a
 * tagged JSON file, an exported file re-imports and replaces the text, a
 * non-document file is rejected without touching the editor, and Clear Data
 * resets to the initial welcome document. Each test runs in an isolated
 * browser context (fresh IndexedDB), so no cross-test cleanup.
 */
import { test, expect, type Page } from '@playwright/test'

// The expected initial document -- asserted verbatim, so kept as a copy here
// rather than imported from `src/app.config.ts` (which would pull the whole
// was-react module graph into the test runner). Must match `INITIAL_TEXT`.
const WELCOME_TEXT = `Welcome to the Text Editor example app.

Everything you type here is encrypted and automatically saved to this browser's IndexedDB storage. Edit this text, reload the page, and it is still here -- no account needed.

To keep a copy, use "Export (Download) File" and bring it back later with "Import (Load) File". Or click "Save to Web Spaces" to connect your wallet and sync this document to your own Web Space.

"Clear Data" erases the copy on this device and starts over with this welcome text.`

// The debounce the editor waits after the last keystroke before persisting the
// document (see `SAVE_DELAY_MS` in App.tsx).
const SAVE_DELAY_MS = 400

async function bootToEditor(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Text Editor' })).toBeVisible()
  await expect(page.getByTestId('editor')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await bootToEditor(page)
})

test('boots into local state with the welcome document', async ({ page }) => {
  await expect(page.getByTestId('editor')).toHaveValue(WELCOME_TEXT)
  await expect(page.getByTestId('sync-status-chip')).toBeVisible()
})

test('persists typed text across a reload', async ({ page }) => {
  await page.getByTestId('editor').fill('hello local-first world')

  // The debounced write lands SAVE_DELAY_MS after the last keystroke; wait past
  // it (reloading before the write would drop the unsaved text) then reload.
  await page.waitForTimeout(SAVE_DELAY_MS)
  await page.reload()
  await bootToEditor(page)
  await expect(page.getByTestId('editor')).toHaveValue('hello local-first world')
})

test('exports the document as a tagged JSON file', async ({ page }) => {
  await page.getByTestId('editor').fill('exported text')
  await page.waitForTimeout(SAVE_DELAY_MS)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export (Download) File' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('text-editor-document.json')
  const body = JSON.parse(
    (await (await download.createReadStream()).toArray())
      .map(chunk => String(chunk))
      .join('')
  ) as { format: string; app: string; document: { text: string } }
  expect(body.format).toBe('was-document/v1')
  expect(body.app).toBe('Text Editor')
  expect(body.document.text).toBe('exported text')
})

test('imports a document file, replacing the current text', async ({ page }) => {
  await page.getByTestId('editor').fill('original text')

  const exported = {
    format: 'was-document/v1',
    app: 'Text Editor',
    exportedAt: '2026-07-19T00:00:00.000Z',
    document: { text: 'imported text' }
  }
  await page.getByTestId('load-file-input').setInputFiles({
    name: 'imported-document.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported))
  })

  await expect(page.getByTestId('editor')).toHaveValue('imported text')

  // The imported text is persisted, not just rendered.
  await page.reload()
  await bootToEditor(page)
  await expect(page.getByTestId('editor')).toHaveValue('imported text')
})

test('rejects a file that is not a document, leaving the editor untouched', async ({
  page
}) => {
  await page.getByTestId('editor').fill('keep me')
  await page.getByTestId('load-file-input').setInputFiles({
    name: 'not-a-document.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ something: 'else' }))
  })

  await expect(page.getByText(/was-document\/v1/)).toBeVisible()
  await expect(page.getByTestId('editor')).toHaveValue('keep me')
})

test('clears the local data back to the welcome document', async ({ page }) => {
  await page.getByTestId('editor').fill('to be cleared')
  await page.waitForTimeout(SAVE_DELAY_MS)

  await page.getByTestId('clear-data-button').click()
  await page.getByRole('button', { name: /clear|erase/i }).click()

  await expect(page.getByTestId('editor')).toHaveValue(WELCOME_TEXT)
  await page.reload()
  await bootToEditor(page)
  await expect(page.getByTestId('editor')).toHaveValue(WELCOME_TEXT)
})
