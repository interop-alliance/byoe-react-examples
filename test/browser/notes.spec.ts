/**
 * Offline (mocked) tier: the app boots through the dev gate into the Notes page
 * over the encrypted local replica -- no wallet, no WAS server. Adds / edits /
 * deletes a note, proves persistence across a reload (IndexedDB), and checks the
 * sync chip advertises local-only mode. Each test runs in an isolated browser
 * context (fresh IndexedDB), so no cross-test cleanup.
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

test('boots through the dev gate into an empty Notes page', async ({
  page
}) => {
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

test('sync chip advertises local-only (offline) mode', async ({ page }) => {
  const chip = page.getByTestId('sync-status-chip')
  await expect(chip).toBeVisible()
  await expect(chip).toHaveText(/Offline/)
  await expect(chip).toHaveAttribute('data-sync-state', 'offline')
})
