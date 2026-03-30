import type { SnapDivision } from '../types/note-editor.types'

export const DIVISION_FRACTIONS: Record<Exclude<SnapDivision, 'off'>, number> = {
  '1/1': 1,
  '1/2': 0.5,
  '1/4': 0.25,
  '1/8': 0.125,
  '1/16': 0.0625,
}

/**
 * Snap a time value to the nearest grid line.
 * @param time - Time in seconds
 * @param division - Snap division ('off' returns time unchanged)
 * @param secondsPerBeat - Duration of one beat in seconds (60 / bpm)
 */
export function snapTime(time: number, division: SnapDivision, secondsPerBeat: number): number {
  if (division === 'off' || secondsPerBeat <= 0) return time

  const gridSize = secondsPerBeat * DIVISION_FRACTIONS[division]!
  return Math.round(time / gridSize) * gridSize
}

/**
 * Snap a duration to the nearest grid line (minimum one grid unit).
 */
export function snapDuration(duration: number, division: SnapDivision, secondsPerBeat: number): number {
  if (division === 'off' || secondsPerBeat <= 0) return duration

  const gridSize = secondsPerBeat * DIVISION_FRACTIONS[division]!
  const snapped = Math.round(duration / gridSize) * gridSize
  return Math.max(gridSize, snapped)
}
