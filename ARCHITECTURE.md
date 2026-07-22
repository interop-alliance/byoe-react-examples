# Architecture

The repository layout and module map for the byoe-react-examples workspace. For
contribution conventions see [CONTRIBUTING.md](CONTRIBUTING.md); for agent-facing
rules (commands, tests, repo-specific dos and don'ts) see [AGENTS.md](AGENTS.md).

## Repository layout

- `examples/save-file/` -- tier 1 ("Text Editor"): one app-private document via
  `defineDocumentApp`/`useAppDocument`, local-first, file export/import, optional
  "Save to Web Spaces" wallet connect. Offline Playwright suite only.
- `examples/notes/` -- tier 2 ("BYOE Notes", the original template app):
  - `src/app.config.ts` -- env-var exports and the one `WasAppConfig` (app name,
    credential type/vocab, `COLLECTIONS`, `onboarding` mode). First stop when
    renaming into a new app.
  - `src/stores/notes.ts` -- the example entity store (`createEntityStore`) plus
    the `StoreRegistry` the rehydrate mechanism drives.
  - `src/dev/` -- `devSeed.ts` (fixed public dev seed) and `devConnect.ts`
    (CHAPI-bypassed `connectWithGrants` from a provisioned grants file).
  - `src/components/AppShell.tsx` -- top bar, `SyncStatusChip`,
    `ReconnectBanner`, status-driven logout / clear-data.
  - `src/pages/` -- `LoginPage` (CHAPI login + `AdoptDialog`) and `NotesPage`.
  - `scripts/provision-dev-grants.ts` -- provisions a dev Space, collections,
    and delegated zcaps against a running was-teaching-server.
  - `playwright.config.ts` (offline/mocked, CI), `playwright.was.config.ts`
    (real WAS server), `playwright.wallet.config.ts` (full wallet login), and
    `test/` tiers, plus Node unit tests via Vitest. The WAS server boots from
    the `was-teaching-server` npm package (`test/lib/startWasServer.ts`, state
    in git-ignored `.e2e/`); the wallet tier needs a local freewallet checkout
    named by `FREEWALLET_DIR` (`test/lib/startWallet.ts`).
- `docs/guide.md` -- the developer guide, walking the example tiers.
- Root -- shared dev tooling only (eslint per-example blocks, prettier,
  TypeScript, CI) plus fan-out scripts; the root package is private.
