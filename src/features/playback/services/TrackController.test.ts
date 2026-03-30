import { TrackController } from './TrackController'

// Mock Tone.js module
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

const mockTransport = {
  schedule: vi.fn((_cb: unknown, _time: unknown) => mockTransport._nextId++),
  clear: vi.fn(),
  _nextId: 100,
}

const MockTone = {
  PolySynth: vi.fn(function () { return mockSynth }),
  Synth: class {},
  Volume: vi.fn(function () { return mockVolume }),
  getTransport: vi.fn(() => mockTransport),
} as unknown as typeof import('tone')

describe('TrackController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransport._nextId = 100
    mockVolume.volume.value = 0
    mockVolume.mute = false
  })

  it('creates with correct index and name', () => {
    const tc = new TrackController(0, 'Piano', MockTone)
    expect(tc.index).toBe(0)
    expect(tc.name).toBe('Piano')
    expect(tc.muted).toBe(false)
    expect(tc.solo).toBe(false)
    expect(tc.volumeDb).toBe(0)
  })

  it('scheduleEvents creates synth and schedules on transport', () => {
    const tc = new TrackController(0, 'Piano', MockTone)
    const events = [
      { midi: 60, note: 'C4', time: 0, duration: 0.5, velocity: 0.8 },
      { midi: 62, note: 'D4', time: 0.5, duration: 0.5, velocity: 0.7 },
    ]

    tc.scheduleEvents(events, mockTransport as unknown as ReturnType<typeof import('tone').getTransport>)

    expect(MockTone.Volume).toHaveBeenCalledWith(0)
    expect(MockTone.PolySynth).toHaveBeenCalled()
    expect(mockSynth.connect).toHaveBeenCalledWith(mockVolume)
    expect(mockTransport.schedule).toHaveBeenCalledTimes(2)
  })

  it('setMuted updates mute state on volume node', () => {
    const tc = new TrackController(0, 'Piano', MockTone)
    tc.scheduleEvents([], mockTransport as unknown as ReturnType<typeof import('tone').getTransport>)

    tc.setMuted(true)
    expect(tc.muted).toBe(true)
    expect(mockVolume.mute).toBe(true)

    tc.setMuted(false)
    expect(tc.muted).toBe(false)
    expect(mockVolume.mute).toBe(false)
  })

  it('setSolo updates solo state', () => {
    const tc = new TrackController(0, 'Piano', MockTone)
    tc.setSolo(true)
    expect(tc.solo).toBe(true)
  })

  it('setVolume updates volume node', () => {
    const tc = new TrackController(0, 'Piano', MockTone)
    tc.scheduleEvents([], mockTransport as unknown as ReturnType<typeof import('tone').getTransport>)

    tc.setVolume(-6)
    expect(tc.volumeDb).toBe(-6)
    expect(mockVolume.volume.value).toBe(-6)
  })

  it('updateEffectiveOutput: anySoloed=true mutes non-solo tracks', () => {
    const tc = new TrackController(0, 'Piano', MockTone)
    tc.scheduleEvents([], mockTransport as unknown as ReturnType<typeof import('tone').getTransport>)

    tc.setSolo(false)
    tc.updateEffectiveOutput(true)
    expect(mockVolume.mute).toBe(true)
  })

  it('updateEffectiveOutput: anySoloed=true unmutes solo tracks', () => {
    const tc = new TrackController(0, 'Piano', MockTone)
    tc.scheduleEvents([], mockTransport as unknown as ReturnType<typeof import('tone').getTransport>)

    tc.setSolo(true)
    tc.updateEffectiveOutput(true)
    expect(mockVolume.mute).toBe(false)
  })

  it('updateEffectiveOutput: anySoloed=false uses muted state', () => {
    const tc = new TrackController(0, 'Piano', MockTone)
    tc.scheduleEvents([], mockTransport as unknown as ReturnType<typeof import('tone').getTransport>)

    tc.setMuted(true)
    tc.updateEffectiveOutput(false)
    expect(mockVolume.mute).toBe(true)
  })

  it('releaseAll calls synth.releaseAll', () => {
    const tc = new TrackController(0, 'Piano', MockTone)
    tc.scheduleEvents([], mockTransport as unknown as ReturnType<typeof import('tone').getTransport>)

    tc.releaseAll()
    expect(mockSynth.releaseAll).toHaveBeenCalled()
  })

  it('dispose clears scheduled IDs and disposes audio nodes', () => {
    const tc = new TrackController(0, 'Piano', MockTone)
    tc.scheduleEvents(
      [{ midi: 60, note: 'C4', time: 0, duration: 0.5, velocity: 0.8 }],
      mockTransport as unknown as ReturnType<typeof import('tone').getTransport>,
    )

    tc.dispose(mockTransport as unknown as ReturnType<typeof import('tone').getTransport>)

    expect(mockTransport.clear).toHaveBeenCalled()
    expect(mockSynth.releaseAll).toHaveBeenCalled()
    expect(mockSynth.dispose).toHaveBeenCalled()
    expect(mockVolume.dispose).toHaveBeenCalled()
  })

  it('toSnapshot returns correct data', () => {
    const tc = new TrackController(2, 'Violin', MockTone)
    tc.setMuted(true)
    tc.setSolo(true)
    tc.setVolume(-3)

    expect(tc.toSnapshot()).toEqual({
      index: 2,
      name: 'Violin',
      muted: true,
      solo: true,
      volumeDb: -3,
    })
  })
})
