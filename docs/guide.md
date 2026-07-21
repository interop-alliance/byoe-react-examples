# Building BYOE apps: a guide through the examples

This guide walks the [example apps](../examples) in order of ambition. The
examples are the spine: each section points at real files, and the diff between
the tier-1 and tier-2 examples is itself the answer to "what changes as my app
grows up?"

- [The tier ladder](#the-tier-ladder)
- [The session lifecycle every app shares](#the-session-lifecycle-every-app-shares)
- [Tier 1: one document (`examples/save-file`)](#tier-1-one-document-examplessave-file)
- [Growing up: from tier 1 to tier 2](#growing-up-from-tier-1-to-tier-2)
- [Tier 2: collections and wallet login (`examples/notes`)](#tier-2-collections-and-wallet-login-examplesnotes)
- [Data rules that apply everywhere](#data-rules-that-apply-everywhere)
- [Testing your app](#testing-your-app)

## The tier ladder

BYOE apps differ along several axes -- one resource vs many collections,
app-private vs well-known interop collections, how much the app does before
"Login with Wallet" -- but in practice those axes correlate into a ladder of
tiers, each a superset of the one below:

| Tier | Shape                                                                          | Example app                               | Library entry point                  |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------ |
| 1    | One app-private document, key-value read/write                                 | A text editor; an Excalidraw-style canvas | `defineDocumentApp` / `useAppDocument`  |
| 2    | Read/write CRUD on one or two well-known interop collections                   | A contacts manager; a notes app           | `createEntityStore` + `WasAppConfig` |
| 3    | Several well-known and app-specific collections, encrypted and public-readable | A microblogging client                    | (planned)                            |

The tiers are library _layers_, not different app architectures: a tier-1 app is
expressible without ever seeing entity stores, grants, or sync internals, and
moving up a tier means reaching for a lower-level library entry point -- not
rewriting your app.

## The session lifecycle every app shares

`@interop/was-react` models "not connected to a wallet yet" as a first-class
product state, not a developer mode. The session moves through four states:

- **`boot`** -- attempt to restore a persisted session, open the local encrypted
  store, hydrate. Both successor states are fully usable; render a splash or
  skeleton here.
- **`local`** -- fully functional with no wallet and no server: an encrypted
  local RxDB replica under an anonymous device-local identity. All hooks and
  stores work; there is just no sync. A tier-1 app may stay here forever.
- **`connected`** -- everything in `local`, plus wallet-derived identity,
  granted capabilities, and background replication to the user's Space.
- **`reconnect`** -- granted access expired or was revoked: the replica stays
  usable (reads and local writes), remote calls are paused until re-login.

"Login with Wallet" therefore _attaches_ sync and remote identity; it does not
gate the app -- unless you ask it to. Each app declares its onboarding style in
its config:

- `onboarding: 'local-first'` -- the router renders the app in the `local`
  state; connecting is an affordance inside the app (tier 1, and tier-2 apps
  that want "try before you log in").
- `onboarding: 'login-gated'` -- the library's `ProtectedRoute` sends
  not-connected users to your login page (classic tier-2 behavior).

Two consequences of taking the `local` state seriously:

- **Adoption.** Data created before connecting is real data. On the first login,
  the library offers to merge it into the newly granted collections
  (per-document last-writer-wins), or to set it aside on this device. The notes
  example wires this with `useHasLocalData` + `AdoptDialog`; the save-file
  example's connect button adopts silently (one document, nothing to ask about).
- **Vocabulary.** In `local` mode there is no identity to log out of, so apps
  should never label the reset action "Logout." The save-file example calls it
  **Clear Data**: it destroys the local replica after a confirm dialog that
  offers a download first. Keeping "log out" (detach identity) and "clear data"
  (destroy the replica) as visibly separate operations is part of the point of
  BYOE -- users learn where their data actually lives.

## Tier 1: one document (`examples/save-file`)

Text Editor is a one-textbox app whose entire model is that text. The whole
was-react wiring is one call in
[`app.config.ts`](../examples/save-file/src/app.config.ts):

```ts
export interface TextDocument {
  text: string
}

export const { config, registry, useAppDocument } =
  defineDocumentApp<TextDocument>({
    appName: 'Text Editor',
    appOrigin: APP_ORIGIN,
    document: {
      collectionId: 'text-editor-document',
      initial: { text: INITIAL_TEXT }
    },
    credential: {
      credentialType: 'TextEditorAppKey',
      vocabBase: 'urn:text-editor:vocab#'
    },
    dbName: 'text-editor',
    storageKeyPrefix: 'text-editor:'
  })
```

`main.tsx` spreads the returned `config` and `registry` into the standard
`WasSessionProvider`, and every component consumes the typed hook:

```ts
const { doc, update, status, exportFile, importFile, connect, disconnect } =
  useAppDocument()
```

- `doc` is the current document (`TextDocument`), falling back to
  `document.initial` once boot completes; `update(patch | fn)` merges and
  persists.
- `exportFile` / `importFile` move the document as a tagged JSON file, so the
  app is complete with zero WAS infrastructure -- the local / download / cloud
  triad users know from Excalidraw or draw.io.
- `connect()` runs a CHAPI wallet login requesting a grant for **exactly one
  collection** (the app's sandbox collection), so the wallet's consent screen
  shows a single legible request. The local document is adopted into the granted
  collection, and background sync takes over. `status` moves
  `'local' -> 'connected'` (or `'syncing'` / `'reconnect'`).

What the tier-1 developer never sees: entity stores, the store registry, grants,
replication internals. If your app is one document, this is the whole API -- the
rest of the example is editor code.

## Growing up: from tier 1 to tier 2

Diff the two examples and every difference is one of these five moves:

1. **One document becomes named collections.** `document: { collectionId }`
   becomes a `COLLECTIONS` list in a `WasAppConfig`, mapping each app-side `key`
   to a WAS collection `id`. Interop lives in those ids: `notes` is deliberately
   generic, shared by any app that speaks "notes," where tier 1's
   `text-editor-document` was deliberately app-private.
2. **`useAppDocument` becomes entity stores.** Each collection gets a
   `createEntityStore<T>(key)` (a zustand `Map<uuid, T>` hydrated from the
   encrypted replica) and a `StoreRegistry` entry wiring its `hydrate` /
   `upsert` / `drop` / `clear` handlers, so login, remote sync, and logout can
   drive it.
3. **LWW stamping becomes your job.** The `useAppDocument` facade stamped
   `updatedAt` / `clientId` for you; entity payloads must carry them explicitly
   (see [Data rules](#data-rules-that-apply-everywhere)).
4. **`connect()` becomes a login page.** With `onboarding: 'login-gated'`, the
   library's `ProtectedRoute` gates the app and your login page drives
   `useLogin` -- offering `AdoptDialog` when local data exists.
5. **The chrome grows.** A tier-2 app wants the `SyncStatusChip`, the
   `ReconnectBanner`, and an explicit logout -- the notes `AppShell` is the
   reference wiring.

If a step up the ladder ever requires substantially different _app_ code rather
than a different library entry point, that is a library gap -- file an issue
rather than working around it.

## Tier 2: collections and wallet login (`examples/notes`)

BYOE Notes is a CRUD app over one well-known collection. The moving parts, each
one file:

- [`src/app.config.ts`](../examples/notes/src/app.config.ts) -- env exports, the
  `COLLECTIONS` list, and the one `WasAppConfig`, including the `onboarding`
  knob (wallet mode is login-gated; dev mode is local-first).
- [`src/stores/notes.ts`](../examples/notes/src/stores/notes.ts) -- the `Note`
  type, its entity store, and the `StoreRegistry`.
- [`src/pages/LoginPage.tsx`](../examples/notes/src/pages/LoginPage.tsx) --
  CHAPI login via `useLogin`, with the adoption dialog when the anonymous
  replica holds data.
- [`src/pages/NotesPage.tsx`](../examples/notes/src/pages/NotesPage.tsx) --
  list/add/edit/delete against the store's `insert` / `update` / `remove` verbs;
  every write stamps the LWW fields.
- [`src/components/AppShell.tsx`](../examples/notes/src/components/AppShell.tsx)
  -- top bar with `SyncStatusChip`, `ReconnectBanner`, logout.
- [`src/App.tsx`](../examples/notes/src/App.tsx) -- the route table: `/login`
  outside the gate, everything else behind `ProtectedRoute`.

Dev mode (`VITE_AUTH_MODE=dev`) is not a parallel code path: it is the same app
in the `local` session state, optionally "connected" to a real WAS server
through provisioned dev grants (`pnpm run provision:dev` +
`VITE_WAS_DEV_SYNC=true`) -- which exercises the same adoption and sync path a
wallet login drives, with CHAPI bypassed.

The notes README has the full
[renaming walkthrough](../examples/notes/README.md#turning-this-example-into-a-new-app)
for turning the example into your own app.

## Data rules that apply everywhere

- **Every entity payload carries `updatedAt` (ISO timestamp) and `clientId`.**
  Sync resolves conflicts last-writer-wins on that pair; a payload missing them
  loses every conflict. The `useAppDocument` facade stamps them for you;
  entity-store apps stamp them on every insert and update (get the device id
  from the library's `getClientId()`).
- **Collection ids are the interop surface.** Use a generic, unprefixed id
  (`notes`, `contacts`) when you intend other apps to read the same data; use an
  app-named id (`text-editor-document`) for app-private sandbox data. The two
  examples show both: notes asks for the shared `notes` id, the editor keeps its
  document to itself.
- **Local storage names are the opposite of the interop surface.** `dbName` and
  `storageKeyPrefix` name the encrypted replica and the device/seed keys in
  *this browser*, so give every app its own. Left at the library defaults, two
  apps served from one origin (two examples on `localhost`, say) collide on a
  single database, and the second to open it dead-ends in `boot`. Pin a distinct
  dev-server port per app for the same reason.
- **Everything is encrypted client-side.** The WAS server stores opaque JWE
  envelopes; it can neither read nor search plaintext. This also means the key
  material for the anonymous `local` replica lives in browser storage -- on a
  shared machine, "Clear data" is the user's only real protection.
- **Ask only for the collections you use.** The wallet consent screen shows
  exactly what the app requests; the library builds the request from your
  configured collections and nothing else.

## Testing your app

Both examples ship the pattern worth copying -- test tiers ordered by
infrastructure cost:

1. **Node unit tests** (Vitest + `fake-indexeddb`) for stores and pure logic.
2. **Offline browser tests** (Playwright, dev/local mode): the whole UI against
   the encrypted local replica, no servers. This is the CI tier -- and for a
   tier-1 app it covers nearly everything, because the app is fully functional
   offline.
3. **WAS-backed browser tests** (notes only): boots a real local
   `was-teaching-server`, provisions dev grants, and exercises real replication,
   multi-device convergence, and adoption -- still no wallet in the loop.
4. **Wallet browser tests** (notes only, local/manual): the full CHAPI Login
   With Wallet flow against a local wallet and WAS server.

Root `pnpm run test:browser` runs each example's offline tier; the heavier tiers
run from `examples/notes` (see its
[testing docs](../examples/notes/README.md#testing)).
