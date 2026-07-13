# Changelog

## Unreleased - TBD

### Fixed

- Dev bootstrap now un-caches a failed `initApp` attempt (resets the in-flight
  promise on error), so a retry re-runs initialization instead of getting the
  same rejected promise back forever.

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
