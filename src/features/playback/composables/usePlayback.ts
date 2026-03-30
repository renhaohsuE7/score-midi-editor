import { watch, onUnmounted } from 'vue'
import { usePlaybackStore } from '../stores/playback.store'
import { useFilesStore } from '@/features/file-import/stores/files.store'
import { useNoteEditorStore } from '@/features/note-editor/stores/note-editor.store'
import { PlaybackEngine } from '../services/PlaybackEngine'
import { midiToPlaybackData } from '../services/midi-to-events'
import { musicXmlToPlaybackData } from '../services/musicxml-to-events'
import type { PlaybackData } from '../types/playback.types'

export function usePlayback() {
  const playbackStore = usePlaybackStore()
  const filesStore = useFilesStore()
  const noteEditorStore = useNoteEditorStore()

  const engine = new PlaybackEngine({
    onStateChange: (snapshot) => playbackStore.applySnapshot(snapshot),
  })

  // --- Convert parsed data to PlaybackData ---
  function toPlaybackData(): PlaybackData | null {
    const parsed = filesStore.selectedParsedData
    if (!parsed) return null
    if (parsed.type === 'midi') return midiToPlaybackData(parsed.data)
    return musicXmlToPlaybackData(parsed.data)
  }

  // --- Public actions ---
  async function play(): Promise<void> {
    const fileId = filesStore.selectedFileId
    if (!fileId) return

    // Resume from pause without reloading data (preserves position)
    if (engine.state === 'paused') {
      await engine.play()
      return
    }

    // When editor has modifications, reload with edited data
    if (noteEditorStore.isEditing) {
      const editedTracks = noteEditorStore.toPlaybackTracks()
      const baseData = toPlaybackData()
      const data: PlaybackData = {
        tracks: editedTracks,
        duration: baseData?.duration ?? 0,
        bpm: baseData?.bpm ?? 120,
      }
      await engine.loadPlaybackData(fileId, data)
      playbackStore.setPlaybackTracks(editedTracks)
    } else if (engine.activeFileId !== fileId) {
      const data = toPlaybackData()
      if (!data) return
      await engine.loadPlaybackData(fileId, data)
      playbackStore.setPlaybackTracks(data.tracks)
    }

    await engine.play()
  }

  function pause(): void {
    engine.pause()
  }

  function stop(): void {
    engine.stop()
  }

  async function togglePlayPause(): Promise<void> {
    if (playbackStore.isPlaying) {
      pause()
    } else {
      await play()
    }
  }

  function seek(seconds: number): void {
    engine.seek(seconds)
  }

  function setTrackMuted(index: number, muted: boolean): void {
    engine.setTrackMuted(index, muted)
  }

  function setTrackSolo(index: number, solo: boolean): void {
    engine.setTrackSolo(index, solo)
  }

  function setTrackVolume(index: number, volumeDb: number): void {
    engine.setTrackVolume(index, volumeDb)
  }

  // --- Watch file changes ---
  // immediate: true ensures playback data loads even when selectedParsedData
  // was already set before this watcher was registered (e.g. navigating from
  // home page where the single-click handler already triggered data loading).
  watch(
    () => filesStore.selectedParsedData,
    async () => {
      if (engine.state === 'playing' || engine.state === 'paused') {
        engine.stop()
      }
      const parsed = filesStore.selectedParsedData
      const fileId = filesStore.selectedFileId
      if (parsed && fileId) {
        const data = toPlaybackData()
        if (data) {
          await engine.loadPlaybackData(fileId, data)
          playbackStore.setPlaybackTracks(data.tracks)
        }
      } else {
        engine.reset()
        playbackStore.setPlaybackTracks([])
      }
    },
    { immediate: true },
  )

  // --- Cleanup ---
  onUnmounted(() => {
    engine.dispose()
  })

  return {
    play,
    pause,
    stop,
    togglePlayPause,
    seek,
    setTrackMuted,
    setTrackSolo,
    setTrackVolume,
  }
}
