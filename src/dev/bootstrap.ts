/**
 * Dev-mode bootstrap: opens the encrypted local store from the dev seed and
 * hydrates the entity stores from it, then flips the library's `useAppReady`
 * gate the router waits on. Idempotent -- concurrent callers share one
 * in-flight promise.
 *
 * Wallet mode does not use `initApp`; there the library's auth store owns the
 * open/hydrate ordering (seed from the wallet session) and drives the same
 * `useAppReady` gate.
 */
import {
  hasStore,
  hydrateAll,
  LocalStore,
  setLocalStore,
  useAppReady
} from '@interop/was-react'
import { appConfig, WAS_DEV_SYNC } from '@/app.config'
import { DEV_SEED } from '@/dev/devSeed'
import { registry } from '@/stores/notes'

let inFlight: Promise<void> | null = null

/** Open the store (once) from the dev seed and hydrate every collection. */
export function initApp(): Promise<void> {
  if (inFlight) {
    return inFlight
  }
  inFlight = (async () => {
    try {
      if (!hasStore()) {
        const store = await LocalStore.init({
          seed: DEV_SEED,
          collections: appConfig.collections
        })
        setLocalStore(store)
      }
      await hydrateAll(registry)
      useAppReady.getState().setReady()
      // Dev-sync: start WAS replication in the background AFTER the UI gate
      // opens, so a missing/unreachable server never blocks first paint.
      if (WAS_DEV_SYNC) {
        void import('@/dev/devSync')
          .then(({ startDevSync }) => startDevSync())
          .catch(err => console.warn('Dev-sync failed to start:', err))
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      useAppReady.getState().setError(message)
      throw cause
    }
  })()
  return inFlight
}
