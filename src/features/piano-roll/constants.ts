/** Tailwind background classes for track color indicators */
export const TRACK_BG_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-red-500',
] as const

/** Hex colors matching TRACK_BG_COLORS for canvas/inline-style use */
export const TRACK_HEX_COLORS = [
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#eab308', // yellow-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#ef4444', // red-500
] as const

/** MIDI notes that are black keys (within an octave, 0-11) */
export const BLACK_KEY_OFFSETS = new Set([1, 3, 6, 8, 10])

export function isBlackKey(midi: number): boolean {
  return BLACK_KEY_OFFSETS.has(midi % 12)
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  const note = NOTE_NAMES[midi % 12]!
  return `${note}${octave}`
}
