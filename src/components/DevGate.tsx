/**
 * Dev-mode router gate: kicks off `initApp` (local dev seed, no login) and
 * waits for hydration before rendering the routed pages. The wallet-mode
 * equivalent is the library's `ProtectedRoute`; the route table picks one by
 * `AUTH_MODE`.
 */
import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { Alert, Box, CircularProgress, Typography } from '@mui/material'
import { useAppReady } from '@interop/was-react'
import { initApp } from '@/dev/bootstrap'

export function DevGate() {
  const ready = useAppReady(s => s.ready)
  const error = useAppReady(s => s.error)

  useEffect(() => {
    void initApp()
  }, [])

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" data-testid="bootstrap-error">
          Failed to open local storage: {error}
        </Alert>
      </Box>
    )
  }

  if (!ready) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          minHeight: '60vh'
        }}
        data-testid="bootstrap-loading"
      >
        <CircularProgress />
        <Typography color="text.secondary">Opening your storage...</Typography>
      </Box>
    )
  }

  return <Outlet />
}
