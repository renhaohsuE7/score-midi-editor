import { onUnmounted } from 'vue'
import type { Ref } from 'vue'
import { useNoteEditorStore } from '../stores/note-editor.store'
import type { DragState } from '../types/note-editor.types'

interface DragOptions {
  pixelsPerSecond: Ref<number>
  noteHeight: Ref<number>
}

/**
 * Composable that manages the full drag lifecycle for note editing:
 * mousedown → window mousemove → window mouseup
 *
 * Must be used in a Vue component setup context (registers onUnmounted cleanup).
 */
export function useNoteDrag(options: DragOptions) {
  const editorStore = useNoteEditorStore()

  let startX = 0
  let startY = 0

  function beginDrag(
    type: DragState['type'],
    noteId: string,
    event: MouseEvent,
  ): void {
    // Ensure the note is selected (if not already)
    if (!editorStore.selectedNoteIds.has(noteId)) {
      editorStore.selectNote(noteId, event.shiftKey)
    }

    const selectedIds = Array.from(editorStore.selectedNoteIds)
    if (selectedIds.length === 0) return

    startX = event.clientX
    startY = event.clientY

    editorStore.startDrag(type, selectedIds)

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keydown', onKeyDown)
  }

  function onMouseMove(event: MouseEvent): void {
    const dx = event.clientX - startX
    const dy = event.clientY - startY

    const deltaTime = dx / options.pixelsPerSecond.value
    const deltaMidi = -Math.round(dy / options.noteHeight.value)

    editorStore.updateDrag(deltaTime, deltaMidi)
  }

  function onMouseUp(): void {
    editorStore.commitDrag()
    cleanup()
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      editorStore.cancelDrag()
      cleanup()
    }
  }

  function cleanup(): void {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('keydown', onKeyDown)
  }

  onUnmounted(cleanup)

  return { beginDrag }
}
