# BYOE Notes _(tier-2 example)_

> A minimal, working "Bring Your Own Everything" (BYOE) app on Wallet Attached
> Storage: a Vite + React + TypeScript SPA with DID-Auth login via a CHAPI
> wallet, local-first encrypted storage, and background sync, built on
> [`@interop/was-react`](https://npm.im/@interop/was-react).

This is the **tier-2** example in the [byoe-react-examples](../../README.md)
workspace: a read/write app over a well-known interop collection (`notes`), with
wallet login and background replication. It is also the recommended starting
template for a new BYOE app -- see
[Turning this example into a new app](#turning-this-example-into-a-new-app).

## Table of Contents

- [Background](#background)
- [What is in this example](#what-is-in-this-example)
- [Install](#install)
- [Usage](#usage)
- [Turning this example into a new app](#turning-this-example-into-a-new-app)
- [Testing](#testing)
- [Contribute](#contribute)
- [License](#license)

## Background

"Bring Your Own Everything" (BYOE) is a way to build web apps with no backend
that the app owns. The user brings their own identity (a wallet) and their own
storage (Wallet Attached Storage, WAS), and the app stores everything encrypted
in that user-owned space. The app is a Relying Party: it authenticates via
"Login With Wallet" (CHAPI) and reads and writes the user's WAS space using
wallet-delegated authorization capabilities (zcaps). It never owns the space,
never holds the wallet's root key, and invokes only the zcaps the wallet grants
it.

"Bring Your Own Storage" (BYOS) is the storage half of that model. Every
collection is encrypted client-side as an Encrypted Data Vault (EDV): the WAS
server only ever sees opaque JWE envelopes and can neither read nor search the
plaintext. Data is local-first -- a local RxDB (IndexedDB) database holds the
encrypted envelopes and replicates them to WAS in the background. The app works
fully offline; sync resumes on reconnect.

This example is a minimal, working BYOE app that wires all of that up through
`@interop/was-react`, which owns the reusable plumbing (identity derivation, the
CHAPI login flow, the session lifecycle, the encrypted local replica, WAS
replication, and the React hooks and MUI components). For the depth on those
pieces -- the login flow, session lifecycle, and sync architecture -- see the
[`@interop/was-react` README](https://npm.im/@interop/was-react). This document
covers what the example ships and how to make it your own.

## What is in this example

- A **login page** (`src/pages/LoginPage.tsx`) driving DID-Auth login through
  CHAPI: one "Login with wallet" button, a per-phase progress line, and an error
  alert. When the anonymous local replica already holds data, the login flow
  offers the library's `AdoptDialog`: bring that data into the connected
  storage, or set it aside on this device.
- A **protected route**: the library's `ProtectedRoute` (from
  `@interop/was-react/mui`), a thin switch over the app's `onboarding` config --
  `login-gated` (wallet mode) gates the app behind login; `local-first` (dev
  mode) renders the app immediately against the anonymous local replica.
- One example **WAS-backed "notes" collection** (`src/pages/NotesPage.tsx` +
  `src/stores/notes.ts`): list, add, edit, and delete notes, read from an
  in-memory store hydrated from the encrypted local replica and replicated to
  WAS in the background.
- An **MUI app shell** (`src/components/AppShell.tsx`): a top bar with the app
  name, the library's `SyncStatusChip` (local-only / syncing / synced / error), a
  logout button, and the `ReconnectBanner` shown when granted access nears
  expiry.
- A **dev provisioning script** (`scripts/provision-dev-grants.ts`) for syncing
  against a local WAS server without a wallet in the loop, and a **three-tier
  test setup** (see [Testing](#testing)).

## Install

### Prerequisites

- **Node.js >= 24** and **pnpm** (the repo pins `pnpm@11.9.0`).
- For real background sync, a **WAS server** --
  [`was-teaching-server`](https://github.com/interop-alliance/) run locally.
- For wallet login, a **CHAPI wallet** -- for example
  [`freewallet`](https://github.com/interop-alliance/), or any CHAPI wallet
  reachable through the [authn.io](https://authn.io) mediator.

### Setup

From the workspace root (installs every example):

```
pnpm install
```

## Usage

All commands below run from this directory (`examples/notes`).

### Auth modes

The app runs in one of two auth modes, selected by `VITE_AUTH_MODE`:

- **Wallet mode (default).** `pnpm dev` serves the login page and gates the app
  behind Login With Wallet. This needs a CHAPI wallet and a WAS server to
  complete a login and sync.

  ```
  pnpm dev
  ```

- **Offline dev mode.** `VITE_AUTH_MODE=dev pnpm dev` skips the login gate and
  boots straight into the anonymous local replica (the library's `local` session
  state): fully functional, encrypted at rest, no wallet, no server, no sync.
  Good for developing screens.

  ```
  VITE_AUTH_MODE=dev pnpm dev
  ```

- **Dev mode with sync.** Dev mode plus `VITE_WAS_DEV_SYNC=true` connects to a
  running WAS server without a wallet, using a locally provisioned grants file
  keyed by a fixed public dev seed -- adopting (merging) any data already in the
  local replica, the same migration path a wallet login drives. First, with a
  `was-teaching-server` running, provision the grants:

  ```
  pnpm run provision:dev
  ```

  This creates a dev Space and the app's collections on the server (default
  `http://localhost:3002`, override with `SERVER_URL`) and writes the delegated
  zcaps to the git-ignored `public/dev-grants.local.json`. Then run:

  ```
  VITE_AUTH_MODE=dev VITE_WAS_DEV_SYNC=true pnpm dev
  ```

> The fixed dev seed is public. Never use dev-sync mode (or that seed) for
> anything real: anything encrypted under it is readable by anyone.

### Environment variables

All are optional; see `src/app.config.ts` for the defaults.

| Variable                  | Default                  | Purpose                                                            |
| ------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `VITE_AUTH_MODE`          | `wallet`                 | `wallet` (login-gated) or `dev` (local-first, no login gate).      |
| `VITE_APP_ORIGIN`         | `http://localhost:5173`  | This app's origin; the CHAPI anti-phishing binding on the app key. |
| `VITE_WAS_DEV_SYNC`       | `false`                  | Dev mode only: replicate to WAS using a provisioned grants file.   |
| `VITE_WAS_DEV_GRANTS_URL` | `/dev-grants.local.json` | Where the app fetches the dev grants JSON from.                    |
| `VITE_WAS_SYNC_RETRY_MS`  | (library default)        | Replication retry backoff, in ms.                                  |
| `VITE_WAS_SYNC_POLL_MS`   | (library default)        | Periodic re-sync interval, in ms.                                  |

### Other scripts

```
pnpm run build       # typecheck, then Vite production build
pnpm run typecheck   # tsc --noEmit
```

Linting and formatting run at the workspace root (`pnpm run lint`,
`pnpm run fix`), which covers every example.

## Turning this example into a new app

Copy this directory out of the workspace as a standalone project:

```
pnpm dlx degit interop-alliance/byoe-react-examples/examples/notes my-app
cd my-app && pnpm install
```

(The copied `package.json` is self-contained; lint/format configs from the
workspace root are not included -- add your own or copy the root
`eslint.config.js` and `prettier.config.js`.)

Then, to turn "BYOE Notes" into your own app:

1. **`package.json`** -- change `name` and `description`.
2. **`src/app.config.ts`** -- set `appConfig.appName`, the
   `credential.credentialType` and `credential.vocabBase` (a unique credential
   type and vocab URI for your app's seed credential), and the `COLLECTIONS`
   list (see step 5).
3. **`index.html`** -- change the `<title>`.
4. **UI strings** -- replace the "BYOE Notes" text in
   `src/components/AppShell.tsx` and `src/pages/LoginPage.tsx`.
5. **Replace the notes collection with your own.** Each collection needs three
   things:
   - a `{ key, id }` entry in `COLLECTIONS` in `src/app.config.ts` (the app-side
     `key` maps to the WAS collection `id`, a deliberately unprefixed, generic
     name shared across interoperable apps);
   - an **entity store** created with `createEntityStore<T>(key)` (see
     `src/stores/notes.ts`);
   - a **registry entry** wiring that store's `hydrate` / `patch` / `drop` /
     `replaceAll` handlers into the exported `StoreRegistry`.

   Then build a page against your store's `insert` / `update` / `remove` verbs,
   modeled on `src/pages/NotesPage.tsx`, and route to it in `src/App.tsx`.

   Every entity payload MUST carry `updatedAt` (ISO timestamp) and `clientId`
   (from the library's `getClientId()`), stamped on every insert and update:
   remote conflicts are resolved last-writer-wins on that pair, and a payload
   without them loses every conflict to the server copy.

## Testing

The example has three browser test tiers plus a Node unit tier. The first two
browser tiers are self-contained (the WAS server comes from the
`was-teaching-server` npm package); the wallet tier additionally needs a local
freewallet checkout. The offline tier is the CI-suitable default.

```
pnpm run test:node          # Vitest + fake-indexeddb, Node (no browser)
pnpm run test:browser       # Playwright, offline/mocked dev mode; CI-suitable
pnpm run test:browser:was   # Playwright against a real local WAS server
pnpm run test:browser:wallet # Playwright full wallet login flow; local/manual
```

- **`test:node`** runs the Vitest suite against `fake-indexeddb`. No browser or
  server needed.
- **`test:browser`** (the default `playwright.config.ts`) serves the app in
  offline dev mode and drives the UI against the local encrypted replica only.
  No other checkouts or servers required.
- **`test:browser:was`** (`playwright.was.config.ts`) boots a local
  `was-teaching-server` from the npm package (a devDependency; server state goes
  to the git-ignored `.e2e/`, wiped per run), provisions dev grants, and
  exercises real replication in dev-sync mode.
- **`test:browser:wallet`** (`playwright.wallet.config.ts`) boots the WAS server
  the same way, plus a `freewallet` dev server from a local checkout: set
  `FREEWALLET_DIR` to its path (dependencies are installed on first use), then
  the full Login With Wallet flow runs. This is a local/manual tier, not for
  CI.

## Contribute

PRs accepted. If editing this README, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.
Keep app-agnostic logic in `@interop/was-react` rather than growing it here.

## License

[MIT License](../../LICENSE.md) (c) 2026 Interop Alliance.
