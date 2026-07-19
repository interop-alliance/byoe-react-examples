# Space Miner (single-document BYOE example)

The smallest useful shape of a BYOE app: the whole model is **one document** (a
game save file), served by `useDocument` from `@interop/was-react`. The app is
fully functional with no wallet and no server -- the save lives in an encrypted
local replica in the browser -- and grows capabilities from there:

- **Download / Load save**: the document moves as a plain JSON file
  (`was-document/v1`), so the app works with zero WAS infrastructure.
- **Save to Web Spaces**: a CHAPI wallet login requesting a grant for exactly
  one sandbox collection (`space-miner-save`). The local save is adopted into
  the granted collection and background sync keeps it replicated.
- **Clear data**: destroys the local replica (the local-first "reset" primitive
  -- there is no identity to log out of before connecting).

All of the identity, storage, and sync wiring is
`defineDocumentApp<SaveFile>({ ... })` in `src/app.config.ts`; the rest of the
app is one game component.

## Commands

```
pnpm dev              # run the game at http://localhost:5174
pnpm run build        # typecheck + Vite build
pnpm run typecheck
pnpm run test:browser # Playwright, offline (no wallet / server needed)
```

Linting runs from the repository root (`pnpm run lint`).
