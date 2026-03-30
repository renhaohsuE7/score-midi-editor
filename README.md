# Score MIDI Editor

Browser-based MIDI / MusicXML editor with Piano Roll UI, built with Vue 3 + TypeScript + Tone.js.

## Features

- **File Import** — Drag-and-drop MIDI (`.mid`) and MusicXML (`.musicxml` / `.mxl`), parsed via Web Worker, persisted in IndexedDB
- **Playback** — Tone.js audio engine with per-track mute / solo / volume, pause & resume
- **Piano Roll** — DOM-based note rendering, multi-track colors, zoom, auto-scroll playhead
- **Note Editor** — Select / move / resize / add / delete / undo / redo / velocity editing
- **MIDI Export** — Export edited notes back to `.mid`

## Keyboard Shortcuts

### Tool Switching

| Key | Tool | Description |
|-----|------|-------------|
| `1` / `V` | Select | Select, move, and resize notes |
| `2` / `B` | Pencil | Click to create note + drag to set duration |
| `3` / `N` | Eraser | Click to delete note |

### Note Editing

| Key | Action |
|-----|--------|
| `A` | Create pending note preview at playhead; move mouse to stretch duration, click to confirm |
| `Enter` | Confirm pending note with current duration |
| `Escape` | Cancel pending note |
| `Delete` / `Backspace` | Delete selected notes |
| `↑` / `↓` | Move selected notes ±1 semitone |
| `Shift + ↑` / `↓` | Move selected notes ±1 octave (12 semitones) |
| `←` / `→` | Move selected notes ±1 snap grid unit |

### General

| Key | Action |
|-----|--------|
| `Ctrl+A` | Select all notes |
| `Ctrl+C` | Copy selected notes |
| `Ctrl+X` | Cut selected notes |
| `Ctrl+V` | Paste at playhead position |
| `Ctrl+D` | Duplicate selected notes (placed after selection) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |

## Editing Modes

### Select Tool

- Click note → select (Shift+click to add to selection)
- Drag note body → move (time + pitch)
- Drag note left/right edge → resize duration
- Click background → clear selection
- Double-click note → edit velocity

### Pencil Tool

- Click background → create note + drag to set duration
- Release without dragging → default 1 grid unit duration

### Eraser Tool

- Click note → delete

### Pending Note (A Key)

- Press `A` → semi-transparent preview appears at playhead + C4, cursor changes to `ew-resize`
- Move mouse → duration stretches in real-time (snapped to grid)
- Click → confirm note
- `Enter` → confirm with current duration
- `Escape` → cancel
- Press `A` again → cancel previous, create new

## Development

```bash
# Start dev server (Docker)
docker compose up dev

# Type check
docker compose exec dev npx vue-tsc --noEmit

# Run tests
docker compose exec dev npx vitest run
```

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **State**: Pinia
- **Audio**: Tone.js
- **Styling**: Tailwind CSS
- **Testing**: Vitest + @vue/test-utils
- **Infrastructure**: Docker Compose

## Documentation

- [Project Roadmap](docs/plans/roadmap.md)
- [File Import](docs/features/file-import.md)
- [Playback](docs/features/playback.md)
- [Piano Roll](docs/features/piano-roll.md)
- [Note Editor](docs/features/note-editor.md)
