# byoe-react-examples

A pnpm workspace of example "Bring Your Own Everything" (BYOE) apps built on
`@interop/was-react` (Vite + React + TypeScript SPAs; CHAPI wallet login,
local-first encrypted storage, background sync to a WAS server) -- one example
per tier of app complexity, each independently copyable via degit. The library
owns the reusable plumbing (identity, login, session, encrypted replica, sync,
hooks, MUI components); the examples are thin app-specific shells around it.

## Repository layout

The workspace layout and per-example module map lives in @ARCHITECTURE.md --
read it before making changes.

## Commands

Root (fan-out across the workspace):

```
pnpm run dev:notes           # run the notes example (wallet mode)
pnpm run dev:save-file       # run the save-file example
pnpm run build               # per-example typecheck + Vite build
pnpm run typecheck
pnpm run lint                # eslint over examples (root config)
pnpm run fix                 # eslint --fix + prettier
pnpm run test:node           # per-example Vitest + fake-indexeddb
pnpm run test:browser        # per-example Playwright offline suites (CI)
pnpm run test:browser:was    # notes: against a real local WAS server
pnpm run test:browser:wallet # notes: full wallet login (local/manual)
pnpm run provision:dev       # notes: dev grants (SERVER_URL, default :3002)
```

Inside `examples/notes`: `pnpm dev` (wallet mode; `VITE_AUTH_MODE=dev` for
local-first dev mode) plus the same build/test scripts unprefixed.

## Conventions

Code style, formatting, and special-character conventions live in
@CONTRIBUTING.md -- follow them.

Repo-specific additions:

- pnpm; Node >= 24; ESM only.
- Keep app-agnostic logic in `@interop/was-react` rather than growing it here;
  each example stays the smallest honest app of its tier.
