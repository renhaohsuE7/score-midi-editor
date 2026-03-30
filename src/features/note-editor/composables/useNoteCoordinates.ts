import type { Ref } from 'vue'

/**
 * Reverse coordinate functions for converting pixel positions back to music values.
 * Mirrors the forward functions in usePianoRoll.ts (timeToX, midiToY).
 */
export function useNoteCoordinates(
  pixelsPerSecond: Ref<number>,
  noteHeight: Ref<number>,
  maxMidi: Ref<number>,
) {
  /** Convert x pixel position to time in seconds */
  function xToTime(x: number): number {
    return x / pixelsPerSecond.value
  }

  /** Convert y pixel position to MIDI note number */
  function yToMidi(y: number): number {
    return maxMidi.value - Math.floor(y / noteHeight.value)
  }

  /** Convert pixel width to duration in seconds */
  function widthToDuration(width: number): number {
    return width / pixelsPerSecond.value
  }

  return { xToTime, yToMidi, widthToDuration }
}
