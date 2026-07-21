/**
 * Login With Wallet: one button driving the library's CHAPI login flow, with
 * a progress line per flow phase and an error alert. A connected visitor is
 * bounced straight to the app.
 *
 * If the anonymous `local` replica already holds data (a `useHasLocalData`
 * check at click time), the button opens the library's `AdoptDialog` -- which
 * runs the login itself with the chosen adoption -- instead of logging in
 * directly.
 */
import { useState } from 'react'
import { Navigate } from 'react-router'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography
} from '@mui/material'
import WalletIcon from '@mui/icons-material/AccountBalanceWallet'
import { useHasLocalData, useLogin } from '@interop/was-react'
import { AdoptDialog } from '@interop/was-react/mui'

/**
 * Human-readable copy per `useLogin` phase; an unknown phase falls back to the
 * raw phase key in the render below.
 */
const PHASE_LABELS: Record<string, string> = {
  connecting: 'Contacting your wallet...',
  verifying: 'Verifying the wallet response...'
}

/**
 * The login screen: one card with the "Login with wallet" button, the
 * in-flight phase line, and the error alert. Renders only while not
 * connected -- a connected visitor (including one whose login just resolved)
 * is redirected to the app by the `Navigate` below.
 */
export function LoginPage() {
  const { login, authenticating, status, phase, error } = useLogin()
  const hasLocalData = useHasLocalData()
  const [adoptOpen, setAdoptOpen] = useState(false)
  const busy = authenticating

  if (status === 'connected') {
    return <Navigate to="/" replace />
  }

  /**
   * On click, branch on whether the anonymous replica holds data: if it does,
   * let the user choose what happens to it via the dialog (which runs the
   * login); otherwise log in directly. `login` resolves `{ firstRun }` on a
   * connected outcome (the router then navigates to the app), `null` on a
   * cancelled wallet popup, and rejects on a genuine failure -- whose message
   * the library mirrors into `error`, rendered as the alert below, so the
   * catch just keeps the rejection handled.
   */
  async function handleLogin(): Promise<void> {
    if (await hasLocalData()) {
      setAdoptOpen(true)
      return
    }
    try {
      await login()
    } catch {
      // Surfaced via the `error` alert.
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 2
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 420, width: '100%' }}>
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Typography variant="h5" component="h1">
            BYOE Notes
          </Typography>
          <Typography color="text.secondary" align="center">
            Your notes live in your own wallet-attached storage, encrypted so
            only you can read them. Log in with your digital wallet to begin.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={busy ? <CircularProgress size={20} /> : <WalletIcon />}
            onClick={() => void handleLogin()}
            disabled={busy}
          >
            {busy ? 'Connecting your wallet...' : 'Login with wallet'}
          </Button>
          {busy && phase && (
            <Typography color="text.secondary" data-testid="login-phase">
              {PHASE_LABELS[phase] ?? phase}
            </Typography>
          )}
          {error && (
            <Alert severity="error" sx={{ width: '100%' }} role="alert">
              {error}
            </Alert>
          )}
          <AdoptDialog open={adoptOpen} onClose={() => setAdoptOpen(false)} />
        </Stack>
      </Paper>
    </Box>
  )
}
