/**
 * The app layout: a top bar with the app name, the library's `SyncStatusChip`
 * (offline / syncing / synced / error rollup), and a logout button (wallet
 * mode only), with the `ReconnectBanner` (shown when granted access nears
 * expiry) above the routed page content.
 */
import { Outlet, useNavigate } from 'react-router'
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import { useLogout } from '@interop/was-react'
import { ReconnectBanner, SyncStatusChip } from '@interop/was-react/mui'
import { AUTH_MODE } from '@/app.config'

export function AppShell() {
  const logout = useLogout()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            BYOE Notes
          </Typography>
          <SyncStatusChip />
          {AUTH_MODE === 'wallet' && (
            <Tooltip title="Log out">
              <IconButton
                color="inherit"
                aria-label="log out"
                onClick={() => void handleLogout()}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>
      <ReconnectBanner />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
