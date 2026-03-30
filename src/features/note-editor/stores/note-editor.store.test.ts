import { setActivePinia, createPinia } from 'pinia'
import { useNoteEditorStore } from './note-editor.store'
import type { PlaybackTrack } from '@/features/playback/types/playback.types'
import type { EditableNote } from '../types/note-editor.types'

const mockTracks: PlaybackTrack[] = [
  {
    name: 'Piano',
    events: [
      { midi: 60, note: 'C4', time: 0, duration: 0.5, velocity: 0.8 },
      { midi: 64, note: 'E4', time: 0.5, duration: 0.5, velocity: 0.7 },
      { midi: 67, note: 'G4', time: 1.0, duration: 1.0, velocity: 0.9 },
    ],
  },
  {
    name: 'Bass',
    events: [
      { midi: 36, note: 'C2', time: 0, duration: 2.0, velocity: 0.6 },
    ],
  },
]

describe('useNoteEditorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('initFromPlaybackTracks', () => {
    it('populates editableNotes from playback tracks', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      expect(store.editableNotes.size).toBe(4)
      expect(store.isEditing).toBe(true)

      const note = store.editableNotes.get('t0-e0')
      expect(note).toBeDefined()
      expect(note!.midi).toBe(60)
      expect(note!.note).toBe('C4')
      expect(note!.time).toBe(0)
      expect(note!.trackIndex).toBe(0)
    })

    it('assigns correct track indices', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      const bassNote = store.editableNotes.get('t1-e0')
      expect(bassNote).toBeDefined()
      expect(bassNote!.trackIndex).toBe(1)
      expect(bassNote!.midi).toBe(36)
    })

    it('clears selection and undo stack on init', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)
      store.selectNote('t0-e0')
      expect(store.hasSelection).toBe(true)

      // Re-init should clear selection
      store.initFromPlaybackTracks(mockTracks)
      expect(store.hasSelection).toBe(false)
      expect(store.canUndo).toBe(false)
    })
  })

  describe('selectNote', () => {
    it('selects a single note', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      expect(store.selectedNoteIds.has('t0-e0')).toBe(true)
      expect(store.selectedNoteIds.size).toBe(1)
    })

    it('replaces selection without shift', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      store.selectNote('t0-e1')
      expect(store.selectedNoteIds.has('t0-e0')).toBe(false)
      expect(store.selectedNoteIds.has('t0-e1')).toBe(true)
      expect(store.selectedNoteIds.size).toBe(1)
    })

    it('toggles with shift', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      store.selectNote('t0-e1', true)
      expect(store.selectedNoteIds.size).toBe(2)

      // Shift-click again to deselect
      store.selectNote('t0-e0', true)
      expect(store.selectedNoteIds.size).toBe(1)
      expect(store.selectedNoteIds.has('t0-e1')).toBe(true)
    })

    it('ignores non-existent note id', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('non-existent')
      expect(store.selectedNoteIds.size).toBe(0)
    })
  })

  describe('clearSelection', () => {
    it('clears all selected notes', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      store.selectNote('t0-e1', true)
      expect(store.selectedNoteIds.size).toBe(2)

      store.clearSelection()
      expect(store.selectedNoteIds.size).toBe(0)
    })
  })

  describe('selectAll', () => {
    it('selects all notes', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectAll()
      expect(store.selectedNoteIds.size).toBe(4)
    })
  })

  describe('addNote', () => {
    it('adds a new note', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      const newNote: EditableNote = {
        id: 'new-1',
        trackIndex: 0,
        midi: 72,
        note: 'C5',
        time: 2.0,
        duration: 0.5,
        velocity: 0.8,
      }
      store.addNote(newNote)

      expect(store.editableNotes.size).toBe(5)
      expect(store.editableNotes.get('new-1')).toEqual(newNote)
      expect(store.canUndo).toBe(true)
    })
  })

  describe('deleteSelectedNotes', () => {
    it('deletes selected notes', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      store.selectNote('t0-e1', true)
      store.deleteSelectedNotes()

      expect(store.editableNotes.size).toBe(2)
      expect(store.editableNotes.has('t0-e0')).toBe(false)
      expect(store.editableNotes.has('t0-e1')).toBe(false)
      expect(store.hasSelection).toBe(false)
    })

    it('does nothing with no selection', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.deleteSelectedNotes()
      expect(store.editableNotes.size).toBe(4)
    })
  })

  describe('undo/redo', () => {
    it('undoes an add command', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      const newNote: EditableNote = {
        id: 'new-1',
        trackIndex: 0,
        midi: 72,
        note: 'C5',
        time: 2.0,
        duration: 0.5,
        velocity: 0.8,
      }
      store.addNote(newNote)
      expect(store.editableNotes.size).toBe(5)

      store.undo()
      expect(store.editableNotes.size).toBe(4)
      expect(store.editableNotes.has('new-1')).toBe(false)
      expect(store.canRedo).toBe(true)
    })

    it('redoes after undo', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      const newNote: EditableNote = {
        id: 'new-1',
        trackIndex: 0,
        midi: 72,
        note: 'C5',
        time: 2.0,
        duration: 0.5,
        velocity: 0.8,
      }
      store.addNote(newNote)
      store.undo()
      store.redo()

      expect(store.editableNotes.size).toBe(5)
      expect(store.editableNotes.get('new-1')).toEqual(newNote)
    })

    it('undoes a delete command', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      store.deleteSelectedNotes()
      expect(store.editableNotes.size).toBe(3)

      store.undo()
      expect(store.editableNotes.size).toBe(4)
      expect(store.editableNotes.has('t0-e0')).toBe(true)
    })
  })

  describe('toPlaybackTracks', () => {
    it('converts editable notes back to playback tracks', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      const result = store.toPlaybackTracks()
      expect(result).toHaveLength(2)
      expect(result[0]!.events).toHaveLength(3)
      expect(result[1]!.events).toHaveLength(1)

      // Events should be sorted by time
      expect(result[0]!.events[0]!.time).toBe(0)
      expect(result[0]!.events[1]!.time).toBe(0.5)
      expect(result[0]!.events[2]!.time).toBe(1.0)
    })
  })

  describe('moveSelectedNotes', () => {
    it('moves selected notes by semitone', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0') // C4 = midi 60
      store.moveSelectedNotes(0, 1)

      const note = store.editableNotes.get('t0-e0')!
      expect(note.midi).toBe(61)
      expect(note.note).toBe('C#4')
      expect(store.canUndo).toBe(true)
    })

    it('moves selected notes by octave', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0') // C4 = midi 60
      store.moveSelectedNotes(0, 12)

      expect(store.editableNotes.get('t0-e0')!.midi).toBe(72)
    })

    it('moves selected notes in time', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e1') // time=0.5
      store.moveSelectedNotes(0.25, 0)

      expect(store.editableNotes.get('t0-e1')!.time).toBe(0.75)
    })

    it('clamps midi to 0-127', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0') // midi 60
      store.moveSelectedNotes(0, -100) // would be -40

      expect(store.editableNotes.get('t0-e0')!.midi).toBe(0)
    })

    it('clamps time to >= 0', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0') // time=0
      store.moveSelectedNotes(-5, 0)

      expect(store.editableNotes.get('t0-e0')!.time).toBe(0)
    })

    it('undoes move', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      store.moveSelectedNotes(0, 2)
      expect(store.editableNotes.get('t0-e0')!.midi).toBe(62)

      store.undo()
      expect(store.editableNotes.get('t0-e0')!.midi).toBe(60)
    })

    it('does nothing with no selection', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.moveSelectedNotes(0, 1)
      expect(store.canUndo).toBe(false)
    })
  })

  describe('addNoteAtPosition', () => {
    it('adds a note at the given time and midi', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.addNoteAtPosition(1.0, 72)

      expect(store.editableNotes.size).toBe(5)
      expect(store.selectedNoteIds.size).toBe(1)

      // Find the new note
      const newId = [...store.selectedNoteIds][0]!
      const note = store.editableNotes.get(newId)!
      expect(note.midi).toBe(72)
      expect(note.velocity).toBe(0.8)
      expect(note.trackIndex).toBe(0)
    })

    it('uses active track index', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)
      store.activeTrackIndex = 1

      store.addNoteAtPosition(0, 48)

      const newId = [...store.selectedNoteIds][0]!
      expect(store.editableNotes.get(newId)!.trackIndex).toBe(1)
    })

    it('auto-selects the new note', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      store.addNoteAtPosition(2.0, 60)

      // Previous selection cleared, only new note selected
      expect(store.selectedNoteIds.size).toBe(1)
      expect(store.selectedNoteIds.has('t0-e0')).toBe(false)
    })
  })

  describe('clipboard', () => {
    it('copies and pastes selected notes', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      store.selectNote('t0-e1', true)
      store.copySelectedNotes()

      expect(store.clipboard).toHaveLength(2)

      // Paste at t=3.0
      store.pasteNotes(3.0)
      expect(store.editableNotes.size).toBe(6) // 4 original + 2 pasted

      // New notes should be selected
      expect(store.selectedNoteIds.size).toBe(2)

      // Pasted notes should have offset times
      const pasted = [...store.selectedNoteIds].map((id) => store.editableNotes.get(id)!)
      const times = pasted.map((n) => n.time).sort((a, b) => a - b)
      expect(times[0]).toBe(3.0) // original was t=0, offset by 3.0
      expect(times[1]).toBe(3.5) // original was t=0.5, offset by 3.0
    })

    it('cut removes notes and copies to clipboard', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      store.cutSelectedNotes()

      expect(store.editableNotes.size).toBe(3)
      expect(store.clipboard).toHaveLength(1)
      expect(store.hasSelection).toBe(false)
    })

    it('paste does nothing with empty clipboard', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.pasteNotes(0)
      expect(store.editableNotes.size).toBe(4)
    })

    it('duplicates selected notes after selection', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      // Select t0-e0 (time=0, dur=0.5) and t0-e1 (time=0.5, dur=0.5)
      store.selectNote('t0-e0')
      store.selectNote('t0-e1', true)
      store.duplicateSelectedNotes()

      expect(store.editableNotes.size).toBe(6) // 4 + 2 duplicated

      // New notes should be selected
      expect(store.selectedNoteIds.size).toBe(2)

      // Duplicated notes should start after maxEnd of original selection
      // maxEnd = max(0+0.5, 0.5+0.5) = 1.0, minTime = 0, offset = 1.0
      const duped = [...store.selectedNoteIds].map((id) => store.editableNotes.get(id)!)
      const times = duped.map((n) => n.time).sort((a, b) => a - b)
      expect(times[0]).toBe(1.0)  // 0 + 1.0
      expect(times[1]).toBe(1.5)  // 0.5 + 1.0
    })

    it('duplicate does nothing with no selection', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.duplicateSelectedNotes()
      expect(store.editableNotes.size).toBe(4)
    })

    it('undo paste removes pasted notes', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.selectNote('t0-e0')
      store.copySelectedNotes()
      store.pasteNotes(5.0)
      expect(store.editableNotes.size).toBe(5)

      store.undo()
      expect(store.editableNotes.size).toBe(4)
    })
  })

  describe('pendingNote', () => {
    it('starts a pending note at given time and midi', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.startPendingNote(1.0, 72)

      expect(store.pendingNote).not.toBeNull()
      expect(store.pendingNote!.midi).toBe(72)
      expect(store.pendingNote!.time).toBeGreaterThanOrEqual(0)
      expect(store.pendingNote!.velocity).toBe(0.8)
      expect(store.pendingNote!.trackIndex).toBe(0)
    })

    it('uses active track index for pending note', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)
      store.activeTrackIndex = 1

      store.startPendingNote(0, 60)

      expect(store.pendingNote!.trackIndex).toBe(1)
    })

    it('clamps midi to 0-127', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.startPendingNote(0, 200)
      expect(store.pendingNote!.midi).toBe(127)

      store.startPendingNote(0, -10)
      expect(store.pendingNote!.midi).toBe(0)
    })

    it('confirms pending note with default duration', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.startPendingNote(1.0, 72)
      const pendingId = store.pendingNote!.id

      store.confirmPendingNote()

      expect(store.pendingNote).toBeNull()
      expect(store.editableNotes.size).toBe(5) // 4 original + 1 new
      expect(store.editableNotes.has(pendingId)).toBe(true)
      expect(store.selectedNoteIds.has(pendingId)).toBe(true)
    })

    it('confirms pending note with end time', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)
      store.snapDivision = 'off'

      store.startPendingNote(1.0, 72)
      const pendingId = store.pendingNote!.id

      store.confirmPendingNote(3.0)

      expect(store.pendingNote).toBeNull()
      const note = store.editableNotes.get(pendingId)!
      expect(note.duration).toBeCloseTo(2.0) // 3.0 - 1.0
    })

    it('cancels pending note', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.startPendingNote(1.0, 72)
      expect(store.pendingNote).not.toBeNull()

      store.cancelPendingNote()
      expect(store.pendingNote).toBeNull()
      expect(store.editableNotes.size).toBe(4) // No note added
    })

    it('does nothing when confirming without pending note', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.confirmPendingNote()
      expect(store.editableNotes.size).toBe(4)
    })

    it('confirmed note can be undone', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)

      store.startPendingNote(1.0, 72)
      store.confirmPendingNote()
      expect(store.editableNotes.size).toBe(5)

      store.undo()
      expect(store.editableNotes.size).toBe(4)
    })
  })

  describe('reset', () => {
    it('resets all state', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)
      store.selectNote('t0-e0')

      store.reset()
      expect(store.editableNotes.size).toBe(0)
      expect(store.selectedNoteIds.size).toBe(0)
      expect(store.isEditing).toBe(false)
      expect(store.activeTool).toBe('select')
    })

    it('clears pending note on reset', () => {
      const store = useNoteEditorStore()
      store.initFromPlaybackTracks(mockTracks)
      store.startPendingNote(1.0, 60)
      expect(store.pendingNote).not.toBeNull()

      store.reset()
      expect(store.pendingNote).toBeNull()
    })
  })
})
