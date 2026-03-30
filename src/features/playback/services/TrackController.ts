import type { TimedNoteEvent, TrackSnapshot } from '../types/playback.types'

type ToneModule = typeof import('tone')
type Transport = ReturnType<ToneModule['getTransport']>

export class TrackController {
  readonly index: number
  readonly name: string

  private _muted = false
  private _solo = false
  private _volumeDb = 0
  private _synth: InstanceType<ToneModule['PolySynth']> | null = null
  private _volume: InstanceType<ToneModule['Volume']> | null = null
  private _scheduledIds: number[] = []
  private _Tone: ToneModule

  constructor(index: number, name: string, Tone: ToneModule) {
    this.index = index
    this.name = name
    this._Tone = Tone
  }

  get muted(): boolean {
    return this._muted
  }
  get solo(): boolean {
    return this._solo
  }
  get volumeDb(): number {
    return this._volumeDb
  }

  scheduleEvents(events: TimedNoteEvent[], transport: Transport): void {
    this._volume = new this._Tone.Volume(this._volumeDb).toDestination()
    this._synth = new this._Tone.PolySynth(this._Tone.Synth, {
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.2 },
    }).connect(this._volume)

    for (const event of events) {
      const id = transport.schedule((time) => {
        this._synth?.triggerAttackRelease(event.note, event.duration, time, event.velocity)
      }, event.time)
      this._scheduledIds.push(id)
    }
  }

  setMuted(muted: boolean): void {
    this._muted = muted
    this._applyOutput()
  }

  setSolo(solo: boolean): void {
    this._solo = solo
  }

  setVolume(volumeDb: number): void {
    this._volumeDb = volumeDb
    if (this._volume) {
      this._volume.volume.value = volumeDb
    }
  }

  /** Called by engine after any solo change */
  updateEffectiveOutput(anySoloed: boolean): void {
    if (anySoloed) {
      this._setMuteState(!this._solo)
    } else {
      this._applyOutput()
    }
  }

  releaseAll(): void {
    this._synth?.releaseAll()
  }

  dispose(transport: Transport): void {
    for (const id of this._scheduledIds) {
      transport.clear(id)
    }
    this._scheduledIds = []
    this._synth?.releaseAll()
    this._synth?.dispose()
    this._synth = null
    this._volume?.dispose()
    this._volume = null
  }

  toSnapshot(): TrackSnapshot {
    return {
      index: this.index,
      name: this.name,
      muted: this._muted,
      solo: this._solo,
      volumeDb: this._volumeDb,
    }
  }

  private _applyOutput(): void {
    this._setMuteState(this._muted)
  }

  private _setMuteState(shouldMute: boolean): void {
    if (this._volume) {
      this._volume.mute = shouldMute
    }
  }
}
