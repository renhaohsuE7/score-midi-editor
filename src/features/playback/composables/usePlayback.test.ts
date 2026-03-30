import { setActivePinia, createPinia } from 'pinia'
import { usePlayback } from './usePlayback'
import { usePlaybackStore } from '../stores/playback.store'
import { useFilesStore } from '@/features/file-import/stores/files.store'
import { useNoteEditorStore } from '@/features/note-editor/stores/note-editor.store'
import type { EngineSnapshot, PlaybackEngineConfig } from '../types/playback.types'

// --- Mock PlaybackEngine ---

let capturedConfig: PlaybackEngineConfig | null = null
const mockEngine = {
  state: 'stopped' as string,
  activeFileId: null as string | null,
  ensureAudioContext: vi.fn(async () => {}),
  loadPlaybackData: vi.fn(async (_fileId: string) => {
    mockEngine.activeFileId = _fileId
  }),
  play: vi.fn(async () => {
    mockEngine.state = 'playing'
  }),
  pause: vi.fn(() => {
    mockEngine.state = 'paused'
  }),
  stop: vi.fn(() => {
    mockEngine.state = 'stopped'
  }),
  seek: vi.fn(),
  setTrackMuted: vi.fn(),
  setTrackSolo: vi.fn(),
  setTrackVolume: vi.fn(),
  dispose: vi.fn(),
  reset: vi.fn(),
}

vi.mock('../services/PlaybackEngine', () => ({
  PlaybackEngine: vi.fn(function (this: unknown, config: PlaybackEngineConfig) {
    capturedConfig = config
    return mockEngine
  }),
}))

// --- Helpers ---

function makeMidiParsedData() {
  return {
    type: 'midi' as const,
    data: {
      name: 'Test',
      duration: 4,
      ppq: 480,
      tempos: [{ bpm: 120, time: 0, ticks: 0 }],
      timeSignatures: [{ beats: 4, beatType: 4, time: 0, ticks: 0 }],
      tracks: [],
    },
  }
}

