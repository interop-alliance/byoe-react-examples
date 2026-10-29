# Changelog

## 0.4.0 - TBD

### Changed

- Both examples: upgrade `@interop/was-react` to `^0.31.0` (was-client 0.99.1,
  was-sync 0.10.1). App code is unchanged: the examples never imported
  `restoreAppSession`, `RestoredAppSession`, `snapshotWipeTargets`, or
  `WipeTargets`, which this release renames or reshapes.
- Notes: the wallet tier hands freewallet the WAS server's Spaces Repository URL
  (`<WAS_URL>/spaces/`) as `VITE_WAS_SERVER_URL`, since freewallet 0.45 derives
  the base URL from it and refuses a bare base URL at startup.
- Workspace: a pnpm `overrides` entry pins `@interop/zcap` to `^11.4.0`.
  was-client 0.99.1 imports `isValidTarget` from `@interop/zcap` at runtime but
  declares it only as a devDependency, so without the override pnpm hoisted the
  11.3.3 that `was-teaching-server` pulls in and the Vite build and the Node
  tests failed on the missing export. Drop the override once was-react follows a
  was-client that lists `@interop/zcap` under `dependencies`.
- Both examples: upgrade `@interop/was-react` to `^0.30.0` (was-client 0.97,
  was-sync 0.10). `WasClient` now takes the server's Spaces Repository URL, so
  the notes provisioning script hands `provisionDevGrants`
  `<SERVER_URL>/spaces/` while `SERVER_URL` itself stays the server's base URL.
  The persisted session record now stores that base URL under `baseUrl` in place
  of `serverUrl`, so a browser that ran an earlier build is logged out once on
  reload and logs in again. App code is otherwise unchanged.
- Both examples: upgrade `@interop/was-react` to `^0.28.0` (was-client 0.96,
  was-sync 0.9). App code is unchanged: the examples build no client from a
  zcap, inspect no grant's `allowedAction`, classify no denied read, and never
  imported `isAuthError` or `remoteDescriptorSource`. `rxdb` is now an optional
  peer of the library; both examples already list it as a direct dependency.
  Every `edv` collection is now read through a verifying descriptor source
  checked against the Space owner's did:webvh log, so dev-connect does more
  round trips before the connected replica opens. The replica schema changed
  again (server write stamp, row-level `writerId`), so a browser that ran an
  earlier build must clear its local data and log in again once.
- Notes: the node store test's encryption-at-rest check scans every IndexedDB
  object store on fake-indexeddb (anchored on the public `envelopeIdFor`)
  instead of reaching the RxDB collection through `rxCollection`, which is
  internal from 0.28.0 on.
- Notes: the real-server replication specs wait for the synced state before
  writing. A write issued while dev-connect swaps the anonymous replica for the
  connected one has no attached store and rejects.
- Notes: the wallet tier's three ports read `APP_E2E_PORT`, `WALLET_E2E_PORT`,
  and `WAS_E2E_PORT` (defaults unchanged), so a run can sidestep a port another
  checkout holds.
- Notes: upgrade `was-teaching-server` to `^0.42.2`, which answers a Resource
  write with the stamped body was-sync 0.9's push ack reads.
  `test/lib/startWasServer.ts` opens its backend through the static
  `FileSystemBackend.open()` factory, since the constructor is protected from
  0.40.0 on.
- Both examples: upgrade `@interop/was-react` to `^0.14.0`. The entity store's
  persisted write verbs (`insert` / `update` / `upsert`) now stamp the
  last-write-wins fields `updatedAt` / `writerId` themselves.
- Notes: drop the hand-stamping of `updatedAt` / `writerId` and the `writerId`
  threading at write sites in `NotesPage`. The fields stay on the `Note` type
  (stored rows carry them).
- Notes: the node store test installs a writer id with `setWriterId` (it drives
  `setLocalStore` directly, so no session store installs one) and asserts the
  stamps the verbs mint rather than caller-supplied values.
- Docs: the guide and the notes README state the callee guarantee -- apps never
  stamp the LWW fields; `useSession().writerId` is display/debug only.
- Both examples: upgrade `@interop/was-react` to `^0.16.0`. Notes imports
  `mintRecordEncryption` from it (the root entry now re-exports it beside
  `LocalStore`) and drops the test-only `@interop/wallet-core` devDependency.
