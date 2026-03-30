<script setup lang="ts">
import { useNoteEditorStore } from '../stores/note-editor.store'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'
import { exportToMidi, downloadMidi } from '../services/midi-export'
import type { EditorTool, EditableNote } from '../types/note-editor.types'

const editorStore = useNoteEditorStore()
const playbackStore = usePlaybackStore()

const tools: { value: EditorTool; label: string; title: string }[] = [
  { value: 'select', label: 'S', title: 'Select tool' },
  { value: 'pencil', label: 'P', title: 'Pencil tool (draw notes)' },
  { value: 'eraser', label: 'E', title: 'Eraser tool (click to delete)' },
]

function onExport() {
  // Group notes by track
  const byTrack = new Map<number, EditableNote[]>()
  for (const note of editorStore.editableNotes.values()) {
    let arr = byTrack.get(note.trackIndex)
    if (!arr) {
      arr = []
      byTrack.set(note.trackIndex, arr)
    }
    arr.push(note)
  }

  const bpm = playbackStore.bpm || 120
  const data = exportToMidi(byTrack, bpm)
  downloadMidi(data, 'export.mid')
}
</script>

<template>
  <div v-if="editorStore.isEditing" class="flex items-center gap-1">
    <button
      v-for="tool in tools"
      :key="tool.value"
      :title="tool.title"
      class="rounded px-2 py-0.5 text-xs font-medium"
      :class="
        editorStore.activeTool === tool.value
          ? 'bg-primary text-white'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      "
      @click="editorStore.activeTool = tool.value"
    >
      {{ tool.label }}
    </button>

    <span class="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />

    <!-- Undo / Redo -->
    <button
      title="Undo (Ctrl+Z)"
      class="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800"
      :disabled="!editorStore.canUndo"
      @click="editorStore.undo()"
    >
      &#x21A9;
    </button>
    <button
      title="Redo (Ctrl+Y)"
      class="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800"
      :disabled="!editorStore.canRedo"
      @click="editorStore.redo()"
    >
      &#x21AA;
    </button>

    <span class="mx-1 h-4 w-px bg-gray-300 dark:bg-gray-600" />

    <!-- Export -->
    <button
      title="Export as MIDI"
      class="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
      @click="onExport"
    >
      Export .mid
    </button>
  </div>
</template>
