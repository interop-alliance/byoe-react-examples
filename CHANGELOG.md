# Changelog

## 0.1.2 - TBD

### Added

- `examples/save-file` (Text Editor): a minimal single-document example app. The
  whole model is the text in one textbox, served by the library's new
  `useAppDocument` hook (`defineDocumentApp` in `src/app.config.ts` is the app's
  entire was-react wiring): fully functional local-first with no wallet or
  server, file export/import as a tagged JSON file, and an optional "Save to Web
  Spaces" wallet connect that carries the local text into a single granted
  sandbox collection. Ships its own offline Playwright suite.
- The repo is now a pnpm workspace (`.` plus `examples/*`); root `lint`, `fix`,
  and `format` cover the examples.
- `docs/guide.md`: the developer guide, walking the example tiers (what a tier-1
  single-document app looks like, what changes growing into tier 2, the shared
  session lifecycle, data rules, and the test-tier pattern).
- Both examples: a "CONNECTED to storage" chip next to the sync status chip
  while the session is connected, and a `SyncErrorDiagnostics` section (top
  center) while replication is in the error state, listing the likely reasons
  the remote WAS server stopped answering (server unreachable, access grant
  expired, or access grant revoked on the wallet side).

- Adoption on login: when the anonymous local replica holds data, the login page
  now offers the library's `AdoptDialog` -- bring the data into the connected
  storage (merged last-write-wins per document, then the anonymous replica is
  deleted) or set it aside on this device. Dev-connect adopts local data the
  same way, so the real-server test tier exercises the same migration path a
  wallet login drives.

### Changed

- The repo is now an examples workspace (`byoe-react-examples`) rather than a
  single template app: the notes app moved wholesale to `examples/notes` as its
  own package (`byoe-notes-example`), keeping its scripts and all four test
  tiers; the root package is now a private workspace shell holding the shared
  dev tooling (eslint, prettier, TypeScript) with fan-out
  `build`/`typecheck`/`test:*` scripts and per-example `dev:notes` /
  `dev:save-file`. Each example is independently copyable
  (`pnpm dlx degit interop-alliance/byoe-react-examples/examples/notes my-app`).
- The WAS and wallet browser test tiers are now self-contained -- no other
  checkouts needed: the WAS server boots from the `was-teaching-server` npm
  package (a notes devDependency) with its state in the git-ignored `.e2e/`
  directory (wiped per boot), and the wallet tier clones and installs freewallet
  into `.e2e/` on first run (`FREEWALLET_DIR` still points at a local checkout
  instead; `FREEWALLET_REF` pins a branch or tag).
- Ported to the was-react session state machine. Dev mode is now a local-first
  anonymous replica (an encrypted, fully usable local store with no login gate)
  rather than a separate bootstrap fork: the app config sets `onboarding`
  (`login-gated` in wallet mode, `local-first` in dev mode) and the library's
  `ProtectedRoute` handles both modes, so the route table is a single protected
  path.
- The app shell control is now status-driven: a connected session shows a "Log
  out" button opening the library's `LogoutDialog` (log out keeping or erasing
  the local replica); local mode shows a "Clear data" button opening
  `ClearDataDialog`.
- Dev-sync now drives the library's `connectWithGrants` path (loading the
  provisioned grants, then connecting under the dev seed), exercising the same
  connected-state sync path a wallet login drives.

### Fixed

- Each example now names its own local storage: `dbName` / `storageKeyPrefix`
  (`byoe-notes` and `text-editor`) instead of the library defaults, so the
  encrypted replica and the device/seed keys are per-app even when two apps are
  served from one origin. Notes passes its prefix to `getClientId` explicitly,
  since that function takes it per call rather than reading the app config.
- Each example's dev server is now pinned to its own port (notes 5173, save-file
  5174, matching each app's `APP_ORIGIN` and Playwright config) via
  `server.port` / `strictPort`. Previously neither pinned a port, so whichever
  example started first took 5173 and the second landed on 5174 -- and running
  them in either order left two apps sharing one origin, hence one encrypted
  local replica. The second app then failed to open the first one's database,
  leaving the session stuck in `boot` and the page stuck on "Loading...".

### Removed

- The npm publish workflow and the root package's npm packaging fields: the
  examples are copied (degit), not installed from npm, and the workspace root is
  private.
- The dev-mode router gate and the dev bootstrap/sync shims (open/hydrate and
  the bespoke replication wiring): the library's session store now owns opening,
  hydrating, and connecting.

## 0.1.0-0.1.1 - 2026-07-12

### Added

- Initial BYOE app template: a Vite + React + TypeScript SPA built on
  `@interop/was-react`.
- CHAPI wallet login (DID Auth) with a protected route and offline dev mode.
- An example WAS-backed "notes" collection with local-first encrypted storage
  and background sync.
- MUI app shell with sync status and reconnect UI.
- Three-tier test setup (offline/mocked, real WAS server, full wallet login)
  plus a Node unit tier.
- A dev provisioning script for syncing without a wallet.
