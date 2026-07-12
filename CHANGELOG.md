# Changelog

## 0.1.0 - TBD

### Changed

- Scoped the package name to `@interop/byoe-react-template` (the unscoped
  `byoe-react-template` npm package is deprecated).

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
