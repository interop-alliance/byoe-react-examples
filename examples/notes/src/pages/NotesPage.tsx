/**
 * The example WAS-backed collection: list / add / edit / delete notes. All
 * reads come from the in-memory entity store (hydrated from the encrypted
 * local replica); the store's `insert` / `update` / `remove` verbs persist
 * locally first and replicate to WAS in the background.
 */
import { useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { uuidv7 } from 'uuidv7'
import { getDeviceId } from '@interop/was-react'
import { useNotes, type Note } from '@/stores/notes'

function NoteRow({ note }: { note: Note }) {
  const update = useNotes(state => state.update)
  const remove = useNotes(state => state.remove)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.text)

  async function save() {
    const text = draft.trim()
    if (text && text !== note.text) {
      await update({
        ...note,
        text,
        updatedAt: new Date().toISOString(),
        deviceId: getDeviceId()
      })
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <ListItem>
        <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
          <TextField
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                void save()
              }
            }}
            size="small"
            fullWidth
            autoFocus
            aria-label="edit note"
          />
          <Button onClick={() => void save()}>Save</Button>
          <Button
            color="inherit"
            onClick={() => {
              setDraft(note.text)
              setEditing(false)
            }}
          >
            Cancel
          </Button>
        </Stack>
      </ListItem>
    )
  }

  return (
    <ListItem
      secondaryAction={
        <Stack direction="row" spacing={1}>
          <IconButton
            edge="end"
            aria-label={`edit ${note.text}`}
            onClick={() => setEditing(true)}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            edge="end"
            aria-label={`delete ${note.text}`}
            onClick={() => void remove(note.id)}
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
      }
    >
      <ListItemText
        primary={note.text}
        secondary={new Date(note.createdAt).toLocaleString()}
      />
    </ListItem>
  )
}

export function NotesPage() {
  const notes = useNotes(state => state.byId)
  const insert = useNotes(state => state.insert)
  const [text, setText] = useState('')

  const sorted = [...notes.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )

  async function addNote() {
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }
    const now = new Date().toISOString()
    await insert({
      id: uuidv7(),
      text: trimmed,
      createdAt: now,
      updatedAt: now,
      deviceId: getDeviceId()
    })
    setText('')
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Notes
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              void addNote()
            }
          }}
          placeholder="A new note..."
          size="small"
          fullWidth
          aria-label="new note"
        />
        <Button variant="contained" onClick={() => void addNote()}>
          Add
        </Button>
      </Stack>
      {sorted.length === 0 ? (
        <Typography color="text.secondary" data-testid="notes-empty">
          No notes yet. Add one above.
        </Typography>
      ) : (
        <List data-testid="notes-list">
          {sorted.map(note => (
            <NoteRow key={note.id} note={note} />
          ))}
        </List>
      )}
    </Box>
  )
}
