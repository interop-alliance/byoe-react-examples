# Changelog

## 0.1.2 - TBD

### Added

- Adoption on login: when the anonymous local replica holds data, the login
  page now offers the library's `AdoptDialog` -- bring the data into the
  connected storage (merged last-write-wins per document, then the anonymous
  replica is deleted) or set it aside on this device. Dev-connect adopts local
  data the same way, so the real-server test tier exercises the same migration
  path a wallet login drives.

### Changed

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

### Removed

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
