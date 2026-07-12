/**
 * Login With Wallet: one button driving the library's CHAPI login flow, with
 * a progress line per flow phase and an error alert. An authenticated visitor
 * is bounced straight to the app.
 */
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
import { useLogin } from '@interop/was-react'

const PHASE_LABELS: Record<string, string> = {
  probing: 'Contacting your wallet...',
  'storing-key': 'Storing your app key in the wallet...',
  'requesting-grants': 'Requesting storage access...',
  verifying: 'Verifying the wallet response...'
}

export function LoginPage() {
  const { login, status, phase, error } = useLogin()
  const busy = status === 'authenticating'

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
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
            onClick={() => void login()}
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
        </Stack>
      </Paper>
    </Box>
  )
}
