import { setActivePinia, createPinia } from 'pinia'
import { usePlaybackStore } from './playback.store'
import type { EngineSnapshot } from '../types/playback.types'

function makeSnapshot(overrides: Partial<EngineSnapshot> = {}): EngineSnapshot {
  return {
    state: 'stopped',
    currentTime: 0,
    duration: 0,
    bpm: 120,
    isAudioReady: false,
    activeFileId: null,
    tracks: [],
    ...overrides,
  }
}

describe('usePlaybackStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with default state', () => {
    const store = usePlaybackStore()
    expect(store.state).toBe('stopped')
    expect(store.currentTime).toBe(0)
    expect(store.duration).toBe(0)
    expect(store.isAudioReady).toBe(false)
    expect(store.activeFileId).toBeNull()
    expect(store.bpm).toBe(120)
    expect(store.tracks).toEqual([])
  })

  it('applySnapshot updates all reactive fields', () => {
    const store = usePlaybackStore()
    store.applySnapshot(
      makeSnapshot({
        state: 'playing',
        currentTime: 5,
        duration: 20,
        bpm: 140,
        isAudioReady: true,
        activeFileId: 'f2',
        tracks: [{ index: 0, name: 'Piano', muted: false, solo: false, volumeDb: 0 }],
      }),
    )

    expect(store.state).toBe('playing')
    expect(store.currentTime).toBe(5)
    expect(store.duration).toBe(20)
    expect(store.bpm).toBe(140)
    expect(store.isAudioReady).toBe(true)
    expect(store.activeFileId).toBe('f2')
    expect(store.tracks).toHaveLength(1)
  })

  it('computes isPlaying/isPaused/isStopped from snapshot', () => {
    const store = usePlaybackStore()

    expect(store.isStopped).toBe(true)

    store.applySnapshot(makeSnapshot({ state: 'playing' }))
    expect(store.isPlaying).toBe(true)
    expect(store.isStopped).toBe(false)

    store.applySnapshot(makeSnapshot({ state: 'paused' }))
    expect(store.isPaused).toBe(true)
    expect(store.isPlaying).toBe(false)
  })

  it('computes progress from snapshot', () => {
    const store = usePlaybackStore()
    expect(store.progress).toBe(0)

    store.applySnapshot(makeSnapshot({ duration: 10, currentTime: 5 }))
    expect(store.progress).toBeCloseTo(0.5)
  })

  it('formats time correctly from snapshot', () => {
    const store = usePlaybackStore()
    store.applySnapshot(makeSnapshot({ currentTime: 90, duration: 125 }))

    expect(store.formattedCurrentTime).toBe('1:30')
    expect(store.formattedDuration).toBe('2:05')
  })

  it('tracks snapshot includes per-track data', () => {
    const store = usePlaybackStore()
    store.applySnapshot(
      makeSnapshot({
        tracks: [
          { index: 0, name: 'Piano', muted: false, solo: true, volumeDb: 0 },
          { index: 1, name: 'Bass', muted: true, solo: false, volumeDb: -6 },
        ],
      }),
    )

    expect(store.tracks).toHaveLength(2)
    expect(store.tracks[0]!.name).toBe('Piano')
    expect(store.tracks[0]!.solo).toBe(true)
    expect(store.tracks[1]!.muted).toBe(true)
    expect(store.tracks[1]!.volumeDb).toBe(-6)
  })
})
