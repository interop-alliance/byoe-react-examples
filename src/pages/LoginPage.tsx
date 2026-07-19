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

const PHASE_LABELS: Record<string, string> = {
  probing: 'Contacting your wallet...',
  'storing-key': 'Storing your app key in the wallet...',
  'requesting-grants': 'Requesting storage access...',
  verifying: 'Verifying the wallet response...'
}

export function LoginPage() {
  const { login, authenticating, status, phase, error } = useLogin()
  const hasLocalData = useHasLocalData()
  const [adoptOpen, setAdoptOpen] = useState(false)
  const busy = authenticating

  if (status === 'connected') {
    return <Navigate to="/" replace />
  }

  // On click, branch on whether the anonymous replica holds data: if it does,
  // let the user choose what happens to it via the dialog (which runs the
  // login); otherwise log in directly.
  async function handleLogin(): Promise<void> {
    if (await hasLocalData()) {
      setAdoptOpen(true)
    } else {
      await login()
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
