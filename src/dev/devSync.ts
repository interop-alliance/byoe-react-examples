/**
 * Dev-sync bootstrap (CHAPI bypassed): when dev-sync is on, the app fetches a
 * locally provisioned grants file, rebuilds the delegated remote store from
 * those zcaps and the dev seed's ZcapClient, and starts background
 * replication. This stands in for the Login-With-Wallet flow: there the
 * grants arrive over CHAPI; here they are minted by `pnpm run provision:dev`
 * against a running was-teaching-server.
 */
import {
  createSyncController,
  deriveIdentity,
  parseGrants,
  patchFromChange,
  requireStore,
  startWasSync,
  type IZcap
} from '@interop/was-react'
import { appConfig, WAS_DEV_GRANTS_URL } from '@/app.config'
import { DEV_SEED } from '@/dev/devSeed'
import { registry } from '@/stores/notes'

/**
 * Fetches and parses the dev grants file. Returns `null` (with a warning)
 * when it is missing or malformed, so a not-yet-provisioned dev environment
 * degrades to offline-only rather than erroring the whole bootstrap.
 */
async function loadDevGrants(): Promise<IZcap[] | null> {
  try {
    const response = await fetch(WAS_DEV_GRANTS_URL, { cache: 'no-store' })
    if (!response.ok) {
      console.warn(
        `Dev grants not available at "${WAS_DEV_GRANTS_URL}" (status ${response.status}); running offline.`
      )
      return null
    }
    const body = (await response.json()) as { grants?: IZcap[] } | IZcap[]
    const grants = Array.isArray(body) ? body : body.grants
    if (!grants || grants.length === 0) {
      console.warn('Dev grants file has no grants; running offline.')
      return null
    }
    return grants
  } catch (err) {
    console.warn('Failed to load dev grants; running offline.', err)
    return null
  }
}

let started = false

/**
 * Starts dev-sync: loads grants, builds the remote store, and starts
 * replication with reactive store patching. Idempotent and best-effort --
 * any failure leaves the app in offline mode.
 */
export async function startDevSync(): Promise<void> {
  if (started) {
    return
  }
  const grants = await loadDevGrants()
  if (!grants) {
    return
  }
  started = true

  const parsed = parseGrants(grants)
  const { zcapClient } = await deriveIdentity({ seed: DEV_SEED })
  await startWasSync({
    parsed,
    zcapClient,
    localStore: requireStore(),
    syncController: createSyncController({
      collections: appConfig.collections,
      ...(appConfig.sync && { sync: appConfig.sync })
    }),
    onRemoteChange: (key, event) => {
      void patchFromChange(registry, key, event)
    }
  })
}
