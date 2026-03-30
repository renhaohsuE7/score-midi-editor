<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'
import { useNoteEditorStore } from '@/features/note-editor/stores/note-editor.store'
import { useNoteDrag } from '@/features/note-editor/composables/useNoteDrag'
import { useNoteCreate } from '@/features/note-editor/composables/useNoteCreate'
import { useKeyboardShortcuts } from '@/features/note-editor/composables/useKeyboardShortcuts'
import EditorToolbar from '@/features/note-editor/components/EditorToolbar.vue'
import { usePianoRoll } from '../composables/usePianoRoll'
import PianoRollKeyboard from './PianoRollKeyboard.vue'
import PianoRollTimeRuler from './PianoRollTimeRuler.vue'
import PianoRollGrid from './PianoRollGrid.vue'
import PianoRollNotes from './PianoRollNotes.vue'
import PianoRollPlayhead from './PianoRollPlayhead.vue'

const playbackStore = usePlaybackStore()
const editorStore = useNoteEditorStore()
const {
  pixelsPerSecond,
  noteHeight,
  midiRange,
  contentWidth,
  totalWidth,
  totalHeight,
  secondsPerBeat,
  zoomIn,
  zoomOut,
} = usePianoRoll()

const maxMidi = computed(() => midiRange.value.max)

const { beginDrag } = useNoteDrag({
  pixelsPerSecond,
  noteHeight,
})

const { handleGridClick, handleNoteClick } = useNoteCreate({
  pixelsPerSecond,
  noteHeight,
  maxMidi,
})

useKeyboardShortcuts()

// --- Velocity popup ---
const velocityPopup = ref<{ noteId: string; x: number; y: number; velocity: number } | null>(null)

function onNoteDblclick(noteId: string, event: MouseEvent) {
  const note = editorStore.editableNotes.get(noteId)
  if (!note) return
  velocityPopup.value = {
    noteId,
    x: event.clientX,
    y: event.clientY,
    velocity: note.velocity,
  }
}

function onVelocityChange(event: Event) {
  if (!velocityPopup.value) return
  const value = Number((event.target as HTMLInputElement).value) / 127
  velocityPopup.value.velocity = value
}

function commitVelocity() {
  if (!velocityPopup.value) return
  editorStore.setVelocity([velocityPopup.value.noteId], velocityPopup.value.velocity)
  velocityPopup.value = null
}

const mainScrollRef = ref<HTMLElement | null>(null)
const keyboardRef = ref<HTMLElement | null>(null)
const scrollX = ref(0)

function onMainScroll() {
  const el = mainScrollRef.value
  if (!el) return
  scrollX.value = el.scrollLeft
  if (keyboardRef.value) {
    keyboardRef.value.scrollTop = el.scrollTop
  }
}

// Initialize editor store when playback tracks change
watch(
  () => playbackStore.playbackTracks,
  (tracks) => {
    if (tracks.length > 0) {
      editorStore.initFromPlaybackTracks(tracks)
    } else {
      editorStore.reset()
    }
  },
  { immediate: true },
)

function onNoteMousedown(noteId: string, event: MouseEvent, zone: 'body' | 'resize-start' | 'resize-end') {
  // Eraser tool: delete on click
  if (editorStore.activeTool === 'eraser') {
    handleNoteClick(noteId)
    return
  }

  // Select first (shift adds to selection)
  if (!editorStore.selectedNoteIds.has(noteId)) {
    editorStore.selectNote(noteId, event.shiftKey)
  }

  // Start drag (select tool only)
  if (editorStore.activeTool === 'select') {
    const dragType = zone === 'body' ? 'move' : zone
    beginDrag(dragType, noteId, event)
  }
}

function onBackgroundMousedown(event: MouseEvent) {
  if (!editorStore.isEditing) return

  // Pending note (A key): click to confirm with current duration
  if (editorStore.pendingNote) {
    editorStore.confirmPendingNote()
    return
  }

  // Pencil tool: create note + start resize-end drag for duration
  if (editorStore.activeTool === 'pencil' && mainScrollRef.value) {
    const noteId = handleGridClick(event, mainScrollRef.value)
    if (noteId) {
      beginDrag('resize-end', noteId, event)
    }
    return
  }

  editorStore.clearSelection()
}

function onBackgroundMousemove(event: MouseEvent) {
  if (!editorStore.pendingNote || !mainScrollRef.value) return
  const rect = mainScrollRef.value.getBoundingClientRect()
  const x = event.clientX - rect.left + mainScrollRef.value.scrollLeft
  const endTime = x / pixelsPerSecond.value
  editorStore.updatePendingNoteDuration(endTime)
}

