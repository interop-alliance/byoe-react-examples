/**
 * The app layout: a top bar with the app name, the library's `SyncStatusChip`
 * (local-only / syncing / synced / error rollup), and a status-driven control --
 * a "Log out" button (opening `LogoutDialog`) when connected, or a "Clear data"
 * button (opening `ClearDataDialog`) in local mode -- with the `ReconnectBanner`
 * (shown when granted access nears expiry) above the routed page content.
 */
import { useState } from 'react'
import { Outlet } from 'react-router'
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Toolbar,
  Typography
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { useSession } from '@interop/was-react'
import {
  ClearDataDialog,
  LogoutDialog,
  ReconnectBanner,
  SyncStatusChip
} from '@interop/was-react/mui'
import { SyncErrorDiagnostics } from './SyncErrorDiagnostics'

/**
 * The layout route wrapper: renders the chrome around the routed page
 * (`Outlet`). The top-bar control is status-driven -- connected (including the
 * `reconnect` warning state) offers "Log out", local mode offers "Clear data"
 * -- and both dialogs stay mounted so the library owns their behavior; this
 * component only opens them.
 */
export function AppShell() {
  const { status } = useSession()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const connected = status === 'connected' || status === 'reconnect'

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            BYOE Notes
          </Typography>
          {status === 'connected' && (
            <Chip
              label="CONNECTED to storage"
              color="success"
              size="small"
              data-testid="connected-chip"
            />
          )}
          <SyncStatusChip />
          {connected ? (
            <Button
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={() => setLogoutOpen(true)}
            >
              Log out
            </Button>
          ) : (
            <Button
              color="inherit"
              onClick={() => setClearOpen(true)}
              data-testid="clear-data-button"
            >
              Clear data
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <SyncErrorDiagnostics />
      <ReconnectBanner />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Outlet />
      </Container>
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
      <ClearDataDialog open={clearOpen} onClose={() => setClearOpen(false)} />
    </Box>
  )
}
