import { ref, computed } from 'vue'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'
import { useNoteEditorStore } from '@/features/note-editor/stores/note-editor.store'

const DEFAULT_PIXELS_PER_SECOND = 100
const DEFAULT_NOTE_HEIGHT = 12
const MIDI_PADDING = 4 // extra semitones above/below note range
const EXTENSION_BARS = 4 // extra bars shown after content ends

export function usePianoRoll() {
  const playbackStore = usePlaybackStore()
  const editorStore = useNoteEditorStore()

  const pixelsPerSecond = ref(DEFAULT_PIXELS_PER_SECOND)
  const noteHeight = ref(DEFAULT_NOTE_HEIGHT)

  const midiRange = computed(() => {
    const tracks = playbackStore.playbackTracks
    let min = 127
    let max = 0

    for (const track of tracks) {
      for (const event of track.events) {
        if (event.midi < min) min = event.midi
        if (event.midi > max) max = event.midi
      }
    }

    if (min > max) {
      // No notes — default to C3-C6 range
      return { min: 48, max: 84 }
    }

    return {
      min: Math.max(0, min - MIDI_PADDING),
      max: Math.min(127, max + MIDI_PADDING),
    }
  })

  // effectiveDuration: max of original file duration and editor's furthest note
  const effectiveDuration = computed(() =>
    Math.max(playbackStore.duration, editorStore.maxEndTime),
  )

  const contentWidth = computed(() => effectiveDuration.value * pixelsPerSecond.value)

  const extensionDuration = computed(() => EXTENSION_BARS * 4 * secondsPerBeat.value)

  const totalWidth = computed(
    () => (effectiveDuration.value + extensionDuration.value) * pixelsPerSecond.value,
  )

  const totalHeight = computed(
    () => (midiRange.value.max - midiRange.value.min + 1) * noteHeight.value,
  )

  const secondsPerBeat = computed(() => (playbackStore.bpm > 0 ? 60 / playbackStore.bpm : 0.5))

  function timeToX(seconds: number): number {
    return seconds * pixelsPerSecond.value
  }

  function midiToY(midi: number): number {
    return (midiRange.value.max - midi) * noteHeight.value
  }

  function durationToWidth(duration: number): number {
    return duration * pixelsPerSecond.value
  }

  function zoomIn(): void {
    pixelsPerSecond.value = Math.min(pixelsPerSecond.value * 1.5, 500)
  }

  function zoomOut(): void {
    pixelsPerSecond.value = Math.max(pixelsPerSecond.value / 1.5, 20)
  }

  return {
    pixelsPerSecond,
    noteHeight,
    midiRange,
    contentWidth,
    totalWidth,
    totalHeight,
    secondsPerBeat,
    timeToX,
    midiToY,
    durationToWidth,
    zoomIn,
    zoomOut,
  }
}
