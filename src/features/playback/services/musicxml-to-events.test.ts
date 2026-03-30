import { musicXmlToPlaybackData } from './musicxml-to-events'
import type { ParsedMusicXml } from '@/features/file-import/types/file.types'

function makeParsed(overrides: Partial<ParsedMusicXml> = {}): ParsedMusicXml {
  return { title: 'Test', parts: [], ...overrides }
}

describe('musicXmlToPlaybackData', () => {
  it('returns empty tracks for empty parts', () => {
    const result = musicXmlToPlaybackData(makeParsed())
    expect(result.tracks).toHaveLength(0)
    expect(result.duration).toBe(0)
    expect(result.bpm).toBe(120)
  })

  it('converts a single quarter note (divisions=1, tempo=120)', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                notes: [
                  { step: 'C', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
            ],
          },
        ],
      }),
    )

    expect(result.tracks).toHaveLength(1)
    expect(result.tracks[0]!.events).toHaveLength(1)

    const event = result.tracks[0]!.events[0]!
    expect(event.midi).toBe(60)
    expect(event.note).toBe('C4')
    expect(event.time).toBe(0)
    expect(event.duration).toBeCloseTo(0.5) // (1/1)*(60/120)=0.5
    expect(event.velocity).toBe(0.8)
  })

  it('converts a scale of 4 quarter notes with correct timing', () => {
    const notes = ['C', 'D', 'E', 'F'].map((step) => ({
      step,
      octave: 4,
      duration: 1,
      isRest: false,
      isChord: false,
      dots: 0,
    }))

    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [{ number: 1, attributes: { divisions: 1 }, notes }],
          },
        ],
      }),
    )

    const events = result.tracks[0]!.events
    expect(events).toHaveLength(4)
    expect(events[0]!.time).toBeCloseTo(0)
    expect(events[1]!.time).toBeCloseTo(0.5)
    expect(events[2]!.time).toBeCloseTo(1.0)
    expect(events[3]!.time).toBeCloseTo(1.5)
    expect(result.duration).toBeCloseTo(2.0)
  })

  it('sets correct midi numbers for scale notes', () => {
    const notes = ['C', 'D', 'E', 'F'].map((step) => ({
      step,
      octave: 4,
      duration: 1,
      isRest: false,
      isChord: false,
      dots: 0,
    }))

    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [{ number: 1, attributes: { divisions: 1 }, notes }],
          },
        ],
      }),
    )

    const events = result.tracks[0]!.events
    expect(events[0]!.midi).toBe(60) // C4
    expect(events[1]!.midi).toBe(62) // D4
    expect(events[2]!.midi).toBe(64) // E4
    expect(events[3]!.midi).toBe(65) // F4
  })

  it('handles rests (advance time, no event)', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                notes: [
                  { duration: 1, isRest: true, isChord: false, dots: 0 },
                  { step: 'D', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
            ],
          },
        ],
      }),
    )

    const events = result.tracks[0]!.events
    expect(events).toHaveLength(1)
    expect(events[0]!.note).toBe('D4')
    expect(events[0]!.midi).toBe(62)
    expect(events[0]!.time).toBeCloseTo(0.5) // rest advanced time by 0.5s
  })

  it('handles chords (same start time)', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                notes: [
                  { step: 'C', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                  { step: 'E', octave: 4, duration: 1, isRest: false, isChord: true, dots: 0 },
                  { step: 'G', octave: 4, duration: 1, isRest: false, isChord: true, dots: 0 },
                ],
              },
            ],
          },
        ],
      }),
    )

    const events = result.tracks[0]!.events
    expect(events).toHaveLength(3)
    expect(events[0]!.time).toBe(0)
    expect(events[1]!.time).toBe(0)
    expect(events[2]!.time).toBe(0)
    expect(events[0]!.note).toBe('C4')
    expect(events[1]!.note).toBe('E4')
    expect(events[2]!.note).toBe('G4')
    expect(events[0]!.midi).toBe(60)
    expect(events[1]!.midi).toBe(64)
    expect(events[2]!.midi).toBe(67)
  })

  it('handles sharps and flats', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                notes: [
                  {
                    step: 'F',
                    octave: 4,
                    alter: 1,
                    duration: 1,
                    isRest: false,
                    isChord: false,
                    dots: 0,
                  },
                  {
                    step: 'B',
                    octave: 3,
                    alter: -1,
                    duration: 1,
                    isRest: false,
                    isChord: false,
                    dots: 0,
                  },
                ],
              },
            ],
          },
        ],
      }),
    )

    expect(result.tracks[0]!.events[0]!.note).toBe('F#4')
    expect(result.tracks[0]!.events[0]!.midi).toBe(66)
    expect(result.tracks[0]!.events[1]!.note).toBe('Bb3')
    expect(result.tracks[0]!.events[1]!.midi).toBe(58)
  })

  it('handles division changes mid-piece', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                notes: [
                  { step: 'C', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
              {
                number: 2,
                attributes: { divisions: 2 },
                notes: [
                  // With divisions=2, duration=1 means an eighth note: (1/2)*(60/120) = 0.25s
                  { step: 'D', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
            ],
          },
        ],
      }),
    )

    const events = result.tracks[0]!.events
    expect(events[0]!.duration).toBeCloseTo(0.5) // quarter note
    expect(events[1]!.duration).toBeCloseTo(0.25) // eighth note
    expect(events[1]!.time).toBeCloseTo(0.5) // starts after first note
  })

  it('handles part with only rests (no events but correct duration)', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                notes: [
                  { duration: 4, isRest: true, isChord: false, dots: 0 },
                ],
              },
            ],
          },
        ],
      }),
    )

    expect(result.tracks[0]!.events).toHaveLength(0)
    expect(result.duration).toBe(0)
  })

  it('extracts tempo from direction sound element', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                directions: [{ tempo: 140 }],
                notes: [
                  { step: 'C', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
            ],
          },
        ],
      }),
    )

    expect(result.bpm).toBe(140)
    // Duration should use extracted tempo: (1/1)*(60/140) ≈ 0.4286
    expect(result.tracks[0]!.events[0]!.duration).toBeCloseTo(60 / 140)
  })

  it('uses first tempo found across parts', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                directions: [{ tempo: 100 }],
                notes: [
                  { step: 'C', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
            ],
          },
          {
            id: 'P2',
            name: 'Violin',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                directions: [{ tempo: 160 }],
                notes: [
                  { step: 'G', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
            ],
          },
        ],
      }),
    )

    expect(result.bpm).toBe(100)
  })

  it('applies dynamics to velocity', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                directions: [{ dynamics: 'ff' }],
                notes: [
                  { step: 'C', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
            ],
          },
        ],
      }),
    )

    expect(result.tracks[0]!.events[0]!.velocity).toBe(0.9)
  })

  it('dynamics change applies to subsequent notes', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                directions: [{ dynamics: 'p' }],
                notes: [
                  { step: 'C', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
              {
                number: 2,
                notes: [
                  { step: 'D', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
              {
                number: 3,
                directions: [{ dynamics: 'f' }],
                notes: [
                  { step: 'E', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
            ],
          },
        ],
      }),
    )

    const events = result.tracks[0]!.events
    expect(events[0]!.velocity).toBe(0.4) // p
    expect(events[1]!.velocity).toBe(0.4) // still p (carried over)
    expect(events[2]!.velocity).toBe(0.8) // f
  })

  it('defaults to 120 BPM and 0.8 velocity without directions', () => {
    const result = musicXmlToPlaybackData(
      makeParsed({
        parts: [
          {
            id: 'P1',
            name: 'Piano',
            measures: [
              {
                number: 1,
                attributes: { divisions: 1 },
                notes: [
                  { step: 'C', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                ],
              },
            ],
          },
        ],
      }),
    )

    expect(result.bpm).toBe(120)
    expect(result.tracks[0]!.events[0]!.velocity).toBe(0.8)
  })
})
