/**
 * App root: CssBaseline, the HashRouter, and the route table. The login page
 * sits outside the gate; the notes page renders behind the wallet-mode
 * `ProtectedRoute` (from `@interop/was-react/mui`) or the dev-mode `DevGate`,
 * inside the `AppShell` layout.
 */
import { HashRouter, Route, Routes } from 'react-router'
import { CssBaseline } from '@mui/material'
import { ProtectedRoute } from '@interop/was-react/mui'
import { AUTH_MODE } from '@/app.config'
import { AppShell } from '@/components/AppShell'
import { DevGate } from '@/components/DevGate'
import { LoginPage } from '@/pages/LoginPage'
import { NotesPage } from '@/pages/NotesPage'

export function App() {
  return (
    <>
      <CssBaseline />
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={AUTH_MODE === 'wallet' ? <ProtectedRoute /> : <DevGate />}
          >
            <Route element={<AppShell />}>
              <Route index element={<NotesPage />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </>
  )
}
