<script setup lang="ts">
import { computed } from 'vue'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'
import { useNoteEditorStore } from '@/features/note-editor/stores/note-editor.store'
import { TRACK_HEX_COLORS } from '../constants'

const RESIZE_HANDLE_WIDTH = 6

const props = defineProps<{
  maxMidi: number
  noteHeight: number
  pixelsPerSecond: number
}>()

const emit = defineEmits<{
  noteMousedown: [noteId: string, event: MouseEvent, zone: 'body' | 'resize-start' | 'resize-end']
  noteDblclick: [noteId: string, event: MouseEvent]
}>()

const playbackStore = usePlaybackStore()
const editorStore = useNoteEditorStore()

interface NoteRect {
  id: string
  left: number
  top: number
  width: number
  height: number
  color: string
  muted: boolean
  selected: boolean
  dragging: boolean
  pending: boolean
}

const noteRects = computed<NoteRect[]>(() => {
  if (editorStore.isEditing) {
    return notesFromEditor()
  }
  return notesFromPlayback()
})

function notesFromPlayback(): NoteRect[] {
  const rects: NoteRect[] = []
  const tracks = playbackStore.playbackTracks
  const trackSnapshots = playbackStore.tracks

  for (let ti = 0; ti < tracks.length; ti++) {
    const track = tracks[ti]!
    const color = TRACK_HEX_COLORS[ti % TRACK_HEX_COLORS.length]!
    const snapshot = trackSnapshots[ti]
    const muted = snapshot?.muted ?? false

    for (let ei = 0; ei < track.events.length; ei++) {
      const event = track.events[ei]!
      rects.push({
        id: `${ti}-${ei}`,
        left: event.time * props.pixelsPerSecond,
        top: (props.maxMidi - event.midi) * props.noteHeight,
        width: Math.max(event.duration * props.pixelsPerSecond, 2),
        height: props.noteHeight - 1,
        color,
        muted,
        selected: false,
        dragging: false,
        pending: false,
      })
    }
  }

  return rects
}

function notesFromEditor(): NoteRect[] {
  const rects: NoteRect[] = []
  const selectedIds = editorStore.selectedNoteIds
  const drag = editorStore.dragState

  for (const note of editorStore.editableNotes.values()) {
    const color = TRACK_HEX_COLORS[note.trackIndex % TRACK_HEX_COLORS.length]!
    const isSelected = selectedIds.has(note.id)
    const isDragTarget = drag && drag.originNotes.some((n) => n.id === note.id)

    let time = note.time
    let midi = note.midi
    let duration = note.duration

    // Apply drag preview
    if (isDragTarget && drag) {
      if (drag.type === 'move') {
        time = Math.max(0, note.time + drag.deltaTime)
        midi = Math.max(0, Math.min(127, note.midi + drag.deltaMidi))
      } else if (drag.type === 'resize-end') {
        duration = Math.max(0.01, note.duration + drag.deltaTime)
      } else if (drag.type === 'resize-start') {
        const newTime = Math.max(0, note.time + drag.deltaTime)
        const timeDelta = newTime - note.time
        time = newTime
        duration = Math.max(0.01, note.duration - timeDelta)
      }
    }

    rects.push({
      id: note.id,
      left: time * props.pixelsPerSecond,
      top: (props.maxMidi - midi) * props.noteHeight,
      width: Math.max(duration * props.pixelsPerSecond, 2),
      height: props.noteHeight - 1,
      color,
      muted: false,
      selected: isSelected,
      dragging: !!isDragTarget,
      pending: false,
    })
  }

  // Pending note preview (from A key)
  const pending = editorStore.pendingNote
  if (pending) {
    const pendingColor = TRACK_HEX_COLORS[pending.trackIndex % TRACK_HEX_COLORS.length]!
    rects.push({
      id: pending.id,
      left: pending.time * props.pixelsPerSecond,
      top: (props.maxMidi - pending.midi) * props.noteHeight,
      width: Math.max(pending.duration * props.pixelsPerSecond, 2),
      height: props.noteHeight - 1,
      color: pendingColor,
      muted: false,
      selected: true,
      dragging: false,
      pending: true,
    })
  }

  return rects
}

function detectZone(event: MouseEvent, rect: NoteRect): 'body' | 'resize-start' | 'resize-end' {
  const target = event.currentTarget as HTMLElement
  const localX = event.clientX - target.getBoundingClientRect().left

  if (rect.width > RESIZE_HANDLE_WIDTH * 3) {
    if (localX <= RESIZE_HANDLE_WIDTH) return 'resize-start'
    if (localX >= rect.width - RESIZE_HANDLE_WIDTH) return 'resize-end'
  }

  return 'body'
}

function onNoteMousedown(rect: NoteRect, event: MouseEvent) {
  event.stopPropagation()
  const zone = detectZone(event, rect)
  emit('noteMousedown', rect.id, event, zone)
}

function onNoteDblclick(rect: NoteRect, event: MouseEvent) {
  event.stopPropagation()
  emit('noteDblclick', rect.id, event)
}

function getCursor(event: MouseEvent, rect: NoteRect): string {
  if (!editorStore.isEditing) return 'default'
  if (editorStore.isDragging) return 'grabbing'

  const target = event.currentTarget as HTMLElement
  const localX = event.clientX - target.getBoundingClientRect().left

  if (rect.width > RESIZE_HANDLE_WIDTH * 3) {
    if (localX <= RESIZE_HANDLE_WIDTH || localX >= rect.width - RESIZE_HANDLE_WIDTH) {
      return 'ew-resize'
    }
  }

  return 'grab'
}

function onNoteMousemove(event: MouseEvent, rect: NoteRect) {
  const target = event.currentTarget as HTMLElement
  target.style.cursor = getCursor(event, rect)
}
</script>

<template>
  <div class="absolute inset-0" :class="{ 'pointer-events-none': !editorStore.isEditing }">
    <div
      v-for="rect in noteRects"
      :key="rect.id"
      class="absolute rounded-sm"
      :class="{
        'ring-2 ring-white': rect.selected,
      }"
      :style="{
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        backgroundColor: rect.color,
        opacity: rect.pending ? 0.5 : rect.muted ? 0.25 : rect.selected ? 1 : rect.dragging ? 0.6 : 0.85,
      }"
      @mousedown="editorStore.isEditing ? onNoteMousedown(rect, $event) : undefined"
      @mousemove="editorStore.isEditing ? onNoteMousemove($event, rect) : undefined"
      @dblclick="editorStore.isEditing ? onNoteDblclick(rect, $event) : undefined"
    />
  </div>
</template>
