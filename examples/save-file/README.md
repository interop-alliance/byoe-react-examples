# Text Editor (single-document BYOE example)

The smallest useful shape of a BYOE app: the whole model is **one document**
(the text in a single textbox), served by `useDocument` from
`@interop/was-react`. The app is fully functional with no wallet and no server
-- the text lives in an encrypted local replica in the browser -- and grows
capabilities from there:

- **Export / Import file**: the document moves as a plain JSON file
  (`was-document/v1`), so the app works with zero WAS infrastructure.
- **Save to Web Spaces**: a CHAPI wallet login requesting a grant for exactly
  one sandbox collection (`text-editor-document`). The local text is adopted
  into the granted collection and background sync keeps it replicated.
- **Clear Data**: destroys the local replica (the local-first "reset" primitive
  -- there is no identity to log out of before connecting).

All of the identity, storage, and sync wiring is
`defineDocumentApp<TextDocument>({ ... })` in `src/app.config.ts`; the rest of
the app is one editor component.

## Commands

```
pnpm dev              # run the editor at http://localhost:5174
pnpm run build        # typecheck + Vite build
pnpm run typecheck
pnpm run test:browser # Playwright, offline (no wallet / server needed)
```

Linting runs from the repository root (`pnpm run lint`).
