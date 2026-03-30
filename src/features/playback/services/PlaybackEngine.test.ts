import { canTransition, nextState, PlaybackEngine } from './PlaybackEngine'
import type { EngineSnapshot, PlaybackData } from '../types/playback.types'

// --- State machine pure function tests ---

describe('canTransition', () => {
  it('allows play from stopped', () => expect(canTransition('stopped', 'play')).toBe(true))
  it('disallows pause from stopped', () => expect(canTransition('stopped', 'pause')).toBe(false))
  it('disallows stop from stopped', () => expect(canTransition('stopped', 'stop')).toBe(false))
  it('allows pause from playing', () => expect(canTransition('playing', 'pause')).toBe(true))
  it('allows stop from playing', () => expect(canTransition('playing', 'stop')).toBe(true))
  it('disallows play from playing', () => expect(canTransition('playing', 'play')).toBe(false))
  it('allows play from paused', () => expect(canTransition('paused', 'play')).toBe(true))
  it('allows stop from paused', () => expect(canTransition('paused', 'stop')).toBe(true))
  it('disallows pause from paused', () => expect(canTransition('paused', 'pause')).toBe(false))
})

describe('nextState', () => {
  it('play → playing', () => expect(nextState('play')).toBe('playing'))
  it('pause → paused', () => expect(nextState('pause')).toBe('paused'))
  it('stop → stopped', () => expect(nextState('stop')).toBe('stopped'))
})

// --- PlaybackEngine tests ---

// Mock Tone.js
vi.mock('tone', () => {
  const mockSynth = {
    triggerAttackRelease: vi.fn(),
    releaseAll: vi.fn(),
    dispose: vi.fn(),
    connect: vi.fn().mockReturnThis(),
  }
  const mockVolume = {
    volume: { value: 0 },
    mute: false,
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
  }
  let transportState: 'stopped' | 'started' | 'paused' = 'stopped'
  let transportSeconds = 0
  return {
    start: vi.fn(async () => {}),
    PolySynth: vi.fn(function () { return mockSynth }),
    Synth: class {},
    Volume: vi.fn(function () { return mockVolume }),
    getTransport: vi.fn(() => ({
      bpm: { value: 120 },
      get seconds() {
        return transportSeconds
      },
      set seconds(v: number) {
        transportSeconds = v
      },
      get state() {
        return transportState
      },
      start: vi.fn(() => {
        transportState = 'started'
      }),
      pause: vi.fn(() => {
        transportState = 'paused'
      }),
      stop: vi.fn(() => {
        transportState = 'stopped'
        transportSeconds = 0
      }),
      schedule: vi.fn((_cb: unknown, _time: unknown) => 1),
      clear: vi.fn(),
    })),
  }
})

const testData: PlaybackData = {
  tracks: [
    {
      name: 'Piano',
      events: [{ note: 'C4', time: 0, duration: 0.5, velocity: 0.8 }],
    },
  ],
  duration: 4,
  bpm: 120,
}

describe('PlaybackEngine', () => {
  let snapshots: EngineSnapshot[]
  let engine: PlaybackEngine

  beforeEach(() => {
    vi.clearAllMocks()
    snapshots = []
    engine = new PlaybackEngine({
      onStateChange: (s) => snapshots.push(structuredClone(s)),
    })
  })

  it('starts with default state', () => {
    expect(engine.state).toBe('stopped')
    expect(engine.currentTime).toBe(0)
    expect(engine.duration).toBe(0)
    expect(engine.isAudioReady).toBe(false)
    expect(engine.activeFileId).toBeNull()
    expect(engine.tracks).toHaveLength(0)
  })

  it('ensureAudioContext sets isAudioReady and emits', async () => {
    await engine.ensureAudioContext()
    expect(engine.isAudioReady).toBe(true)
    expect(snapshots.length).toBeGreaterThan(0)
    expect(snapshots[snapshots.length - 1]!.isAudioReady).toBe(true)
  })

  it('loadPlaybackData creates tracks and emits', async () => {
    await engine.ensureAudioContext()
    await engine.loadPlaybackData('f1', testData)

    expect(engine.activeFileId).toBe('f1')
    expect(engine.duration).toBe(4)
    expect(engine.bpm).toBe(120)
    expect(engine.tracks).toHaveLength(1)
    expect(engine.tracks[0]!.name).toBe('Piano')
  })

  it('play transitions from stopped to playing', async () => {
    await engine.ensureAudioContext()
    await engine.loadPlaybackData('f1', testData)
    await engine.play()

    expect(engine.state).toBe('playing')
  })

  it('pause transitions from playing to paused', async () => {
    await engine.ensureAudioContext()
    await engine.loadPlaybackData('f1', testData)
    await engine.play()
    engine.pause()

    expect(engine.state).toBe('paused')
  })

  it('stop transitions from playing to stopped', async () => {
    await engine.ensureAudioContext()
    await engine.loadPlaybackData('f1', testData)
    await engine.play()
    engine.stop()

    expect(engine.state).toBe('stopped')
    expect(engine.currentTime).toBe(0)
  })

  it('ignores invalid transitions (pause while stopped)', async () => {
    engine.pause()
    expect(engine.state).toBe('stopped')
  })

  it('ignores invalid transitions (play while playing)', async () => {
    await engine.ensureAudioContext()
    await engine.loadPlaybackData('f1', testData)
    await engine.play()
    const countBefore = snapshots.length
    await engine.play() // should be no-op
    expect(snapshots.length).toBe(countBefore) // no new snapshot
  })

  it('seek updates currentTime and emits', async () => {
    await engine.ensureAudioContext()
    await engine.loadPlaybackData('f1', testData)
    engine.seek(2.5)

    expect(engine.currentTime).toBe(2.5)
    const last = snapshots[snapshots.length - 1]!
    expect(last.currentTime).toBe(2.5)
  })

  it('togglePlayPause alternates', async () => {
    await engine.ensureAudioContext()
    await engine.loadPlaybackData('f1', testData)

    await engine.togglePlayPause()
    expect(engine.state).toBe('playing')

    await engine.togglePlayPause()
    expect(engine.state).toBe('paused')
  })

  it('dispose resets to stopped', async () => {
    await engine.ensureAudioContext()
    await engine.loadPlaybackData('f1', testData)
    await engine.play()

    engine.dispose()

    expect(engine.state).toBe('stopped')
    expect(engine.currentTime).toBe(0)
    expect(engine.activeFileId).toBeNull()
    expect(engine.tracks).toHaveLength(0)
  })

  it('setTrackMuted delegates to TrackController', async () => {
    await engine.ensureAudioContext()
    await engine.loadPlaybackData('f1', testData)

    engine.setTrackMuted(0, true)
    expect(engine.tracks[0]!.muted).toBe(true)

    const last = snapshots[snapshots.length - 1]!
    expect(last.tracks[0]!.muted).toBe(true)
  })

  it('setTrackSolo handles solo routing', async () => {
    await engine.ensureAudioContext()
    const multiTrackData: PlaybackData = {
      tracks: [
        { name: 'Piano', events: [{ note: 'C4', time: 0, duration: 0.5, velocity: 0.8 }] },
        { name: 'Bass', events: [{ note: 'C2', time: 0, duration: 0.5, velocity: 0.8 }] },
      ],
      duration: 4,
      bpm: 120,
    }
    await engine.loadPlaybackData('f1', multiTrackData)

    engine.setTrackSolo(0, true)

    const last = snapshots[snapshots.length - 1]!
    expect(last.tracks[0]!.solo).toBe(true)
    expect(last.tracks[1]!.solo).toBe(false)
  })
})
