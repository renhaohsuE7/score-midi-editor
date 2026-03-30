import { midiToPlaybackData } from './midi-to-events'
import type { ParsedMidi } from '@/features/file-import/types/file.types'

function makeMidi(overrides: Partial<ParsedMidi> = {}): ParsedMidi {
  return {
    name: 'Test',
    duration: 4,
    ppq: 480,
    tempos: [{ bpm: 120, time: 0, ticks: 0 }],
    timeSignatures: [{ beats: 4, beatType: 4, time: 0, ticks: 0 }],
    tracks: [],
    ...overrides,
  }
}

describe('midiToPlaybackData', () => {
  it('returns empty tracks when no tracks have notes', () => {
    const result = midiToPlaybackData(makeMidi())
    expect(result.tracks).toHaveLength(0)
    expect(result.duration).toBe(4)
    expect(result.bpm).toBe(120)
  })

  it('maps note fields directly', () => {
    const result = midiToPlaybackData(
      makeMidi({
        tracks: [
          {
            name: 'Piano',
            channel: 0,
            instrument: 'acoustic grand piano',
            notes: [
              { midi: 60, name: 'C4', time: 0, duration: 0.5, ticks: 0, durationTicks: 240, velocity: 0.8 },
              { midi: 62, name: 'D4', time: 0.5, duration: 0.5, ticks: 240, durationTicks: 240, velocity: 0.7 },
            ],
          },
        ],
      }),
    )

    expect(result.tracks).toHaveLength(1)
    expect(result.tracks[0]!.name).toBe('Piano')

    const events = result.tracks[0]!.events
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ midi: 60, note: 'C4', time: 0, duration: 0.5, velocity: 0.8 })
    expect(events[1]).toEqual({ midi: 62, note: 'D4', time: 0.5, duration: 0.5, velocity: 0.7 })
  })

  it('filters out empty tracks', () => {
    const result = midiToPlaybackData(
      makeMidi({
        tracks: [
          { name: 'Empty', channel: 0, instrument: '', notes: [] },
          {
            name: 'Piano',
            channel: 0,
            instrument: 'acoustic grand piano',
            notes: [
              { midi: 60, name: 'C4', time: 0, duration: 1, ticks: 0, durationTicks: 480, velocity: 0.8 },
            ],
          },
        ],
      }),
    )

    expect(result.tracks).toHaveLength(1)
    expect(result.tracks[0]!.name).toBe('Piano')
  })

  it('uses instrument name as fallback when track name is empty', () => {
    const result = midiToPlaybackData(
      makeMidi({
        tracks: [
          {
            name: '',
            channel: 0,
            instrument: 'violin',
            notes: [
              { midi: 60, name: 'C4', time: 0, duration: 1, ticks: 0, durationTicks: 480, velocity: 0.8 },
            ],
          },
        ],
      }),
    )

    expect(result.tracks[0]!.name).toBe('violin')
  })

  it('defaults to 120 BPM when no tempos', () => {
    const result = midiToPlaybackData(makeMidi({ tempos: [] }))
    expect(result.bpm).toBe(120)
  })

  it('uses first tempo entry for BPM', () => {
    const result = midiToPlaybackData(
      makeMidi({
        tempos: [
          { bpm: 140, time: 0, ticks: 0 },
          { bpm: 100, time: 2, ticks: 960 },
        ],
      }),
    )
    expect(result.bpm).toBe(140)
  })
})
