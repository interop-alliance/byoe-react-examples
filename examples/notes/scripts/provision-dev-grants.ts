/**
 * Dev grant provisioning (CHAPI bypassed): against a running
 * was-teaching-server, creates a dev Space plus the app's collections, and
 * delegates a per-collection read/write zcap to the app DID derived from the
 * dev seed. The signed grants land in a git-ignored JSON file the app loads
 * in dev-sync mode.
 *
 * Run (with the server already up on $SERVER_URL):
 *   pnpm run provision:dev
 *
 * Reads (all optional):
 *   SERVER_URL       WAS base URL (default http://localhost:3002)
 *   DEV_GRANTS_OUT   output path (default <repo>/public/dev-grants.local.json)
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { provisionDevGrants } from '@interop/was-react/dev'
import { COLLECTIONS } from '../src/app.config.ts'
import { DEV_SEED } from '../src/dev/devSeed.ts'

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3002'
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT_PATH =
  process.env.DEV_GRANTS_OUT ??
  join(repoRoot, 'public', 'dev-grants.local.json')

async function main(): Promise<void> {
  const result = await provisionDevGrants({
    serverUrl: SERVER_URL,
    seed: DEV_SEED,
    collections: COLLECTIONS.map(collection => collection.id),
    spaceName: 'BYOE Notes (dev)',
    outFile: OUT_PATH,
    log: console.log
  })
  console.log(`\nWrote ${result.grants.length} grants to ${OUT_PATH}`)
}

main().catch(err => {
  console.error('Provisioning failed:', err)
  process.exit(1)
})
