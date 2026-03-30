import { pitchToMidi, noteNameToMidi } from './note-utils'

describe('pitchToMidi', () => {
  it('converts C4 to 60', () => {
    expect(pitchToMidi('C', 4)).toBe(60)
  })

  it('converts A4 to 69', () => {
    expect(pitchToMidi('A', 4)).toBe(69)
  })

  it('converts C0 to 12', () => {
    expect(pitchToMidi('C', 0)).toBe(12)
  })

  it('handles sharp (alter=1)', () => {
    expect(pitchToMidi('F', 4, 1)).toBe(66) // F#4
  })

  it('handles flat (alter=-1)', () => {
    expect(pitchToMidi('B', 3, -1)).toBe(58) // Bb3
  })

  it('handles undefined alter', () => {
    expect(pitchToMidi('D', 4)).toBe(62)
    expect(pitchToMidi('D', 4, undefined)).toBe(62)
  })
})

describe('noteNameToMidi', () => {
  it('parses C4', () => {
    expect(noteNameToMidi('C4')).toBe(60)
  })

  it('parses C#4', () => {
    expect(noteNameToMidi('C#4')).toBe(61)
  })

  it('parses Bb3', () => {
    expect(noteNameToMidi('Bb3')).toBe(58)
  })

  it('parses D4', () => {
    expect(noteNameToMidi('D4')).toBe(62)
  })

  it('parses G#5', () => {
    expect(noteNameToMidi('G#5')).toBe(80)
  })

  it('returns 0 for invalid input', () => {
    expect(noteNameToMidi('')).toBe(0)
    expect(noteNameToMidi('X4')).toBe(0)
    expect(noteNameToMidi('C')).toBe(0)
  })
})
