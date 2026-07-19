/**
 * Space Miner: the whole game in one component file. Everything the app knows
 * about storage, identity, and sync arrives through the `useDocument` hook --
 * mine minerals, upgrade the drill, and the save file persists in the
 * encrypted local replica. "Download save" / "Load save" move the save as a
 * plain JSON file; "Save to Web Spaces" runs the CHAPI wallet login (a single
 * one-collection consent request) and carries the local save into the granted
 * collection, with background sync from then on.
 */
import { useRef, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  IconButton,
  Snackbar,
  Stack,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DownloadIcon from '@mui/icons-material/Download'
import LogoutIcon from '@mui/icons-material/Logout'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
  ClearDataDialog,
  LogoutDialog,
  ReconnectBanner,
  SyncStatusChip
} from '@interop/was-react/mui'
import { useDocument } from '@/app.config'

/** Cost of the next drill upgrade: scales with the current level. */
function upgradeCost(drillLevel: number): number {
  return 25 * drillLevel
}

export function App() {
  const { doc, update, status, exportFile, importFile, connect, connecting } =
    useDocument()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const connected = status === 'connected' || status === 'reconnect'

  async function downloadSave() {
    const blob = await exportFile()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'space-miner-save.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function loadSave(file: File | undefined) {
    if (!file) {
      return
    }
    try {
      await importFile(file)
      setNotice('Save file loaded.')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Space Miner
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
            <>
              <Button
                color="inherit"
                startIcon={<CloudUploadIcon />}
                onClick={() => void connect().catch(() => {})}
                disabled={connecting}
                data-testid="connect-button"
              >
                Save to Web Spaces
              </Button>
              <Button
                color="inherit"
                onClick={() => setClearOpen(true)}
                data-testid="clear-data-button"
              >
                Clear data
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <ReconnectBanner />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        {doc === undefined ? (
          <Typography color="text.secondary">Loading save...</Typography>
        ) : (
          <Stack spacing={3} sx={{ alignItems: 'center' }}>
            <Typography variant="h2" component="p" data-testid="minerals">
              {doc.minerals}
            </Typography>
            <Typography color="text.secondary">
              minerals (drill level {doc.drillLevel})
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() =>
                void update(prev => ({
                  ...prev,
                  minerals: prev.minerals + prev.drillLevel
                }))
              }
            >
              Mine
            </Button>
            <Button
              variant="outlined"
              disabled={doc.minerals < upgradeCost(doc.drillLevel)}
              onClick={() =>
                void update(prev => ({
                  minerals: prev.minerals - upgradeCost(prev.drillLevel),
                  drillLevel: prev.drillLevel + 1
                }))
              }
            >
              Upgrade drill ({upgradeCost(doc.drillLevel)} minerals)
            </Button>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<DownloadIcon />}
                onClick={() => void downloadSave()}
              >
                Download save
              </Button>
              <Button
                startIcon={<UploadFileIcon />}
                onClick={() => fileInput.current?.click()}
              >
                Load save
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json"
                hidden
                data-testid="load-save-input"
                onChange={event => {
                  void loadSave(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
            </Stack>
          </Stack>
        )}
      </Container>
      <LogoutDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
      <ClearDataDialog open={clearOpen} onClose={() => setClearOpen(false)} />
      <Snackbar
        open={notice !== null}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
      >
        <Alert severity="info" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  )
}
