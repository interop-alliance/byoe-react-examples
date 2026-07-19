/**
 * The app layout: a top bar with the app name, the library's `SyncStatusChip`
 * (offline / syncing / synced / error rollup), and a status-driven control --
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
  Container,
  IconButton,
  Toolbar,
  Tooltip,
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
          <SyncStatusChip />
          {connected ? (
            <Tooltip title="Log out">
              <IconButton
                color="inherit"
                aria-label="log out"
                onClick={() => setLogoutOpen(true)}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>
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
      <ReconnectBanner />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Outlet />
      </Container>
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
      <ClearDataDialog open={clearOpen} onClose={() => setClearOpen(false)} />
    </Box>
  )
}
