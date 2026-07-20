/**
 * Text Editor: the whole app in one component file. Everything the app knows
 * about storage, identity, and sync arrives through the `useDocument` hook --
 * type into the one textbox and the text persists in the encrypted local
 * replica. "Export (Download) File" / "Import (Load) File" move the document as
 * a plain JSON file; "Save to Web Spaces" runs the CHAPI wallet login (a single
 * one-collection consent request) and carries the local text into the granted
 * collection, with background sync from then on.
 */
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  Divider,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
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

/**
 * How long typing pauses before the document is persisted. A text editor writes
 * on a debounce rather than per keystroke: `update` is a real write to the
 * encrypted replica (and, once connected, a sync push).
 */
const SAVE_DELAY_MS = 400

export function App() {
  const {
    doc,
    update,
    status,
    exportFile,
    importFile,
    connect,
    connecting,
    error
  } = useDocument()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [text, setText] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  // The last text this editor put into the document, so a change arriving from
  // anywhere else (boot, import, clear data, a sync from another device) is
  // distinguishable from the echo of our own debounced write.
  const ownText = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connected = status === 'connected' || status === 'reconnect'

  useEffect(() => {
    if (doc !== undefined && doc.text !== ownText.current) {
      ownText.current = doc.text
      setText(doc.text)
    }
  }, [doc])

  useEffect(
    () => () => {
      if (saveTimer.current !== null) {
        clearTimeout(saveTimer.current)
      }
    },
    []
  )

  function edit(value: string) {
    setText(value)
    ownText.current = value
    if (saveTimer.current !== null) {
      clearTimeout(saveTimer.current)
    }
    saveTimer.current = setTimeout(() => {
      void update({ text: value })
    }, SAVE_DELAY_MS)
  }

  async function downloadFile() {
    const blob = await exportFile()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'text-editor-document.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  // "Save to Web Spaces": connect resolves `{ firstRun }` on success, `null`
  // when the user cancels the wallet popup (nothing to do), and rejects on a
  // genuine failure -- whose message the library also mirrors into `error`,
  // rendered as the alert below, so the catch just keeps the rejection handled.
  async function saveToWebSpaces() {
    try {
      const result = await connect()
      if (result) {
        setNotice(
          result.firstRun
            ? 'Connected to your storage.'
            : 'Reconnected to your storage.'
        )
      }
    } catch {
      // Surfaced via the `error` alert.
    }
  }

  async function loadFile(file: File | undefined) {
    if (!file) {
      return
    }
    try {
      await importFile(file)
      setNotice('File loaded.')
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
            Text Editor
          </Typography>
          {connected && (
            <Button
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={() => setLogoutOpen(true)}
            >
              Log out
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <ReconnectBanner />
      <Container maxWidth="sm" sx={{ py: 4 }}>
        {doc === undefined ? (
          <Typography color="text.secondary">Loading...</Typography>
        ) : (
          <Stack spacing={3} divider={<Divider />}>
            <TextField
              multiline
              fullWidth
              minRows={12}
              label="Your text"
              placeholder="Start typing..."
              value={text}
              onChange={event => edit(event.target.value)}
              slotProps={{ htmlInput: { 'data-testid': 'editor' } }}
            />
            <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Typography color="text.secondary">
                Manual save file (download to your device)
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => void downloadFile()}
                >
                  Export (Download) File
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  onClick={() => fileInput.current?.click()}
                >
                  Import (Load) File
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/json"
                  hidden
                  data-testid="load-file-input"
                  onChange={event => {
                    void loadFile(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
              </Stack>
            </Stack>
            <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Typography color="text.secondary">
                Alternatively, persist the text to Web Spaces via your wallet
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {connected && (
                  <Chip
                    label="CONNECTED to storage"
                    color="success"
                    size="small"
                    data-testid="connected-chip"
                  />
                )}
                <SyncStatusChip />
                {!connected && (
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => void saveToWebSpaces()}
                    disabled={connecting}
                    data-testid="connect-button"
                  >
                    Save to Web Spaces
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setClearOpen(true)}
                  data-testid="clear-data-button"
                >
                  Clear Data
                </Button>
              </Stack>
              {error && (
                <Alert severity="error" role="alert" sx={{ width: '100%' }}>
                  {error}
                </Alert>
              )}
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
