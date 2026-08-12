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
import { useNotes, type Note } from '@/stores/notes'

/**
 * One note in the list: display mode (text + created date, edit/delete icons)
 * or, after the edit icon, an inline edit mode (textbox + Save/Cancel). Each
 * row owns its editing state, so editing one note never re-renders the rest of
 * the list.
 */
function NoteRow({ note }: { note: Note }) {
  const update = useNotes(state => state.update)
  const remove = useNotes(state => state.remove)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.text)

  /**
   * Commit the edit: persist the trimmed draft and leave edit mode. The LWW
   * fields (`updatedAt` + `writerId`) are stamped by the store verb, not here.
   * An empty or unchanged draft just closes the editor without writing.
   */
  async function save() {
    const text = draft.trim()
    if (text && text !== note.text) {
      await update({ ...note, text })
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

/**
 * The notes list page: an add-note textbox on top, then the notes newest
 * first. Reads subscribe to the entity store's `byId` Map, so a change from
 * anywhere -- this page, a background sync from another client, logout's clear
 * -- re-renders the list; writes go through the store verbs, which persist to
 * the encrypted replica first and replicate in the background when connected.
 */
export function NotesPage() {
  const notes = useNotes(state => state.byId)
  const insert = useNotes(state => state.insert)
  const [text, setText] = useState('')

  // Newest-first without mutating the store's Map. uuidv7 ids would also sort
  // by creation time, but sorting on `createdAt` keeps the intent readable.
  const sorted = [...notes.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )

  /**
   * Insert the typed note (ignoring a blank textbox) under a fresh uuidv7 id,
   * then clear the textbox for the next one. The store verb stamps the LWW
   * fields itself.
   */
  async function addNote() {
    const trimmed = text.trim()
    if (!trimmed) {
      return
    }
    await insert({
      id: uuidv7(),
      text: trimmed,
      createdAt: new Date().toISOString()
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
