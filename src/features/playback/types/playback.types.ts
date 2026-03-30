/** Unified timed note event for Tone.js scheduling */
export interface TimedNoteEvent {
  /** MIDI note number (0-127), e.g. 60 = C4 */
  midi: number
  /** Note name in scientific pitch notation, e.g. "C4", "F#5" */
  note: string
  /** Start time in seconds */
  time: number
  /** Duration in seconds */
  duration: number
  /** Velocity 0-1 */
  velocity: number
}

/** A track of timed events */
export interface PlaybackTrack {
  name: string
  events: TimedNoteEvent[]
}

/** Complete playback-ready data derived from either MIDI or MusicXML */
export interface PlaybackData {
  tracks: PlaybackTrack[]
  /** Total duration in seconds */
  duration: number
  /** Initial tempo in BPM */
  bpm: number
}

export type PlaybackState = 'stopped' | 'playing' | 'paused'

/** Actions that trigger state transitions */
export type PlaybackAction = 'play' | 'pause' | 'stop'

/** Snapshot of a single track's state */
export interface TrackSnapshot {
  readonly index: number
  readonly name: string
  readonly muted: boolean
  readonly solo: boolean
  readonly volumeDb: number
}

/** Complete engine state snapshot, pushed to Pinia bridge */
export interface EngineSnapshot {
  readonly state: PlaybackState
  readonly currentTime: number
  readonly duration: number
  readonly bpm: number
  readonly isAudioReady: boolean
  readonly activeFileId: string | null
  readonly tracks: readonly TrackSnapshot[]
}

export type EngineStateChangeCallback = (snapshot: EngineSnapshot) => void

export interface PlaybackEngineConfig {
  onStateChange: EngineStateChangeCallback
}
