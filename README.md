# BYOE React Examples

[![Node.js CI](https://github.com/interop-alliance/byoe-react-examples/workflows/CI/badge.svg)](https://github.com/interop-alliance/byoe-react-examples/actions?query=workflow%3A%22CI%22)

> Example apps for building "Bring Your Own Everything" (BYOE) apps on Wallet
> Attached Storage (WAS) with
> [`@interop/was-react`](https://npm.im/@interop/was-react): one example per
> tier of app complexity, each independently copyable as a starting point.

## Table of Contents

- [Background](#background)
- [The examples](#the-examples)
- [Getting started](#getting-started)
- [Starting your own app from an example](#starting-your-own-app-from-an-example)
- [The developer guide](#the-developer-guide)
- [Testing](#testing)
- [Repository layout](#repository-layout)
- [Contribute](#contribute)
- [License](#license)

## Background

"Bring Your Own Everything" is a way to build web apps with no backend that the
app owns: the user brings their own identity (a CHAPI wallet) and their own
storage (a WAS server), and the app keeps everything client-side encrypted in
that user-owned space -- local-first, synced in the background. The
[developer guide](docs/guide.md) and the
[notes example README](examples/notes/README.md) cover the model in depth.

BYOE apps come in tiers of ambition, and the library API is layered to match: an
app that is just "one document, saved locally, optionally backed up to the
user's Space" should never see grants parsing or sync internals, while a
multi-collection interop app gets the full machinery. Each example here is the
smallest honest app of its tier.

## The examples

| Tier | Example                                                    | Shape                                   | What it demonstrates                                                                                                                       |
| ---- | ---------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | [`examples/save-file`](examples/save-file) ("Space Miner") | One app-private document                | `useDocument`: local-first with no login, save-file download/load, optional "Save to Web Spaces" wallet connect that adopts the local data |
| 2    | [`examples/notes`](examples/notes) ("BYOE Notes")          | CRUD on a well-known interop collection | `createEntityStore` + entity registry, CHAPI wallet login, adoption of pre-login data, background sync, reconnect handling                 |

A tier-3 example (multi-collection interop with public-readable collections) is
planned once the underlying library support lands.

## Getting started

Prerequisites: **Node.js >= 24** and **pnpm** (the repo pins `pnpm@11.9.0`).

```
pnpm install          # installs every example (pnpm workspace)
pnpm run dev:save-file   # run the tier-1 game (no wallet or server needed)
pnpm run dev:notes       # run the tier-2 notes app (wallet mode)
```

Each example's README covers its own modes, environment variables, and server
prerequisites.

## Starting your own app from an example

Copy an example out of the workspace with
[degit](https://github.com/Rich-Harris/degit) -- each example is a
self-contained package:

```
pnpm dlx degit interop-alliance/byoe-react-examples/examples/notes my-app
cd my-app && pnpm install
```

Start from `save-file` if your app is a single document (an editor, a game, a
settings blob); start from `notes` if it manages collections of records. The
notes README has a
[step-by-step renaming guide](examples/notes/README.md#turning-this-example-into-a-new-app).

## The developer guide

[`docs/guide.md`](docs/guide.md) walks the tier ladder using the examples as the
spine: what a tier-1 app looks like, what changes when your app grows into tier
2, and how the session lifecycle (local-first, wallet connect, adoption,
reconnect) works across both.

## Testing

Root scripts fan out across the workspace:

```
pnpm run lint            # eslint over all examples (shared root config)
pnpm run typecheck       # per-example tsc
pnpm run build           # per-example production build
pnpm run test:node       # per-example Vitest suites
pnpm run test:browser    # per-example offline Playwright suites (CI tier)
pnpm run test:browser:was    # notes: against a real local WAS server
pnpm run test:browser:wallet # notes: full CHAPI wallet login (local/manual)
```

The offline browser tier is what CI runs. The WAS and wallet tiers are
self-contained too: the server comes from the `was-teaching-server` npm package,
and the wallet tier fetches freewallet on first run -- see the
[notes testing docs](examples/notes/README.md#testing).

## Repository layout

```
examples/
  save-file/   # tier 1: useDocument, local-first, optional connect
  notes/       # tier 2: wallet login + collection CRUD (the original template)
docs/
  guide.md     # the developer guide, walking the examples
```

The workspace root holds only shared dev tooling (eslint, prettier, TypeScript)
and CI; every example is a standalone Vite + React + TypeScript app with its own
dependencies and test suites.

## Contribute

PRs accepted. Keep app-agnostic logic in `@interop/was-react` rather than
growing it in the examples; each example should stay the smallest honest app of
its tier.

## License

[MIT License](LICENSE.md) (c) 2026 Interop Alliance.
