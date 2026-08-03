# Changelog

## 0.2.0 - TBD

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

### Fixed

- The notes example's dev-connect adoption path lost the local note
  nondeterministically: `runDevConnect`'s once-guard was set only after the
  grants fetch, so dev-mode double effects could enter it twice, and the
  underlying `connectWithGrants` raced the session provider's remount
  destroy/boot pair (fixed upstream in `@interop/was-react` 0.8.2, which
  serializes `connectWithGrants` onto the lifecycle chain). The guard is now
  claimed before the first await and released on the no-grants path.

### Changed

- An app now encrypts every private collection -- its own and the wallet-owned
  ones shared with it -- to a single key: its identity key-agreement key, the
  X25519 twin of its `did:key` controller. The per-collection keys derived from
  the master seed are gone, so `LocalStore.init` takes
  `{ keyAgreementKey, keyResolver }` (from `deriveIdentity`) instead of `seed`;
  the notes example's store test, which opens a `LocalStore` directly, derives
  them first. Apps on `createAuthStore` are unaffected. Both examples now
  depend on `@interop/was-react` `^0.8.1`, which carries the change; data
  written under the old per-collection keys does not decrypt.
- The `@interop/was-react` bump to `^0.8.1` also brings in the library's later
  releases: the BYOE wire vocabulary moved from the retired `urn:was:` scheme to
  the shared `https://w3id.org/byoe#` namespace (matching wallets renamed in
  lockstep; JSON keys unchanged), the collection-encryption "marker" surface was
  renamed to "encryption descriptor" (`LocalStore.init` is unchanged), and the
  app document loader now resolves `did:webvh` -- verified resolution, so a
  wallet may present a `did:webvh` VP holder or sign with a `did:webvh` key id
  and login verification still works. No example code changes were needed; the
  examples sit entirely on the high-level hooks. `was-teaching-server` (the
  notes example's test backend) is bumped to `^0.16.1` to match.
- `docs/guide.md`: the "data rules" section now describes how an app reads a
  collection it does not own. A matching collection id yields capabilities on the
  same collection but not the ability to decrypt it; access is a separate,
  explicit grant declared in `WasAppConfig.sharedCollections`, which adds a
  `https://w3id.org/byoe#shared-collection` descriptor with a read-only action set to the login
  request and fuses a read capability with an entry in the collection's key-epoch
  roster. The recipient key is derived from the app's `did:key` controller and
  never transmitted, reads go through a `SharedCollectionReader` rather than
  replication, and a wallet that predates the descriptor type fails closed. The
  guide also states the ceiling: removing access stops future reads but cannot
  take back what was already read, and resources written before a collection's
  first share stay sealed to the owner alone.
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
