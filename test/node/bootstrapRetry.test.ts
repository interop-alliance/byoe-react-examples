/**
 * Regression guard for `initApp`'s retry-after-failure path. `initApp` caches
 * its in-flight promise so concurrent callers share one open/hydrate. The bug
 * this locks down: on a transient failure it left the REJECTED promise cached,
 * so every later caller (a StrictMode remount, a user reload of the route) got
 * the same rejection back forever and the app was wedged until a full page
 * reload. The fix un-caches the failed attempt (`inFlight = null` in the catch).
 *
 * We force the first hydrate to throw once, assert the first `initApp()`
 * rejects and surfaces the error, then assert a second `initApp()` actually
 * re-runs and resolves -- flipping the ready gate. Against the pre-fix
 * bootstrap the second call re-rejects and this test fails.
 *
 * @vitest-environment node
 */
import 'fake-indexeddb/auto'
import { afterEach, expect, it, vi } from 'vitest'

// Toggle read inside the hoisted mock factory below. One-shot: the mocked
// hydrateAll fails the first time it is asked to, then defers to the real one.
const control = vi.hoisted(() => ({ failHydrateOnce: false }))

vi.mock('@interop/was-react', async importOriginal => {
  const actual = await importOriginal<typeof import('@interop/was-react')>()
  return {
    ...actual,
    hydrateAll: vi.fn((...args: Parameters<typeof actual.hydrateAll>) => {
      if (control.failHydrateOnce) {
        control.failHydrateOnce = false
        return Promise.reject(new Error('transient hydrate failure'))
      }
      return actual.hydrateAll(...args)
    })
  }
})

import {
  clearLocalStore,
  hasStore,
  requireStore,
  useAppReady
} from '@interop/was-react'
import { initApp } from '../../src/dev/bootstrap'

afterEach(async () => {
  control.failHydrateOnce = false
  if (hasStore()) {
    await requireStore().close()
    clearLocalStore()
  }
  useAppReady.getState().reset()
})

it('recovers on retry after a transient init failure (cached promise is not poisoned)', async () => {
  control.failHydrateOnce = true

  // First attempt: the store opens, then hydrate throws. The error surfaces on
  // the ready gate and the promise rejects.
  await expect(initApp()).rejects.toThrow('transient hydrate failure')
  expect(useAppReady.getState().ready).toBe(false)
  expect(useAppReady.getState().error).toBe('transient hydrate failure')

  // Second attempt: the fix un-cached the failed promise, so this re-runs
  // (the store is already open, so only hydrate retries) and succeeds. The
  // pre-fix bootstrap handed back the same rejected promise here instead.
  await expect(initApp()).resolves.toBeUndefined()
  expect(useAppReady.getState().ready).toBe(true)
  expect(useAppReady.getState().error).toBeNull()
})
