import type { ParsedMusicXml, MusicXmlPart } from '@/features/file-import/types/file.types'
import type { PlaybackData, PlaybackTrack, TimedNoteEvent } from '../types/playback.types'
import { pitchToMidi } from './note-utils'

const DEFAULT_BPM = 120
const DEFAULT_DIVISIONS = 1
const DEFAULT_VELOCITY = 0.8

const DYNAMICS_VELOCITY: Record<string, number> = {
  ppp: 0.15,
  pp: 0.25,
  p: 0.4,
  mp: 0.5,
  mf: 0.65,
  f: 0.8,
  ff: 0.9,
  fff: 1.0,
}

function pitchName(step: string, alter?: number, octave?: number): string {
  const accidental = alter === 1 ? '#' : alter === -1 ? 'b' : ''
  return `${step}${accidental}${octave ?? 4}`
}

interface ConvertResult {
  track: PlaybackTrack
  tempo: number | undefined
}

function convertPart(part: MusicXmlPart): ConvertResult {
  const events: TimedNoteEvent[] = []
  let currentTime = 0
  let divisions = DEFAULT_DIVISIONS
  let tempo: number | undefined
  let velocity = DEFAULT_VELOCITY
  let noteStartTime = 0

  for (const measure of part.measures) {
    if (measure.attributes) {
      if (measure.attributes.divisions !== undefined) {
        divisions = measure.attributes.divisions
      }
    }

    if (measure.directions) {
      for (const dir of measure.directions) {
        if (dir.tempo !== undefined && tempo === undefined) {
          tempo = dir.tempo
        }
        if (dir.dynamics !== undefined) {
          velocity = DYNAMICS_VELOCITY[dir.dynamics] ?? DEFAULT_VELOCITY
        }
      }
    }

    const effectiveTempo = tempo ?? DEFAULT_BPM

    for (const note of measure.notes) {
      const durationSec = (note.duration / divisions) * (60 / effectiveTempo)

      if (note.isChord) {
        if (!note.isRest && note.step !== undefined && note.octave !== undefined) {
          events.push({
            midi: pitchToMidi(note.step, note.octave, note.alter),
            note: pitchName(note.step, note.alter, note.octave),
            time: noteStartTime,
            duration: durationSec,
            velocity,
          })
        }
      } else {
        noteStartTime = currentTime
        if (!note.isRest && note.step !== undefined && note.octave !== undefined) {
          events.push({
            midi: pitchToMidi(note.step, note.octave, note.alter),
            note: pitchName(note.step, note.alter, note.octave),
            time: currentTime,
            duration: durationSec,
            velocity,
          })
        }
        currentTime += durationSec
      }
    }
  }

  return { track: { name: part.name, events }, tempo }
}

export function musicXmlToPlaybackData(parsed: ParsedMusicXml): PlaybackData {
  const results = parsed.parts.map(convertPart)
  const tracks = results.map((r) => r.track)

  const firstTempo = results.find((r) => r.tempo !== undefined)?.tempo
  const bpm = firstTempo ?? DEFAULT_BPM

  const duration = Math.max(
    ...tracks.map((t) =>
      t.events.length > 0 ? Math.max(...t.events.map((e) => e.time + e.duration)) : 0,
    ),
    0,
  )

  return { tracks, duration, bpm }
}
