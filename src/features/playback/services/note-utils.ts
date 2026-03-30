const STEP_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

/**
 * Convert pitch components to MIDI number.
 * e.g. pitchToMidi('C', 4) → 60, pitchToMidi('F', 4, 1) → 66
 */
export function pitchToMidi(step: string, octave: number, alter?: number): number {
  return 12 * (octave + 1) + (STEP_SEMITONE[step] ?? 0) + (alter ?? 0)
}

/**
 * Convert scientific pitch notation to MIDI number.
 * e.g. "C4" → 60, "C#4" → 61, "Bb3" → 58, "D4" → 62
 */
export function noteNameToMidi(name: string): number {
  const match = name.match(/^([A-G])(#|b)?(\d+)$/)
  if (!match) return 0

  const step = match[1]!
  const accidental = match[2]
  const octave = Number(match[3])
  const alter = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0

  return pitchToMidi(step, octave, alter)
}
