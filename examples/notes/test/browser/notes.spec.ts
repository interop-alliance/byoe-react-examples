/**
 * Offline (mocked) tier: the app boots into local state (the encrypted
 * anonymous replica) and renders the Notes page directly -- no wallet, no WAS
 * server. Adds / edits / deletes a note, proves persistence across a reload
 * (IndexedDB), checks the sync chip advertises local-only mode, and clears the
 * local data. Each test runs in an isolated browser context (fresh IndexedDB),
 * so no cross-test cleanup.
 */
import { test, expect, type Page } from '@playwright/test'

async function bootToNotes(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'BYOE Notes' })).toBeVisible()
  await expect(page.getByTestId('bootstrap-loading')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Notes', exact: true })
  ).toBeVisible()
}

async function addNote(page: Page, text: string) {
  await page.getByLabel('new note').locator('input').fill(text)
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByTestId('notes-list').getByText(text)).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await bootToNotes(page)
})

test('boots into local state with an empty Notes page', async ({ page }) => {
  await expect(page.getByTestId('notes-empty')).toBeVisible()
  await expect(page.getByTestId('notes-list')).toHaveCount(0)
})

test('adds a note', async ({ page }) => {
  await addNote(page, 'Remember the milk')

  await expect(page.getByTestId('notes-empty')).toHaveCount(0)
  await expect(page.getByTestId('notes-list')).toBeVisible()
})

test('edits a note in place', async ({ page }) => {
  await addNote(page, 'Draft title')

  await page.getByRole('button', { name: 'edit Draft title' }).click()
  const field = page.getByLabel('edit note').locator('input')
  await field.fill('Final title')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(
    page.getByTestId('notes-list').getByText('Final title')
  ).toBeVisible()
  await expect(page.getByText('Draft title')).toHaveCount(0)
})

test('deletes a note, returning to the empty state', async ({ page }) => {
  await addNote(page, 'Delete me')

  await page.getByRole('button', { name: 'delete Delete me' }).click()

  await expect(page.getByText('Delete me')).toHaveCount(0)
  await expect(page.getByTestId('notes-empty')).toBeVisible()
})

test('persists notes across a page reload (IndexedDB)', async ({ page }) => {
  await addNote(page, 'Durable note')

  await page.reload()
  await expect(page.getByTestId('bootstrap-loading')).toHaveCount(0)

  await expect(
    page.getByTestId('notes-list').getByText('Durable note')
  ).toBeVisible()
})

test('sync chip advertises local-only mode', async ({ page }) => {
  const chip = page.getByTestId('sync-status-chip')
  await expect(chip).toBeVisible()
  await expect(chip).toHaveText(/Local only/)
  await expect(chip).toHaveAttribute('data-sync-state', 'offline')
})

test('clears local data, emptying notes and staying empty across reload', async ({
  page
}) => {
  await addNote(page, 'Erase me')
  await expect(page.getByTestId('notes-list')).toBeVisible()

  // Open the Clear data dialog from the app shell and confirm the destructive
  // reset (deletes the local replica, mints a fresh anonymous seed/DID).
  await page.getByTestId('clear-data-button').click()
  await page.getByTestId('clear-data-confirm').click()

  // The reset lands a fresh, empty local replica; the app stays usable.
  await expect(page.getByTestId('notes-empty')).toBeVisible()
  await expect(page.getByText('Erase me')).toHaveCount(0)

  // A reload boots the same (new) anonymous seed: still empty, nothing recovered.
  await page.reload()
  await expect(page.getByTestId('bootstrap-loading')).toHaveCount(0)
  await expect(page.getByTestId('notes-empty')).toBeVisible()
  await expect(page.getByText('Erase me')).toHaveCount(0)
})
