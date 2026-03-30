import { Midi } from '@tonejs/midi'
import type { MidiWorkerRequest, MidiWorkerResponse } from '../types/worker.types'
import type { ParsedMidi } from '../types/file.types'

self.onmessage = (e: MessageEvent<MidiWorkerRequest>) => {
  const { id, buffer } = e.data
  try {
    const midi = new Midi(buffer)

    const parsed: ParsedMidi = {
      name: midi.name,
      duration: midi.duration,
      ppq: midi.header.ppq,
      tempos: midi.header.tempos.map((t) => ({
        bpm: t.bpm,
        time: t.time ?? 0,
        ticks: t.ticks,
      })),
      timeSignatures: midi.header.timeSignatures.map((ts) => ({
        beats: ts.timeSignature[0] ?? 4,
        beatType: ts.timeSignature[1] ?? 4,
        time: midi.header.ticksToSeconds(ts.ticks),
        ticks: ts.ticks,
      })),
      tracks: midi.tracks.map((track) => ({
        name: track.name,
        channel: track.channel,
        instrument: track.instrument.name,
        notes: track.notes.map((note) => ({
          midi: note.midi,
          name: note.name,
          time: note.time,
          duration: note.duration,
          ticks: note.ticks,
          durationTicks: note.durationTicks,
          velocity: note.velocity,
        })),
      })),
    }

    const response: MidiWorkerResponse = { id, ok: true, data: parsed }
    self.postMessage(response)
  } catch (err) {
    const response: MidiWorkerResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(response)
  }
}