function makeMusicXmlParsedData() {
  return {
    type: 'musicxml' as const,
    data: {
      title: 'Test MusicXML',
      parts: [
        {
          id: 'P1',
          name: 'Piano',
          measures: [
            {
              number: 1,
              attributes: { divisions: 1 },
              notes: [
                { step: 'C', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
                { step: 'D', octave: 4, duration: 1, isRest: false, isChord: false, dots: 0 },
              ],
            },
          ],
        },
      ],
    },
  }
}

function setupFile(type: 'midi' | 'musicxml' = 'midi') {
  const filesStore = useFilesStore()
  const isMidi = type === 'midi'
  filesStore.addFile({
    id: 'f1',
    name: isMidi ? 'test.mid' : 'test.musicxml',
    type,
    size: 100,
    importedAt: Date.now(),
    status: 'ready',
  })
  filesStore.selectFile('f1')
  filesStore.setSelectedParsedData(isMidi ? makeMidiParsedData() : makeMusicXmlParsedData())
  return filesStore
}

// --- Tests ---

describe('usePlayback', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockEngine.state = 'stopped'
    mockEngine.activeFileId = null
    capturedConfig = null
  })

  it('wires onStateChange to store.applySnapshot', () => {
    usePlayback()
    expect(capturedConfig).not.toBeNull()

    const playbackStore = usePlaybackStore()
    const snapshot: EngineSnapshot = {
      state: 'playing',
      currentTime: 5,
      duration: 20,
      bpm: 140,
      isAudioReady: true,
      activeFileId: 'f2',
      tracks: [],
    }
    capturedConfig!.onStateChange(snapshot)
    expect(playbackStore.isPlaying).toBe(true)
    expect(playbackStore.currentTime).toBe(5)
  })

  it('play() loads file and calls engine.play', async () => {
    setupFile()
    const { play } = usePlayback()
    await play()

    expect(mockEngine.loadPlaybackData).toHaveBeenCalledWith('f1', expect.any(Object))
    expect(mockEngine.play).toHaveBeenCalled()
  })

  it('play() skips reload if same file is already active', async () => {
    setupFile()
    mockEngine.activeFileId = 'f1'
    const { play } = usePlayback()
    // Clear calls from the immediate watcher that fires during setup
    mockEngine.loadPlaybackData.mockClear()
    await play()

    expect(mockEngine.loadPlaybackData).not.toHaveBeenCalled()
    expect(mockEngine.play).toHaveBeenCalled()
  })

  it('play() does nothing without selected file', async () => {
    const { play } = usePlayback()
    await play()

    expect(mockEngine.play).not.toHaveBeenCalled()
  })

  it('pause() delegates to engine', () => {
    const { pause } = usePlayback()
    pause()
    expect(mockEngine.pause).toHaveBeenCalled()
  })

  it('stop() delegates to engine', () => {
    const { stop } = usePlayback()
    stop()
    expect(mockEngine.stop).toHaveBeenCalled()
  })

  it('seek() delegates to engine', () => {
    const { seek } = usePlayback()
    seek(5.5)
    expect(mockEngine.seek).toHaveBeenCalledWith(5.5)
  })

  it('togglePlayPause calls pause when playing', async () => {
    setupFile()
    const { togglePlayPause } = usePlayback()
    const playbackStore = usePlaybackStore()

    // Simulate playing state via snapshot
    playbackStore.applySnapshot({
      state: 'playing',
      currentTime: 0,
      duration: 4,
      bpm: 120,
      isAudioReady: true,
      activeFileId: 'f1',
      tracks: [],
    })

    await togglePlayPause()
    expect(mockEngine.pause).toHaveBeenCalled()
  })

  it('togglePlayPause calls play when not playing', async () => {
    setupFile()
    const { togglePlayPause } = usePlayback()
    await togglePlayPause()
    expect(mockEngine.play).toHaveBeenCalled()
  })

  it('setTrackMuted delegates to engine', () => {
    const { setTrackMuted } = usePlayback()
    setTrackMuted(0, true)
    expect(mockEngine.setTrackMuted).toHaveBeenCalledWith(0, true)
  })

  it('setTrackSolo delegates to engine', () => {
    const { setTrackSolo } = usePlayback()
    setTrackSolo(1, true)
    expect(mockEngine.setTrackSolo).toHaveBeenCalledWith(1, true)
  })

  it('setTrackVolume delegates to engine', () => {
    const { setTrackVolume } = usePlayback()
    setTrackVolume(0, -6)
    expect(mockEngine.setTrackVolume).toHaveBeenCalledWith(0, -6)
  })

  // --- Pause → Resume ---

  it('play() resumes from paused state without reloading data', async () => {
    setupFile()
    const { play, pause } = usePlayback()

    // Initial play
    await play()
    mockEngine.loadPlaybackData.mockClear()
    mockEngine.play.mockClear()

    // Pause
    pause()
    expect(mockEngine.state).toBe('paused')

    // Resume — should NOT call loadPlaybackData
    await play()
    expect(mockEngine.loadPlaybackData).not.toHaveBeenCalled()
    expect(mockEngine.play).toHaveBeenCalled()
  })

  it('play() resumes from paused state even when editor is active', async () => {
    setupFile()
    const editorStore = useNoteEditorStore()
    const { play, pause } = usePlayback()

    // Activate editor
    editorStore.isEditing = true

    // Initial play (loads edited data)
    await play()
    mockEngine.loadPlaybackData.mockClear()
    mockEngine.play.mockClear()

    // Pause
    pause()

    // Resume — should NOT reload even though editor is active
    await play()
    expect(mockEngine.loadPlaybackData).not.toHaveBeenCalled()
    expect(mockEngine.play).toHaveBeenCalled()
  })

  // --- MusicXML loading ---

  it('play() loads MusicXML file and calls engine.play', async () => {
    setupFile('musicxml')
    const { play } = usePlayback()
    await play()

    expect(mockEngine.loadPlaybackData).toHaveBeenCalledWith('f1', expect.any(Object))
    expect(mockEngine.play).toHaveBeenCalled()
  })

  it('MusicXML loading produces correct playback data via watcher', async () => {
    setupFile('musicxml')
    const playbackStore = usePlaybackStore()
    usePlayback()

    // Wait for immediate watcher to fire
    await new Promise((r) => setTimeout(r, 0))

    // The watcher should have loaded playback data
    expect(mockEngine.loadPlaybackData).toHaveBeenCalledWith(
      'f1',
      expect.objectContaining({
        tracks: expect.arrayContaining([
          expect.objectContaining({
            name: 'Piano',
            events: expect.arrayContaining([
              expect.objectContaining({ midi: 60, note: 'C4' }),
              expect.objectContaining({ midi: 62, note: 'D4' }),
            ]),
          }),
        ]),
        bpm: 120,
      }),
    )

    // playbackStore should reflect loaded tracks
    expect(playbackStore.playbackTracks).toHaveLength(1)
    expect(playbackStore.playbackTracks[0]!.name).toBe('Piano')
    expect(playbackStore.playbackTracks[0]!.events).toHaveLength(2)
  })

  // --- Editor-mode play ---

  it('play() reloads edited data when editor is active and engine is stopped', async () => {
    setupFile()
    const editorStore = useNoteEditorStore()
    const { play } = usePlayback()

    // Activate editor with tracks
    const playbackStore = usePlaybackStore()
    editorStore.initFromPlaybackTracks(playbackStore.playbackTracks)

    mockEngine.loadPlaybackData.mockClear()
    await play()

    // Should call loadPlaybackData because editor is active
    expect(mockEngine.loadPlaybackData).toHaveBeenCalled()
    expect(mockEngine.play).toHaveBeenCalled()
  })
})