- Both examples: upgrade `@interop/was-react` to `^0.20.1`. App code is
  unchanged. The notes store test attaches its replica through a
  `StorageContext`, replacing the removed `setLocalStore` / `setWriterId`
  holders.
- Notes: bump the `was-teaching-server` devDependency to `^0.25.1`, which
  verifies the `eddsa-jcs-2022` zcap proofs was-react 0.20 signs with.
- Both examples: upgrade `@interop/was-react` to `^0.22.2`. App code is
  unchanged. The replica schema changed in 0.21 with no migration, so an
  existing local replica must be cleared once (clear local data, log in again).
- Notes: bump the `was-teaching-server` devDependency to `^0.29.0`, which reads
  a public collection's equality indexes from the `plaintext.indexes` member
  was-react 0.22.1 declares them under.
- Both examples: raise the `rxdb` peer to `^17.5.0`. Under 17.4 the Dexie
  storage never evicted a closed connection from its name cache, so a
  logout-and-erase followed by a login in the same page reopened the replica on
  a closed Dexie instance and failed with `DatabaseClosedError` (rxdb #8793,
  fixed in 17.5.0).
- Both examples: upgrade `@interop/was-react` to `^0.24.0`, which speaks WAS
  v0.5 (a collection's encryption descriptor, public `indexes`, and encrypted
  `custom` envelope live on one Collection Metadata object). App code is
  unchanged. A server still on WAS v0.4 no longer works.
- Notes: bump the `was-teaching-server` devDependency to `^0.34.0`, which serves
  the Collection Metadata object and admits its writes under per-collection
  grants.

### Fixed

- Notes: name its own local storage (`dbName: 'byoe-notes'`,
  `storageKeyPrefix: 'byoe-notes:'`) instead of inheriting the library defaults.
  `clearLocalData()` sweeps every IndexedDB database under `dbName`, so a
  default-configured app clearing its data would also erase the replica of
  another default-configured was-react app on the same origin. Changing the base
  name orphans an existing install's data (the replica is named per controller
  DID beneath it); acceptable for an example app.

## 0.3.0 - 2026-08-12

### Changed

- Both examples: upgrade `@interop/was-react` to `^0.13.0` and adopt the App
  Connect `appUrl` profile. Each app configures an `appUrl` -- its canonical
  URL, which names the application within its origin, so the app-key identity is
  scoped to (user, origin, `appUrl`) -- in place of the removed
  `credential: { credentialType, vocabBase }`: `http://localhost:5173/notes` for
  notes and `http://localhost:5174/text-editor` for the text editor, both
  overridable with `VITE_APP_URL`.
- Notes: the LWW attribution label is `writerId` (`getWriterId()`), renamed from
  `clientId` / `getClientId()`; the `Note` payload field follows.
- Notes: the node test opens its replica with an epoch-bearing encryption
  descriptor per collection (epoch-from-birth), minted with wallet-core's
  `mintRecordEncryption`.

## 0.2.1 - TBD

### Changed

- Both examples: upgrade `@interop/was-react` to `^0.10.0` (grant requests and
  required actions are now capped at the App Connect descriptor class ceilings;
  `0.10.1` fixes a logout racing the post-reload remount churn). No app code
  changes.

## 0.2.0 - 2026-08-03

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
  them first. Apps on `createAuthStore` are unaffected. Both examples now depend
  on `@interop/was-react` `^0.8.1`, which carries the change; data written under
  the old per-collection keys does not decrypt.
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
  collection it does not own. A matching collection id yields capabilities on
  the same collection but not the ability to decrypt it; access is a separate,
  explicit grant declared in `WasAppConfig.sharedCollections`, which adds a
  `https://w3id.org/byoe#shared-collection` descriptor with a read-only action
  set to the login request and fuses a read capability with an entry in the
  collection's key-epoch roster. The recipient key is derived from the app's
  `did:key` controller and never transmitted, reads go through a
  `SharedCollectionReader` rather than replication, and a wallet that predates
  the descriptor type fails closed. The guide also states the ceiling: removing
  access stops future reads but cannot take back what was already read, and
  resources written before a collection's first share stay sealed to the owner
  alone.
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
