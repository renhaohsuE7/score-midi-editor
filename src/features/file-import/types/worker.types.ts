import type { ParsedMidi } from './file.types'

// --- MIDI Worker ---

export interface MidiWorkerRequest {
  id: string
  buffer: ArrayBuffer
}

export interface MidiWorkerSuccess {
  id: string
  ok: true
  data: ParsedMidi
}

export interface MidiWorkerError {
  id: string
  ok: false
  error: string
}

export type MidiWorkerResponse = MidiWorkerSuccess | MidiWorkerError
