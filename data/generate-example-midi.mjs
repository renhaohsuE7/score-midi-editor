/**
 * Generate a simple C Major Scale MIDI file (Standard MIDI Format 0).
 * Run: node data/generate-example-midi.mjs
 *
 * MIDI binary format reference:
 * - Header chunk: MThd + length(6) + format(0) + tracks(1) + division(480 ticks/beat)
 * - Track chunk: MTrk + length + events
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function writeVarLen(value) {
  const bytes = []
  bytes.push(value & 0x7f)
  value >>= 7
  while (value > 0) {
    bytes.push((value & 0x7f) | 0x80)
    value >>= 7
  }
  return bytes.reverse()
}

function buildMidi() {
  const ticksPerBeat = 480
  const channel = 0
  const velocity = 80
  const noteOnCmd = 0x90 | channel
  const noteOffCmd = 0x80 | channel

  // C Major Scale: C4=60, D4=62, E4=64, F4=65, G4=67, A4=69, B4=71, C5=72
  const notes = [60, 62, 64, 65, 67, 69, 71, 72]
  const noteDuration = ticksPerBeat // quarter note

  // Build track events
  const events = []

  // Tempo: 120 BPM = 500000 microseconds per beat
  events.push(...writeVarLen(0)) // delta time 0
  events.push(0xff, 0x51, 0x03, 0x07, 0xa1, 0x20) // tempo meta event

  // Time signature: 4/4
  events.push(...writeVarLen(0))
  events.push(0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08)

  // Track name
  const trackName = 'C Major Scale'
  events.push(...writeVarLen(0))
  events.push(0xff, 0x03, trackName.length)
  for (const ch of trackName) events.push(ch.charCodeAt(0))

  // Notes
  for (const note of notes) {
    events.push(...writeVarLen(0)) // delta 0
    events.push(noteOnCmd, note, velocity)

    events.push(...writeVarLen(noteDuration))
    events.push(noteOffCmd, note, 0)
  }

  // End of track
  events.push(...writeVarLen(0))
  events.push(0xff, 0x2f, 0x00)

  // Build track chunk
  const trackData = Buffer.from(events)
  const trackHeader = Buffer.alloc(8)
  trackHeader.write('MTrk', 0)
  trackHeader.writeUInt32BE(trackData.length, 4)

  // Build file header
  const fileHeader = Buffer.alloc(14)
  fileHeader.write('MThd', 0)
  fileHeader.writeUInt32BE(6, 4) // header length
  fileHeader.writeUInt16BE(0, 8) // format 0
  fileHeader.writeUInt16BE(1, 10) // 1 track
  fileHeader.writeUInt16BE(ticksPerBeat, 12)

  return Buffer.concat([fileHeader, trackHeader, trackData])
}

const midi = buildMidi()
const outPath = join(__dirname, 'c-major-scale.mid')
writeFileSync(outPath, midi)
console.log(`Written ${midi.length} bytes to ${outPath}`)
