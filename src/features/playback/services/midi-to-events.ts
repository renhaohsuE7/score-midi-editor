import type { ParsedMidi } from '@/features/file-import/types/file.types'
import type { PlaybackData, PlaybackTrack } from '../types/playback.types'

const DEFAULT_BPM = 120

export function midiToPlaybackData(parsed: ParsedMidi): PlaybackData {
  const bpm = parsed.tempos.length > 0 ? parsed.tempos[0]!.bpm : DEFAULT_BPM

  const tracks: PlaybackTrack[] = parsed.tracks
    .filter((track) => track.notes.length > 0)
    .map((track) => ({
      name: track.name || track.instrument || 'Track',
      events: track.notes.map((note) => ({
        midi: note.midi,
        note: note.name,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity,
      })),
    }))

  return { tracks, duration: parsed.duration, bpm }
}
