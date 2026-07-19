/**
 * Serves the freewallet dev server for the wallet-login tier without
 * requiring a pre-existing checkout: uses FREEWALLET_DIR if set (a local
 * checkout), otherwise clones freewallet into the git-ignored
 * `.e2e/freewallet` on first run (pnpm install included) and reuses it after.
 * Delete `.e2e/freewallet` to force a fresh clone.
 *
 * Env:
 *   WALLET_PORT           port for the vite dev server (required)
 *   VITE_WAS_SERVER_URL   forwarded to the wallet build (set by the config)
 *   FREEWALLET_DIR        use this checkout instead of the cached clone
 *   FREEWALLET_REF        branch or tag to clone (default: default branch)
 */
import { existsSync } from 'node:fs'
import { execFileSync, spawn } from 'node:child_process'
import { join, resolve } from 'node:path'

const FREEWALLET_REPO = 'https://codeberg.org/interop-alliance/freewallet.git'

const port = process.env.WALLET_PORT
if (!port) {
  throw new Error('startWallet: WALLET_PORT is required')
}

const walletDir = process.env.FREEWALLET_DIR
  ? resolve(process.env.FREEWALLET_DIR)
  : resolve('.e2e/freewallet')

if (!existsSync(join(walletDir, 'package.json'))) {
  const ref = process.env.FREEWALLET_REF
  console.log(`Cloning freewallet into ${walletDir} ...`)
  execFileSync(
    'git',
    [
      'clone',
      '--depth',
      '1',
      ...(ref ? ['--branch', ref] : []),
      FREEWALLET_REPO,
      walletDir
    ],
    { stdio: 'inherit' }
  )
}
const viteBin = join(walletDir, 'node_modules', '.bin', 'vite')
if (!existsSync(viteBin)) {
  console.log('Installing freewallet dependencies ...')
  try {
    // --ignore-workspace: the cached clone lives inside this repo's pnpm
    // workspace, and without it pnpm would install THIS workspace instead.
    execFileSync('pnpm', ['install', '--ignore-workspace'], {
      cwd: walletDir,
      stdio: 'inherit'
    })
  } catch (err) {
    // pnpm can exit non-zero over ignored dependency build scripts (none of
    // which the dev-served wallet needs); only fail if vite did not land.
    if (!existsSync(viteBin)) {
      throw err
    }
    console.log('pnpm install reported a non-fatal error; continuing.')
  }
}

// Spawn vite from the clone's own bin dir so resolution can never escape
// upward into the enclosing workspace.
const child = spawn(
  viteBin,
  ['--cors', '--host', '--port', port, '--strictPort'],
  { cwd: walletDir, stdio: 'inherit' }
)
child.on('exit', code => process.exit(code ?? 1))
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => child.kill(signal))
}
