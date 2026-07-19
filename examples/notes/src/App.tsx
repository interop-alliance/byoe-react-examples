/**
 * App root: CssBaseline, the HashRouter, and the route table. The login page
 * sits outside the gate; the notes page renders behind the library's
 * `ProtectedRoute` (from `@interop/was-react/mui`) -- a thin onboarding switch
 * that renders the app in local-first mode and gates on a connected wallet in
 * login-gated mode -- inside the `AppShell` layout.
 *
 * When dev-connect is on (`WAS_DEV_SYNC`), `DevConnect` drives the store's
 * non-CHAPI `connectWithGrants` path once the anonymous local replica is open,
 * so the app reaches the same `connected` sync path a wallet login drives --
 * adopting (merging) any data already in the local replica as it connects.
 */
import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router'
import { CssBaseline } from '@mui/material'
import { useAuthStore, useSession } from '@interop/was-react'
import { ProtectedRoute } from '@interop/was-react/mui'
import { WAS_DEV_SYNC } from '@/app.config'
import { AppShell } from '@/components/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { NotesPage } from '@/pages/NotesPage'
import { runDevConnect } from '@/dev/devConnect'

/**
 * Dev-only: once boot has landed the anonymous `local` replica, connect under
 * the provisioned dev grants. A no-op render; fires once via `runDevConnect`'s
 * own guard.
 */
function DevConnect() {
  const store = useAuthStore()
  const { status } = useSession()

  useEffect(() => {
    if (status !== 'local') {
      return
    }
    void runDevConnect(store)
  }, [store, status])

  return null
}

export function App() {
  return (
    <>
      <CssBaseline />
      {WAS_DEV_SYNC && <DevConnect />}
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<NotesPage />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </>
  )
}
