import type { EditableNote } from '../types/note-editor.types'

const PPQ = 480

/** Encode a value as MIDI variable-length quantity */
function writeVarLen(value: number): number[] {
  const bytes: number[] = []
  bytes.push(value & 0x7f)
  value >>= 7
  while (value > 0) {
    bytes.push((value & 0x7f) | 0x80)
    value >>= 7
  }
  return bytes.reverse()
}

/** Convert seconds to ticks given BPM */
function secondsToTicks(seconds: number, bpm: number): number {
  const ticksPerSecond = (PPQ * bpm) / 60
  return Math.round(seconds * ticksPerSecond)
}

interface NoteEvent {
  tick: number
  type: 'on' | 'off'
  midi: number
  velocity: number
  channel: number
}

/**
 * Export editable notes to SMF Format 1 binary (.mid).
 * Track 0 = tempo track, Track 1+ = note tracks.
 */
export function exportToMidi(
  notesByTrack: Map<number, EditableNote[]>,
  bpm: number,
): Uint8Array {
  const trackBuffers: number[][] = []

  // --- Track 0: Tempo track ---
  const tempoTrack: number[] = []

  // Tempo meta event: FF 51 03 tt tt tt
  const microsecondsPerBeat = Math.round(60_000_000 / bpm)
  tempoTrack.push(...writeVarLen(0)) // delta=0
  tempoTrack.push(
    0xff, 0x51, 0x03,
    (microsecondsPerBeat >> 16) & 0xff,
    (microsecondsPerBeat >> 8) & 0xff,
    microsecondsPerBeat & 0xff,
  )

  // Time signature: 4/4
  tempoTrack.push(...writeVarLen(0))
  tempoTrack.push(0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08)

  // End of track
  tempoTrack.push(...writeVarLen(0))
  tempoTrack.push(0xff, 0x2f, 0x00)

  trackBuffers.push(tempoTrack)

  // --- Note tracks ---
  const sortedTrackIndices = [...notesByTrack.keys()].sort((a, b) => a - b)

  for (const trackIndex of sortedTrackIndices) {
    const notes = notesByTrack.get(trackIndex)!
    const channel = trackIndex % 16
    const trackData: number[] = []

    // Track name
    const trackName = `Track ${trackIndex + 1}`
    trackData.push(...writeVarLen(0))
    trackData.push(0xff, 0x03, trackName.length)
    for (const ch of trackName) trackData.push(ch.charCodeAt(0))

    // Build sorted note events (on + off)
    const events: NoteEvent[] = []
    for (const note of notes) {
      const startTick = secondsToTicks(note.time, bpm)
      const endTick = secondsToTicks(note.time + note.duration, bpm)
      const vel = Math.round(note.velocity * 127)

      events.push({ tick: startTick, type: 'on', midi: note.midi, velocity: vel, channel })
      events.push({ tick: endTick, type: 'off', midi: note.midi, velocity: 0, channel })
    }

    // Sort: by tick, then note-off before note-on at same tick
    events.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick
      if (a.type !== b.type) return a.type === 'off' ? -1 : 1
      return a.midi - b.midi
    })

    // Write events with delta times
    let lastTick = 0
    for (const ev of events) {
      const delta = ev.tick - lastTick
      trackData.push(...writeVarLen(delta))

      const statusByte = ev.type === 'on' ? (0x90 | ev.channel) : (0x80 | ev.channel)
      trackData.push(statusByte, ev.midi, ev.velocity)
      lastTick = ev.tick
    }

    // End of track
    trackData.push(...writeVarLen(0))
    trackData.push(0xff, 0x2f, 0x00)

    trackBuffers.push(trackData)
  }

  // --- Assemble file ---
  // Header: MThd + length(6) + format(1) + numTracks + PPQ
  const numTracks = trackBuffers.length
  const header = new Uint8Array(14)
  const headerView = new DataView(header.buffer)

  // "MThd"
  header[0] = 0x4d; header[1] = 0x54; header[2] = 0x68; header[3] = 0x64
  headerView.setUint32(4, 6) // header data length
  headerView.setUint16(8, 1) // format 1
  headerView.setUint16(10, numTracks)
  headerView.setUint16(12, PPQ)

  // Track chunks
  const chunks: Uint8Array[] = [header]

  for (const trackData of trackBuffers) {
    const trackChunkHeader = new Uint8Array(8)
    const trackView = new DataView(trackChunkHeader.buffer)
    // "MTrk"
    trackChunkHeader[0] = 0x4d; trackChunkHeader[1] = 0x54
    trackChunkHeader[2] = 0x72; trackChunkHeader[3] = 0x6b
    trackView.setUint32(4, trackData.length)

    chunks.push(trackChunkHeader)
    chunks.push(new Uint8Array(trackData))
  }

  // Concatenate all chunks
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

/** Trigger browser download of a MIDI file */
export function downloadMidi(data: Uint8Array, filename: string): void {
  const blob = new Blob([data], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
