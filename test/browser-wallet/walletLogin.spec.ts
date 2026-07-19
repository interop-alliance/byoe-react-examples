/**
 * Login-With-Wallet e2e against a real local freewallet + was-teaching-server.
 *
 * CHAPI has no mediator here; two injection seams stand in for it:
 * - App side: `window.__WAS_REACT_E2E_CHAPI__` switches the library's
 *   `src/auth/chapi.ts` to a request queue (`__WAS_REACT_E2E_CHAPI_REQUESTS__` /
 *   `__WAS_REACT_E2E_CHAPI_RESPONSES__`) this spec services.
 * - Wallet side: freewallet's own non-production `__E2E_CHAPI_GET_EVENT__` seam
 *   drives its /#/wallet/get popup with the app's captured VPR; the response VP
 *   is read back off `__E2E_CHAPI_RESPONSE__`.
 * The CHAPI store() step has no wallet-side seam, so the spec lands the seed
 * credential through the wallet's Add Credential paste flow -- the same
 * wallet-vault write path -- and then acks the app's store request.
 *
 * One serialized test walks the life cycle on a single wallet account (signup
 * is deliberately expensive PBKDF2): first login (store key + grants), a note
 * write that replicates to WAS, then logout and a returning login that recovers
 * the note from WAS.
 */
import {
  test,
  expect,
  type BrowserContext,
  type Page,
  type TestInfo
} from '@playwright/test'
import { APP_URL, WALLET_URL } from '../../playwright.wallet.config'

/* ----------------------------- wallet helpers ----------------------------- */

function testUser(testInfo: TestInfo) {
  const token = `${Date.now()}-w${testInfo.workerIndex}`
  return {
    passphrase: `Str0ngpass-${token}-Aa1!`,
    email: `e2e-${token}@example.com`
  }
}

/** Creates a wallet account; leaves `page` logged in on the wallet dashboard. */
async function signupWallet(page: Page, testInfo: TestInfo) {
  const { passphrase, email } = testUser(testInfo)
  await page.goto(`${WALLET_URL}/#/signup`)
  await page.locator('input[type="password"]').fill(passphrase)
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled({
    timeout: 20_000
  })
  await page.getByRole('button', { name: 'Next' }).click()
  await page.locator('input[type="email"]').fill(email)
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page).toHaveURL(/#\/signup\?.*step=storage/)
  await page.getByRole('button', { name: 'Create Wallet' }).click()
  // Signup binds the keyring (deliberately slow PBKDF2) + provisions storage.
  await expect(page).toHaveURL(/#\/dashboard/, { timeout: 45_000 })
  return { passphrase, email }
}

/**
 * Services one app-captured `get()` VPR through the wallet's /#/wallet/get page
 * (freewallet's injection seam), returning the CHAPI wire response.
 */
async function driveWalletGet(
  context: BrowserContext,
  {
    vpr,
    passphrase,
    selectCredential = false
  }: { vpr: unknown; passphrase: string; selectCredential?: boolean }
): Promise<unknown> {
  const page = await context.newPage()
  await page.addInitScript(
    cfg => {
      const win = window as unknown as {
        __E2E_CHAPI_GET_EVENT__?: unknown
        __E2E_CHAPI_RESPONSE__?: { value: unknown }
      }
      win.__E2E_CHAPI_RESPONSE__ = undefined
      win.__E2E_CHAPI_GET_EVENT__ = {
        credentialRequestOrigin: cfg.origin,
        credentialRequestOptions: {
          web: { VerifiablePresentation: cfg.vpr }
        },
        respondWith(promise: Promise<unknown>) {
          void Promise.resolve(promise).then(value => {
            win.__E2E_CHAPI_RESPONSE__ = { value: value ?? null }
          })
        }
      }
    },
    { origin: APP_URL, vpr }
  )
  await page.goto(`${WALLET_URL}/#/wallet/get`)
  // The popup always asks for the passphrase (it is designed for a cold
  // cross-origin popup, not the dashboard session).
  await page.locator('input[type="password"]').fill(passphrase)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page
    .locator('input[type="password"]')
    .waitFor({ state: 'detached', timeout: 30_000 })
  if (selectCredential) {
    // The app key is not a wallet Login Credential, so it is not pre-selected
    // on the share screen.
    const checkbox = page.getByRole('checkbox').first()
    await checkbox.waitFor({ timeout: 15_000 })
    await checkbox.check()
  }
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (
              window as unknown as {
                __E2E_CHAPI_RESPONSE__?: { value: unknown }
              }
            ).__E2E_CHAPI_RESPONSE__ !== undefined
        ),
      { timeout: 30_000, intervals: [500] }
    )
    .toBe(true)
  const response = await page.evaluate(
    () =>
      (window as unknown as { __E2E_CHAPI_RESPONSE__?: { value: unknown } })
        .__E2E_CHAPI_RESPONSE__
  )
  await page.close()
  return (response as { value: unknown }).value
}