// Auto-scroll to keep playhead visible during playback
watch(
  () => playbackStore.currentTime,
  (time) => {
    if (!playbackStore.isPlaying || !mainScrollRef.value) return
    const el = mainScrollRef.value
    const xPos = time * pixelsPerSecond.value
    const viewLeft = el.scrollLeft
    const viewRight = viewLeft + el.clientWidth

    if (xPos > viewRight - 50 || xPos < viewLeft) {
      el.scrollLeft = xPos - el.clientWidth * 0.25
    }
  },
)
</script>

<template>
  <div class="flex h-full flex-col bg-white dark:bg-gray-900">
    <!-- Toolbar: Tools + Zoom + Snap -->
    <div class="flex shrink-0 items-center gap-4 border-b border-gray-200 px-3 py-1 dark:border-gray-700">
      <!-- Editor tools -->
      <EditorToolbar />

      <!-- Zoom -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500 dark:text-gray-400">Zoom</span>
        <button
          class="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          @click="zoomOut"
        >
          -
        </button>
        <button
          class="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          @click="zoomIn"
        >
          +
        </button>
      </div>

      <!-- Snap -->
      <div class="flex items-center gap-1">
        <span class="text-xs text-gray-500 dark:text-gray-400">Snap</span>
        <select
          :value="editorStore.snapDivision"
          class="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          @change="editorStore.snapDivision = ($event.target as HTMLSelectElement).value as any"
        >
          <option value="off">Off</option>
          <option value="1/1">1/1</option>
          <option value="1/2">1/2</option>
          <option value="1/4">1/4</option>
          <option value="1/8">1/8</option>
          <option value="1/16">1/16</option>
        </select>
      </div>
    </div>

    <!-- Main area: keyboard (left) + ruler (top) + scroll area -->
    <div class="flex min-h-0 flex-1">
      <!-- Keyboard column -->
      <div class="flex shrink-0 flex-col">
        <!-- Corner spacer (above keyboard, left of ruler) -->
        <div
          class="shrink-0 border-b border-r border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
          :style="{ width: '48px', height: '20px' }"
        />
        <!-- Keyboard, syncs scroll-y with main -->
        <div ref="keyboardRef" class="flex-1 overflow-hidden">
          <PianoRollKeyboard
            :min-midi="midiRange.min"
            :max-midi="midiRange.max"
            :note-height="noteHeight"
          />
        </div>
      </div>

      <!-- Right column: ruler + scrollable content -->
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- Ruler, syncs scroll-x with main via CSS transform -->
        <div class="shrink-0 overflow-hidden">
          <PianoRollTimeRuler
            :total-width="totalWidth"
            :seconds-per-beat="secondsPerBeat"
            :pixels-per-second="pixelsPerSecond"
            :style="{ transform: `translateX(-${scrollX}px)` }"
          />
        </div>

        <!-- Main scroll area (notes + grid + playhead) -->
        <div
          ref="mainScrollRef"
          class="flex-1 overflow-auto"
          @scroll="onMainScroll"
        >
          <div
            class="relative"
            :style="{ width: `${totalWidth}px`, height: `${totalHeight}px`, cursor: editorStore.pendingNote ? 'ew-resize' : undefined }"
            @mousedown="onBackgroundMousedown"
            @mousemove="onBackgroundMousemove"
          >
            <PianoRollGrid
              :min-midi="midiRange.min"
              :max-midi="midiRange.max"
              :note-height="noteHeight"
              :total-width="totalWidth"
              :seconds-per-beat="secondsPerBeat"
              :pixels-per-second="pixelsPerSecond"
            />
            <PianoRollNotes
              :max-midi="midiRange.max"
              :note-height="noteHeight"
              :pixels-per-second="pixelsPerSecond"
              @note-mousedown="onNoteMousedown"
              @note-dblclick="onNoteDblclick"
            />
            <!-- Extension zone: dark overlay after content ends -->
            <div
              v-if="contentWidth < totalWidth"
              class="pointer-events-none absolute inset-y-0 bg-black/15 dark:bg-black/30"
              :style="{ left: `${contentWidth}px`, width: `${totalWidth - contentWidth}px` }"
            />
            <PianoRollPlayhead
              :pixels-per-second="pixelsPerSecond"
              :total-height="totalHeight"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Velocity popup -->
    <div
      v-if="velocityPopup"
      class="fixed z-50 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-lg dark:border-gray-600 dark:bg-gray-800"
      :style="{ left: `${velocityPopup.x}px`, top: `${velocityPopup.y - 40}px` }"
    >
      <span class="text-xs text-gray-500 dark:text-gray-400">Vel</span>
      <input
        type="range"
        min="0"
        max="127"
        :value="Math.round(velocityPopup.velocity * 127)"
        class="w-24"
        @input="onVelocityChange"
      />
      <span class="w-6 text-center text-xs text-gray-600 dark:text-gray-300">
        {{ Math.round(velocityPopup.velocity * 127) }}
      </span>
      <button
        class="rounded bg-primary px-2 py-0.5 text-xs text-white"
        @click="commitVelocity"
      >
        OK
      </button>
    </div>
  </div>
</template>
