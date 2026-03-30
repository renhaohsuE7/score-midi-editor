import type { Ref } from 'vue'
import { useNoteEditorStore } from '../stores/note-editor.store'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'
import { midiToNoteName } from '@/features/piano-roll/constants'
import { snapTime, snapDuration } from '../services/snap'
import type { EditableNote } from '../types/note-editor.types'

let noteCounter = 0

interface CreateOptions {
  pixelsPerSecond: Ref<number>
  noteHeight: Ref<number>
  maxMidi: Ref<number>
}

/**
 * Composable for creating new notes with the pencil tool.
 * Click on the grid to place a note at that position.
 */
export function useNoteCreate(options: CreateOptions) {
  const editorStore = useNoteEditorStore()
  const playbackStore = usePlaybackStore()

  function handleGridClick(event: MouseEvent, gridElement: HTMLElement): string | null {
    if (editorStore.activeTool !== 'pencil') return null

    const rect = gridElement.getBoundingClientRect()
    const x = event.clientX - rect.left + gridElement.scrollLeft
    const y = event.clientY - rect.top + gridElement.scrollTop

    const rawTime = x / options.pixelsPerSecond.value
    const midi = options.maxMidi.value - Math.floor(y / options.noteHeight.value)

    if (midi < 0 || midi > 127) return null

    const spb = playbackStore.bpm > 0 ? 60 / playbackStore.bpm : 0.5
    const snap = editorStore.snapDivision
    const time = snapTime(rawTime, snap, spb)
    const duration = snapDuration(spb, snap, spb) // Default: one beat (snapped)

    const id = `new-${++noteCounter}`
    const note: EditableNote = {
      id,
      trackIndex: editorStore.activeTrackIndex,
      midi,
      note: midiToNoteName(midi),
      time,
      duration,
      velocity: 0.8,
    }

    editorStore.addNote(note)
    editorStore.selectNote(id)
    return id
  }

  function handleNoteClick(noteId: string): void {
    if (editorStore.activeTool !== 'eraser') return
    // Select and delete
    editorStore.selectNote(noteId)
    editorStore.deleteSelectedNotes()
  }

  return { handleGridClick, handleNoteClick }
}
