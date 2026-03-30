import { onMounted, onUnmounted } from 'vue'
import { useNoteEditorStore } from '../stores/note-editor.store'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'

/**
 * Registers global keyboard shortcuts for note editing.
 * Must be used in a Vue component setup context.
 */
export function useKeyboardShortcuts() {
  const editorStore = useNoteEditorStore()
  const playbackStore = usePlaybackStore()

  function onKeyDown(event: KeyboardEvent) {
    if (!editorStore.isEditing) return

    // Don't intercept when user is typing in an input/select
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

    const ctrl = event.ctrlKey || event.metaKey
    const shift = event.shiftKey
    const key = event.key

    // --- Ctrl+ shortcuts ---
    if (ctrl) {
      if (key === 'a') {
        event.preventDefault()
        editorStore.selectAll()
      } else if (key === 'z' && !shift) {
        event.preventDefault()
        editorStore.undo()
      } else if (key === 'y' || (key === 'z' && shift)) {
        event.preventDefault()
        editorStore.redo()
      } else if (key === 'c') {
        event.preventDefault()
        editorStore.copySelectedNotes()
      } else if (key === 'x') {
        event.preventDefault()
        editorStore.cutSelectedNotes()
      } else if (key === 'v') {
        event.preventDefault()
        editorStore.pasteNotes(playbackStore.currentTime)
      } else if (key === 'd') {
        event.preventDefault()
        editorStore.duplicateSelectedNotes()
      }
      return
    }

    // --- Pending note: Enter confirms, Escape cancels ---
    if (editorStore.pendingNote) {
      if (key === 'Enter') {
        event.preventDefault()
        editorStore.confirmPendingNote()
        return
      }
      if (key === 'Escape') {
        event.preventDefault()
        editorStore.cancelPendingNote()
        return
      }
    }

    // --- Delete ---
    if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault()
      editorStore.deleteSelectedNotes()
      return
    }

    // --- Tool switching (1/2/3 or V/B/N) ---
    if (key === '1' || key === 'v') {
      event.preventDefault()
      editorStore.activeTool = 'select'
      return
    }
    if (key === '2' || key === 'b') {
      event.preventDefault()
      editorStore.activeTool = 'pencil'
      return
    }
    if (key === '3' || key === 'n') {
      event.preventDefault()
      editorStore.activeTool = 'eraser'
      return
    }

    // --- Add note at playhead (two-step: A → preview, click/Enter → confirm) ---
    if (key === 'a') {
      event.preventDefault()
      if (editorStore.pendingNote) {
        editorStore.cancelPendingNote()
      }
      editorStore.startPendingNote(playbackStore.currentTime, 60)
      return
    }

    // --- Arrow keys: move/transpose selected notes ---
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      if (!editorStore.hasSelection) return
      event.preventDefault()

      if (key === 'ArrowUp') {
        editorStore.moveSelectedNotes(0, shift ? 12 : 1)
      } else if (key === 'ArrowDown') {
        editorStore.moveSelectedNotes(0, shift ? -12 : -1)
      } else if (key === 'ArrowRight') {
        editorStore.moveSelectedNotes(editorStore.getSnapGridSize(), 0)
      } else if (key === 'ArrowLeft') {
        editorStore.moveSelectedNotes(-editorStore.getSnapGridSize(), 0)
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
  })
}
