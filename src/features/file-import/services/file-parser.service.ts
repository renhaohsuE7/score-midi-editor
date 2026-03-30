import type { ParsedMidi, ParsedMusicXml } from '../types/file.types'
import type { MidiWorkerResponse } from '../types/worker.types'
import { parseMusicXml } from '../workers/musicxml-parser'

type PendingResolve<T> = {
  resolve: (value: T) => void
  reject: (reason: Error) => void
}

let midiWorker: Worker | null = null
const midiPending = new Map<string, PendingResolve<ParsedMidi>>()

function getMidiWorker(): Worker {
  if (!midiWorker) {
    midiWorker = new Worker(new URL('../workers/midi.worker.ts', import.meta.url), {
      type: 'module',
    })
    midiWorker.onmessage = (e: MessageEvent<MidiWorkerResponse>) => {
      const { id } = e.data
      const pending = midiPending.get(id)
      if (!pending) return
      midiPending.delete(id)
      if (e.data.ok) {
        pending.resolve(e.data.data)
      } else {
        pending.reject(new Error(e.data.error))
      }
    }
    midiWorker.onerror = (e) => {
      for (const [, pending] of midiPending) {
        pending.reject(new Error(e.message || 'MIDI worker error'))
      }
      midiPending.clear()
    }
  }
  return midiWorker
}

export function parseMidiFile(id: string, buffer: ArrayBuffer): Promise<ParsedMidi> {
  return new Promise((resolve, reject) => {
    midiPending.set(id, { resolve, reject })
    getMidiWorker().postMessage({ id, buffer }, [buffer])
  })
}

export function parseMusicXmlFile(_id: string, xml: string): Promise<ParsedMusicXml> {
  // DOMParser is main-thread only, so we parse synchronously here.
  // Wrapped in Promise to keep the API consistent with MIDI worker.
  return Promise.resolve(parseMusicXml(xml))
}

export function terminateWorkers(): void {
  midiWorker?.terminate()
  midiWorker = null
  midiPending.clear()
}
