import { ref, shallowRef, computed, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import type { PlaybackTrack } from '@/features/playback/types/playback.types'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'
import { midiToNoteName } from '@/features/piano-roll/constants'
import { snapTime, snapDuration, DIVISION_FRACTIONS } from '../services/snap'
import type { EditableNote, NoteId, EditorTool, SnapDivision, EditCommand, DragState } from '../types/note-editor.types'

export const useNoteEditorStore = defineStore('note-editor', () => {
  // --- State ---
  const editableNotes = shallowRef<Map<NoteId, EditableNote>>(new Map())
  const selectedNoteIds = ref<Set<NoteId>>(new Set())
  const activeTool = ref<EditorTool>('select')
  const snapDivision = ref<SnapDivision>('1/4')
  const activeTrackIndex = ref(0)
  const isEditing = ref(false)

  // --- Clipboard ---
  const clipboard = ref<EditableNote[]>([])

  // --- Pending Note (two-step creation via A key) ---
  const pendingNote = ref<EditableNote | null>(null)

  // --- Drag ---
  const dragState = ref<DragState | null>(null)
  const isDragging = computed(() => dragState.value !== null)

  // --- Undo/Redo ---
  const undoStack = ref<EditCommand[]>([])
  const redoStack = ref<EditCommand[]>([])
  const MAX_UNDO = 100

  // --- Getters ---
  const noteList = computed(() => Array.from(editableNotes.value.values()))

  const selectedNotes = computed(() =>
    noteList.value.filter((n) => selectedNoteIds.value.has(n.id)),
  )

  const hasSelection = computed(() => selectedNoteIds.value.size > 0)

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  /** Maximum end time across all editable notes (time + duration) */
  const maxEndTime = computed(() => {
    let max = 0
    for (const note of editableNotes.value.values()) {
      const end = note.time + note.duration
      if (end > max) max = end
    }
    return max
  })

  // --- Actions ---

  /** Initialize editable notes from playback tracks (enters editing mode) */
  function initFromPlaybackTracks(tracks: PlaybackTrack[]): void {
    const map = new Map<NoteId, EditableNote>()

    for (let ti = 0; ti < tracks.length; ti++) {
      const track = tracks[ti]!
      for (let ei = 0; ei < track.events.length; ei++) {
        const event = track.events[ei]!
        const id: NoteId = `t${ti}-e${ei}`
        map.set(id, {
          id,
          trackIndex: ti,
          midi: event.midi,
          note: midiToNoteName(event.midi),
          time: event.time,
          duration: event.duration,
          velocity: event.velocity,
        })
      }
    }

    editableNotes.value = map
    triggerRef(editableNotes)
    selectedNoteIds.value = new Set()
    undoStack.value = []
    redoStack.value = []
    isEditing.value = true
  }

  /** Select a single note (deselects others unless shift=true) */
  function selectNote(id: NoteId, shift = false): void {
    if (!editableNotes.value.has(id)) return

    if (shift) {
      const next = new Set(selectedNoteIds.value)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      selectedNoteIds.value = next
    } else {
      selectedNoteIds.value = new Set([id])
    }
  }

  /** Select all notes (optionally filtered by active track) */
  function selectAll(): void {
    const ids = new Set<NoteId>()
    for (const note of editableNotes.value.values()) {
      ids.add(note.id)
    }
    selectedNoteIds.value = ids
  }

  /** Clear all selection */
  function clearSelection(): void {
    if (selectedNoteIds.value.size === 0) return
    selectedNoteIds.value = new Set()
  }

  /** Execute an edit command (for undo/redo support) */
  function executeCommand(cmd: EditCommand): void {
    // Apply "after" state
    const map = new Map(editableNotes.value)
    for (const note of cmd.before) {
      if (cmd.type === 'add') continue
      // For delete, remove the note
      if (cmd.type === 'delete') {
        map.delete(note.id)
      }
    }
    for (const note of cmd.after) {
      map.set(note.id, note)
    }
    // For delete commands, after array is empty — notes were removed above
    editableNotes.value = map
    triggerRef(editableNotes)

    // Push to undo stack
    undoStack.value = [...undoStack.value.slice(-MAX_UNDO + 1), cmd]
    redoStack.value = []
  }

  function undo(): void {
    const cmd = undoStack.value[undoStack.value.length - 1]
    if (!cmd) return

    undoStack.value = undoStack.value.slice(0, -1)

    // Apply "before" state (reverse the command)
    const map = new Map(editableNotes.value)
    for (const note of cmd.after) {
      if (cmd.type === 'add') {
        map.delete(note.id)
      }
    }
    for (const note of cmd.before) {
      map.set(note.id, note)
    }
    // For delete, before notes are restored above
    if (cmd.type === 'delete') {
      // After is empty for delete, before has the deleted notes — already restored
    }
    editableNotes.value = map
    triggerRef(editableNotes)

    redoStack.value = [...redoStack.value, cmd]
  }

  function redo(): void {
    const cmd = redoStack.value[redoStack.value.length - 1]
    if (!cmd) return

    redoStack.value = redoStack.value.slice(0, -1)

    // Re-apply "after" state
    const map = new Map(editableNotes.value)
    for (const note of cmd.before) {
      if (cmd.type === 'delete') {
        map.delete(note.id)
      }
    }
    for (const note of cmd.after) {
      map.set(note.id, note)
    }
    editableNotes.value = map
    triggerRef(editableNotes)

    undoStack.value = [...undoStack.value, cmd]
  }

  /** Add a new note via command */
  function addNote(note: EditableNote): void {
    executeCommand({
      type: 'add',
      before: [],
      after: [note],
    })
  }

  /** Delete selected notes via command */
  function deleteSelectedNotes(): void {
    if (selectedNoteIds.value.size === 0) return

    const toDelete = selectedNotes.value
    executeCommand({
      type: 'delete',
      before: toDelete,
      after: [],
    })
    clearSelection()
  }

  /** Convert editable notes back to PlaybackTrack[] for playback */
  function toPlaybackTracks(): PlaybackTrack[] {
    const trackMap = new Map<number, PlaybackTrack>()

    for (const note of editableNotes.value.values()) {
      let track = trackMap.get(note.trackIndex)
      if (!track) {
        track = { name: `Track ${note.trackIndex + 1}`, events: [] }
        trackMap.set(note.trackIndex, track)
      }
      track.events.push({
        midi: note.midi,
        note: note.note,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity,
      })
    }

    // Sort by track index, then each track's events by time
    const sorted = [...trackMap.entries()].sort((a, b) => a[0] - b[0])
    return sorted.map(([, track]) => {
      track.events.sort((a, b) => a.time - b.time)
      return track
    })
  }

  /** Set velocity of specific notes via command */
  function setVelocity(noteIds: NoteId[], velocity: number): void {
    const clampedVel = Math.max(0, Math.min(1, velocity))
    const before: EditableNote[] = []
    const after: EditableNote[] = []

    for (const id of noteIds) {
      const note = editableNotes.value.get(id)
      if (!note || note.velocity === clampedVel) continue
      before.push({ ...note })
      after.push({ ...note, velocity: clampedVel })
    }

    if (after.length > 0) {
      executeCommand({ type: 'velocity', before, after })
    }
  }

  /** Start a drag operation */
  function startDrag(type: DragState['type'], noteIds: NoteId[]): void {
    const notes = noteIds
      .map((id) => editableNotes.value.get(id))
      .filter((n): n is EditableNote => n !== undefined)
    if (notes.length === 0) return

    dragState.value = {
      type,
      originNotes: notes.map((n) => ({ ...n })),
      deltaTime: 0,
      deltaMidi: 0,
    }
  }

  /** Update drag deltas (called on mousemove) */
  function updateDrag(deltaTime: number, deltaMidi: number): void {
    if (!dragState.value) return
    dragState.value = { ...dragState.value, deltaTime, deltaMidi }
  }

  /** Commit drag as an EditCommand (applies snap) */
  function commitDrag(): void {
    const drag = dragState.value
    if (!drag) return

    const playbackStore = usePlaybackStore()
    const spb = playbackStore.bpm > 0 ? 60 / playbackStore.bpm : 0.5
    const snap = snapDivision.value

    const afterNotes: EditableNote[] = drag.originNotes.map((orig) => {
      const updated = { ...orig }

      if (drag.type === 'move') {
        updated.time = snapTime(Math.max(0, orig.time + drag.deltaTime), snap, spb)
        updated.midi = Math.max(0, Math.min(127, orig.midi + drag.deltaMidi))
        updated.note = midiToNoteName(updated.midi)
      } else if (drag.type === 'resize-end') {
        const rawDuration = orig.duration + drag.deltaTime
        updated.duration = snapDuration(Math.max(0.01, rawDuration), snap, spb)
      } else if (drag.type === 'resize-start') {
        const rawTime = Math.max(0, orig.time + drag.deltaTime)
        const snappedTime = snapTime(rawTime, snap, spb)
        const timeDelta = snappedTime - orig.time
        updated.time = snappedTime
        updated.duration = Math.max(0.01, orig.duration - timeDelta)
      }

      return updated
    })

    // Only commit if something actually changed
    const hasChanges = afterNotes.some((after, i) => {
      const before = drag.originNotes[i]!
      return after.time !== before.time || after.midi !== before.midi || after.duration !== before.duration
    })

    if (hasChanges) {
      executeCommand({
        type: drag.type === 'move' ? 'move' : 'resize',
        before: drag.originNotes,
        after: afterNotes,
      })
    }

    dragState.value = null
  }

  /** Cancel drag without applying changes */
  function cancelDrag(): void {
    dragState.value = null
  }

  // --- Helpers ---

  let _nextId = 0
  function generateNoteId(): NoteId {
    return `new-${Date.now()}-${_nextId++}`
  }

  function getSecondsPerBeat(): number {
    const playbackStore = usePlaybackStore()
    return playbackStore.bpm > 0 ? 60 / playbackStore.bpm : 0.5
  }

  function getSnapGridSize(): number {
    const spb = getSecondsPerBeat()
    if (snapDivision.value === 'off') return spb
    return spb * DIVISION_FRACTIONS[snapDivision.value]!
  }

  // --- Move selected notes ---

  /** Move selected notes by deltaTime (seconds) and deltaMidi (semitones) */
  function moveSelectedNotes(deltaTime: number, deltaMidi: number): void {
    if (selectedNoteIds.value.size === 0) return

    const before: EditableNote[] = []
    const after: EditableNote[] = []

    for (const note of selectedNotes.value) {
      const newTime = Math.max(0, note.time + deltaTime)
      const newMidi = Math.max(0, Math.min(127, note.midi + deltaMidi))
      if (newTime === note.time && newMidi === note.midi) continue

      before.push({ ...note })
      after.push({
        ...note,
        time: newTime,
        midi: newMidi,
        note: midiToNoteName(newMidi),
      })
    }

    if (after.length > 0) {
      executeCommand({ type: 'move', before, after })
    }
  }

  // --- Add note at position ---

  /** Add a note at a specific time and midi, using snap for duration */
  function addNoteAtPosition(time: number, midi: number): void {
    const spb = getSecondsPerBeat()
    const snap = snapDivision.value
    const snappedTime = snapTime(Math.max(0, time), snap, spb)
    const duration = getSnapGridSize()

    const note: EditableNote = {
      id: generateNoteId(),
      trackIndex: activeTrackIndex.value,
      midi: Math.max(0, Math.min(127, midi)),
      note: midiToNoteName(Math.max(0, Math.min(127, midi))),
      time: snappedTime,
      duration,
      velocity: 0.8,
    }

    addNote(note)
    selectedNoteIds.value = new Set([note.id])
  }

  // --- Pending Note (two-step creation via A key) ---

  /** Start a pending note preview (not yet committed to editableNotes) */
  function startPendingNote(time: number, midi: number): void {
    const spb = getSecondsPerBeat()
    const snap = snapDivision.value
    const snappedTime = snapTime(Math.max(0, time), snap, spb)
    const duration = getSnapGridSize()

    pendingNote.value = {
      id: generateNoteId(),
      trackIndex: activeTrackIndex.value,
      midi: Math.max(0, Math.min(127, midi)),
      note: midiToNoteName(Math.max(0, Math.min(127, midi))),
      time: snappedTime,
      duration,
      velocity: 0.8,
    }
  }

  /** Confirm pending note — optionally set duration from endTime */
  function confirmPendingNote(endTime?: number): void {
    if (!pendingNote.value) return

    const note = { ...pendingNote.value }
    if (endTime !== undefined) {
      const spb = getSecondsPerBeat()
      const snap = snapDivision.value
      const snappedEnd = snapTime(Math.max(0, endTime), snap, spb)
      const minDuration = getSnapGridSize()
      note.duration = Math.max(minDuration, snappedEnd - note.time)
    }

    addNote(note)
    selectedNoteIds.value = new Set([note.id])
    pendingNote.value = null
  }

  /** Update pending note duration from mouse position (endTime in seconds) */
  function updatePendingNoteDuration(endTime: number): void {
    if (!pendingNote.value) return
    const spb = getSecondsPerBeat()
    const snap = snapDivision.value
    const snappedEnd = snapTime(Math.max(0, endTime), snap, spb)
    const minDuration = getSnapGridSize()
    pendingNote.value = {
      ...pendingNote.value,
      duration: Math.max(minDuration, snappedEnd - pendingNote.value.time),
    }
  }

  /** Cancel pending note */
  function cancelPendingNote(): void {
    pendingNote.value = null
  }

  // --- Clipboard ---

  /** Copy selected notes to clipboard */
  function copySelectedNotes(): void {
    if (selectedNoteIds.value.size === 0) return
    clipboard.value = selectedNotes.value.map((n: EditableNote) => ({ ...n }))
  }

  /** Cut selected notes (copy + delete) */
  function cutSelectedNotes(): void {
    copySelectedNotes()
    deleteSelectedNotes()
  }

  /** Paste notes from clipboard at a given time offset */
  function pasteNotes(atTime: number): void {
    if (clipboard.value.length === 0) return

    const minTime = Math.min(...clipboard.value.map((n: EditableNote) => n.time))
    const offset = atTime - minTime
    const newNotes: EditableNote[] = clipboard.value.map((n: EditableNote) => ({
      ...n,
      id: generateNoteId(),
      time: Math.max(0, n.time + offset),
    }))

    executeCommand({ type: 'add', before: [], after: newNotes })
    selectedNoteIds.value = new Set(newNotes.map((n) => n.id))
  }

  /** Duplicate selected notes right after the selection */
  function duplicateSelectedNotes(): void {
    if (selectedNoteIds.value.size === 0) return

    const selected = selectedNotes.value
    const maxEnd = Math.max(...selected.map((n: EditableNote) => n.time + n.duration))
    const minTime = Math.min(...selected.map((n: EditableNote) => n.time))
    const offset = maxEnd - minTime

    const newNotes: EditableNote[] = selected.map((n: EditableNote) => ({
      ...n,
      id: generateNoteId(),
      time: n.time + offset,
    }))

    executeCommand({ type: 'add', before: [], after: newNotes })
    selectedNoteIds.value = new Set(newNotes.map((n) => n.id))
  }

  /** Reset editor state */
  function reset(): void {
    editableNotes.value = new Map()
    triggerRef(editableNotes)
    selectedNoteIds.value = new Set()
    undoStack.value = []
    redoStack.value = []
    dragState.value = null
    pendingNote.value = null
    isEditing.value = false
    activeTool.value = 'select'
    activeTrackIndex.value = 0
  }

  return {
    // State
    editableNotes,
    selectedNoteIds,
    activeTool,
    snapDivision,
    activeTrackIndex,
    isEditing,
    clipboard,
    pendingNote,
    undoStack,
    redoStack,
    dragState,

    // Getters
    noteList,
    selectedNotes,
    hasSelection,
    canUndo,
    canRedo,
    isDragging,
    maxEndTime,

    // Actions
    initFromPlaybackTracks,
    selectNote,
    selectAll,
    clearSelection,
    executeCommand,
    undo,
    redo,
    addNote,
    deleteSelectedNotes,
    setVelocity,
    moveSelectedNotes,
    addNoteAtPosition,
    startPendingNote,
    confirmPendingNote,
    updatePendingNoteDuration,
    cancelPendingNote,
    copySelectedNotes,
    cutSelectedNotes,
    pasteNotes,
    duplicateSelectedNotes,
    startDrag,
    updateDrag,
    commitDrag,
    cancelDrag,
    toPlaybackTracks,
    getSnapGridSize,
    reset,
  }
})
