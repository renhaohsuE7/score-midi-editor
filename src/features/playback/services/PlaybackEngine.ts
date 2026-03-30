import type {
  PlaybackData,
  PlaybackState,
  PlaybackAction,
  EngineSnapshot,
  PlaybackEngineConfig,
} from '../types/playback.types'
import { TrackController } from './TrackController'

// --- State Machine ---

const TRANSITIONS: Record<PlaybackState, PlaybackAction[]> = {
  stopped: ['play'],
  playing: ['pause', 'stop'],
  paused: ['play', 'stop'],
}

export function canTransition(from: PlaybackState, action: PlaybackAction): boolean {
  return TRANSITIONS[from].includes(action)
}

export function nextState(action: PlaybackAction): PlaybackState {
  switch (action) {
    case 'play':
      return 'playing'
    case 'pause':
      return 'paused'
    case 'stop':
      return 'stopped'
  }
}

// --- Lazy Tone.js import ---

type ToneModule = typeof import('tone')

let ToneCache: ToneModule | null = null

async function getTone(): Promise<ToneModule> {
  if (!ToneCache) {
    ToneCache = await import('tone')
  }
  return ToneCache
}

// --- PlaybackEngine ---

export class PlaybackEngine {
  private _state: PlaybackState = 'stopped'
  private _currentTime = 0
  private _duration = 0
  private _bpm = 120
  private _isAudioReady = false
  private _activeFileId: string | null = null
  private _tracks: TrackController[] = []
  private _rafId: number | null = null
  private _onStateChange: PlaybackEngineConfig['onStateChange']
  private _Tone: ToneModule | null = null

  constructor(config: PlaybackEngineConfig) {
    this._onStateChange = config.onStateChange
  }

  get state(): PlaybackState {
    return this._state
  }
  get currentTime(): number {
    return this._currentTime
  }
  get duration(): number {
    return this._duration
  }
  get bpm(): number {
    return this._bpm
  }
  get isAudioReady(): boolean {
    return this._isAudioReady
  }
  get activeFileId(): string | null {
    return this._activeFileId
  }
  get tracks(): readonly TrackController[] {
    return this._tracks
  }

  async ensureAudioContext(): Promise<void> {
    if (!this._isAudioReady) {
      this._Tone = await getTone()
      await this._Tone.start()
      this._isAudioReady = true
      this._emit()
    }
  }

  async loadPlaybackData(fileId: string, data: PlaybackData): Promise<void> {
    if (this._state !== 'stopped') {
      this._executeStop()
    }
    this._clearTracks()

    this._Tone = await getTone()
    const transport = this._Tone.getTransport()
    transport.bpm.value = data.bpm
    transport.seconds = 0

    this._activeFileId = fileId
    this._duration = data.duration
    this._bpm = data.bpm
    this._currentTime = 0

    for (let i = 0; i < data.tracks.length; i++) {
      const track = data.tracks[i]!
      const controller = new TrackController(i, track.name, this._Tone)
      controller.scheduleEvents(track.events, transport)
      this._tracks.push(controller)
    }

    // Auto-stop at end — deferred to avoid Tone.js scheduling context issue
    transport.schedule(() => {
      setTimeout(() => this._executeStop(), 0)
    }, data.duration + 0.1)

    this._emit()
  }

  async play(): Promise<void> {
    if (!canTransition(this._state, 'play')) return
    if (!this._isAudioReady) await this.ensureAudioContext()
    this._Tone!.getTransport().start()
    this._state = nextState('play')
    this._startRaf()
    this._emit()
  }

  pause(): void {
    if (!canTransition(this._state, 'pause')) return
    this._Tone!.getTransport().pause()
    this._state = nextState('pause')
    this._stopRaf()
    this._emit()
  }

  stop(): void {
    if (!canTransition(this._state, 'stop')) return
    this._executeStop()
  }

  async togglePlayPause(): Promise<void> {
    if (this._state === 'playing') {
      this.pause()
    } else {
      await this.play()
    }
  }

  seek(seconds: number): void {
    if (this._Tone) {
      this._Tone.getTransport().seconds = seconds
    }
    this._currentTime = seconds
    this._emit()
  }

  // --- Per-track controls ---

  setTrackMuted(index: number, muted: boolean): void {
    this._tracks[index]?.setMuted(muted)
    this._emit()
  }

  setTrackSolo(index: number, solo: boolean): void {
    this._tracks[index]?.setSolo(solo)
    this._updateSoloRouting()
    this._emit()
  }

  setTrackVolume(index: number, volumeDb: number): void {
    this._tracks[index]?.setVolume(volumeDb)
    this._emit()
  }

  // --- Lifecycle ---

  dispose(): void {
    this._stopRaf()
    if (this._state !== 'stopped' && this._Tone) {
      this._Tone.getTransport().stop()
      this._Tone.getTransport().seconds = 0
    }
    this._clearTracks()
    this._state = 'stopped'
    this._currentTime = 0
    this._duration = 0
    this._activeFileId = null
    this._emit()
  }

  reset(): void {
    this.dispose()
    this._bpm = 120
    this._emit()
  }

  // --- Private ---

  private _executeStop(): void {
    if (this._Tone) {
      this._Tone.getTransport().stop()
      this._Tone.getTransport().seconds = 0
    }
    for (const track of this._tracks) {
      track.releaseAll()
    }
    this._state = 'stopped'
    this._currentTime = 0
    this._stopRaf()
    this._emit()
  }

  private _clearTracks(): void {
    if (this._Tone) {
      const transport = this._Tone.getTransport()
      for (const track of this._tracks) {
        track.dispose(transport)
      }
    }
    this._tracks = []
  }

  private _startRaf(): void {
    if (this._rafId !== null) return
    const tick = () => {
      if (this._state === 'playing' && this._Tone) {
        this._currentTime = this._Tone.getTransport().seconds
        this._emit()
      }
      this._rafId = requestAnimationFrame(tick)
    }
    this._rafId = requestAnimationFrame(tick)
  }

  private _stopRaf(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  private _updateSoloRouting(): void {
    const anySoloed = this._tracks.some((t) => t.solo)
    for (const track of this._tracks) {
      track.updateEffectiveOutput(anySoloed)
    }
  }

  private _emit(): void {
    this._onStateChange({
      state: this._state,
      currentTime: this._currentTime,
      duration: this._duration,
      bpm: this._bpm,
      isAudioReady: this._isAudioReady,
      activeFileId: this._activeFileId,
      tracks: this._tracks.map((t) => t.toSnapshot()),
    })
  }
}
