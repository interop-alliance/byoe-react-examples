/**
 * Offline tier: the game boots straight into the `local` state (encrypted
 * anonymous replica; no wallet, no WAS server) and the whole save-file loop
 * works there -- mining persists across a reload, the drill upgrade spends
 * minerals, the save downloads as a tagged JSON file, a downloaded save
 * restores state, a non-save file is rejected without touching the game, and
 * Clear data resets to the initial save. Each test runs in an isolated
 * browser context (fresh IndexedDB), so no cross-test cleanup.
 */
import { test, expect, type Page } from '@playwright/test'

async function bootToGame(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Space Miner' })).toBeVisible()
  await expect(page.getByTestId('minerals')).toBeVisible()
}

async function mine(page: Page, times: number) {
  const button = page.getByRole('button', { name: 'Mine', exact: true })
  for (let i = 0; i < times; i++) {
    await button.click()
  }
}

test.beforeEach(async ({ page }) => {
  await bootToGame(page)
})

test('boots into local state with the initial save', async ({ page }) => {
  await expect(page.getByTestId('minerals')).toHaveText('0')
  await expect(page.getByText('drill level 1')).toBeVisible()
  await expect(page.getByTestId('sync-status-chip')).toBeVisible()
})

test('mines minerals and persists them across a reload', async ({ page }) => {
  await mine(page, 3)
  await expect(page.getByTestId('minerals')).toHaveText('3')

  await page.reload()
  await bootToGame(page)
  await expect(page.getByTestId('minerals')).toHaveText('3')
})

test('upgrades the drill, spending minerals and raising the yield', async ({
  page
}) => {
  const upgrade = page.getByRole('button', { name: /Upgrade drill/ })
  await expect(upgrade).toBeDisabled()

  await mine(page, 25)
  await expect(page.getByTestId('minerals')).toHaveText('25')
  await upgrade.click()

  await expect(page.getByTestId('minerals')).toHaveText('0')
  await expect(page.getByText('drill level 2')).toBeVisible()
  // Level 2 mines two minerals per click.
  await mine(page, 1)
  await expect(page.getByTestId('minerals')).toHaveText('2')
})

test('downloads the save as a tagged JSON file', async ({ page }) => {
  await mine(page, 2)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download save' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('space-miner-save.json')
  const body = JSON.parse(
    (await (await download.createReadStream()).toArray())
      .map(chunk => String(chunk))
      .join('')
  ) as { format: string; app: string; document: { minerals: number } }
  expect(body.format).toBe('was-document/v1')
  expect(body.app).toBe('Space Miner')
  expect(body.document.minerals).toBe(2)
})

test('loads a save file, replacing the current state', async ({ page }) => {
  await mine(page, 1)
  await expect(page.getByTestId('minerals')).toHaveText('1')

  const save = {
    format: 'was-document/v1',
    app: 'Space Miner',
    exportedAt: '2026-07-19T00:00:00.000Z',
    document: { minerals: 500, drillLevel: 4 }
  }
  await page.getByTestId('load-save-input').setInputFiles({
    name: 'imported-save.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save))
  })

  await expect(page.getByTestId('minerals')).toHaveText('500')
  await expect(page.getByText('drill level 4')).toBeVisible()

  // The loaded save is persisted, not just rendered.
  await page.reload()
  await bootToGame(page)
  await expect(page.getByTestId('minerals')).toHaveText('500')
})

test('rejects a file that is not a save, leaving the game untouched', async ({
  page
}) => {
  await mine(page, 1)
  await page.getByTestId('load-save-input').setInputFiles({
    name: 'not-a-save.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ something: 'else' }))
  })

  await expect(page.getByText(/was-document\/v1/)).toBeVisible()
  await expect(page.getByTestId('minerals')).toHaveText('1')
})

test('clears the local data back to the initial save', async ({ page }) => {
  await mine(page, 5)
  await expect(page.getByTestId('minerals')).toHaveText('5')

  await page.getByTestId('clear-data-button').click()
  await page.getByRole('button', { name: /clear|erase/i }).click()

  await expect(page.getByTestId('minerals')).toHaveText('0')
  await page.reload()
  await bootToGame(page)
  await expect(page.getByTestId('minerals')).toHaveText('0')
})