/**
 * Lands a credential in the wallet vault via the dashboard Add Credential paste
 * flow (`walletPage` must be logged in on the dashboard).
 */
async function walletAddCredential(walletPage: Page, credentialJson: string) {
  await walletPage.getByRole('link', { name: 'Add Credential' }).click()
  await expect(walletPage).toHaveURL(/#\/add-credential/)
  await walletPage
    .getByRole('textbox', { name: /Paste a URL/ })
    .fill(credentialJson)
  await walletPage.getByRole('button', { name: 'Add' }).click()
  await expect(walletPage).toHaveURL(/#\/accept-credentials/)
  await walletPage.getByRole('button', { name: 'Accept all' }).click()
  await expect(walletPage).toHaveURL(/#\/dashboard/)
}

/* ------------------------------ app helpers ------------------------------ */

interface ChapiBridgeRequest {
  id: number
  type: 'get' | 'store'
  body: unknown
}

/** Arms the app-side CHAPI bridge (must run before the page loads). */
async function armChapiBridge(page: Page) {
  await page.addInitScript(() => {
    ;(
      window as unknown as { __WAS_REACT_E2E_CHAPI__?: boolean }
    ).__WAS_REACT_E2E_CHAPI__ = true
  })
}

/** Pops the next queued CHAPI request from the app page. */
async function popChapiRequest(page: Page): Promise<ChapiBridgeRequest> {
  let request: ChapiBridgeRequest | null = null
  await expect
    .poll(
      async () => {
        request = await page.evaluate(
          () =>
            (
              window as unknown as {
                __WAS_REACT_E2E_CHAPI_REQUESTS__?: ChapiBridgeRequest[]
              }
            ).__WAS_REACT_E2E_CHAPI_REQUESTS__?.shift() ?? null
        )
        return request
      },
      { timeout: 30_000, intervals: [300] }
    )
    .not.toBeNull()
  return request as unknown as ChapiBridgeRequest
}

/** Posts a wire response for a bridged CHAPI request. */
async function respondChapi(page: Page, id: number, value: unknown) {
  await page.evaluate(
    ([responseId, responseValue]) => {
      const win = window as unknown as {
        __WAS_REACT_E2E_CHAPI_RESPONSES__?: Record<number, unknown>
      }
      win.__WAS_REACT_E2E_CHAPI_RESPONSES__ ??= {}
      win.__WAS_REACT_E2E_CHAPI_RESPONSES__[responseId as number] =
        responseValue
    },
    [id, value] as const
  )
}

/** Runs the app side of one full wallet login from the login page. */
async function loginFromAppPage(
  appPage: Page,
  walletContext: BrowserContext,
  {
    passphrase,
    walletPage,
    expectFirstRun
  }: { passphrase: string; walletPage: Page; expectFirstRun: boolean }
) {
  const loginButton = appPage.getByRole('button', { name: 'Login with wallet' })
  await expect(loginButton).toBeEnabled({ timeout: 15_000 })
  await loginButton.click()

  // Popup #1: the seed probe.
  const probe = await popChapiRequest(appPage)
  expect(probe.type).toBe('get')
  const probeResponse = await driveWalletGet(walletContext, {
    vpr: probe.body,
    passphrase,
    selectCredential: !expectFirstRun
  })
  await respondChapi(appPage, probe.id, probeResponse)

  if (expectFirstRun) {
    // First run: the app stores its key credential in the wallet.
    const store = await popChapiRequest(appPage)
    expect(store.type).toBe('store')
    const offered = store.body as {
      verifiableCredential: Array<Record<string, unknown>>
    }
    const credential = offered.verifiableCredential[0]!
    expect(credential.type).toContain('ByoeNotesAppKey')
    await walletAddCredential(walletPage, JSON.stringify(credential))
    await respondChapi(appPage, store.id, {
      dataType: 'VerifiablePresentation',
      data: store.body
    })
  }

  // Popup #2: the storage grants.
  const grants = await popChapiRequest(appPage)
  expect(grants.type).toBe('get')
  const grantsResponse = await driveWalletGet(walletContext, {
    vpr: grants.body,
    passphrase
  })
  await respondChapi(appPage, grants.id, grantsResponse)

  // Login completes and the router lands on the notes shell.
  await expect(appPage.getByTestId('sync-status-chip')).toBeVisible({
    timeout: 60_000
  })
  await expect(appPage.getByRole('textbox', { name: 'new note' })).toBeVisible()
}

/** Adds a note on the app's notes page and waits for it to appear. */
async function addNote(appPage: Page, text: string) {
  await appPage.getByRole('textbox', { name: 'new note' }).fill(text)
  await appPage.getByRole('button', { name: 'Add' }).click()
  await expect(appPage.getByTestId('notes-list').getByText(text)).toBeVisible()
}

function noteRow(appPage: Page, text: string) {
  return appPage.getByTestId('notes-list').getByText(text)
}

/* --------------------------------- test ---------------------------------- */

test('login with wallet: first login, replication, logout/login recovery', async ({
  context
}, testInfo) => {
  /* Phase 0: create the wallet account (stays logged in on the dashboard). */
  const walletPage = await context.newPage()
  const { passphrase } = await signupWallet(walletPage, testInfo)

  /* Phase 1: first login -- store the app key, approve grants, enter. */
  const appPage = await context.newPage()
  await armChapiBridge(appPage)
  await appPage.goto(`${APP_URL}/#/login`)
  await expect(
    appPage.getByRole('button', { name: 'Login with wallet' })
  ).toBeVisible()
  await loginFromAppPage(appPage, context, {
    passphrase,
    walletPage,
    expectFirstRun: true
  })

  /* Phase 2: write a note and wait for it to replicate to WAS. */
  const noteText = `wallet-e2e-${Date.now()}`
  await addNote(appPage, noteText)
  await expect(appPage.getByTestId('sync-status-chip')).toHaveAttribute(
    'data-sync-state',
    'synced',
    { timeout: 45_000 }
  )

  /* Phase 3: log out choosing the wipe option (erases the local replica), so
     the returning login must recover the note from WAS rather than from local
     storage. Login again = returning path (the wallet returns the stored app
     key; no store() this time). Logout lands `local`; the login-gated router
     redirects to /login. */
  await appPage.getByRole('button', { name: 'log out' }).click()
  await appPage.getByTestId('logout-wipe').click()
  await expect(
    appPage.getByRole('button', { name: 'Login with wallet' })
  ).toBeVisible({ timeout: 15_000 })
  await loginFromAppPage(appPage, context, {
    passphrase,
    walletPage,
    expectFirstRun: false
  })
  await expect(noteRow(appPage, noteText)).toBeVisible({ timeout: 30_000 })
})
