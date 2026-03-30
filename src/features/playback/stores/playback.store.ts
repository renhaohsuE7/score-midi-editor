import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  PlaybackState,
  PlaybackTrack,
  EngineSnapshot,
  TrackSnapshot,
} from '../types/playback.types'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const usePlaybackStore = defineStore('playback', () => {
  // --- Reactive mirror of EngineSnapshot ---
  const state = ref<PlaybackState>('stopped')
  const currentTime = ref(0)
  const duration = ref(0)
  const bpm = ref(120)
  const isAudioReady = ref(false)
  const activeFileId = ref<string | null>(null)
  const tracks = ref<readonly TrackSnapshot[]>([])
  const playbackTracks = ref<PlaybackTrack[]>([])

  // --- Derived getters ---
  const isPlaying = computed(() => state.value === 'playing')
  const isPaused = computed(() => state.value === 'paused')
  const isStopped = computed(() => state.value === 'stopped')
  const progress = computed(() => (duration.value > 0 ? currentTime.value / duration.value : 0))
  const formattedCurrentTime = computed(() => formatTime(currentTime.value))
  const formattedDuration = computed(() => formatTime(duration.value))

  // --- Single action: apply engine snapshot ---
  function applySnapshot(snapshot: EngineSnapshot): void {
    state.value = snapshot.state
    currentTime.value = snapshot.currentTime
    duration.value = snapshot.duration
    bpm.value = snapshot.bpm
    isAudioReady.value = snapshot.isAudioReady
    activeFileId.value = snapshot.activeFileId
    tracks.value = snapshot.tracks
  }

  function setPlaybackTracks(data: PlaybackTrack[]): void {
    playbackTracks.value = data
  }

  return {
    state,
    currentTime,
    duration,
    bpm,
    isAudioReady,
    activeFileId,
    tracks,
    playbackTracks,
    isPlaying,
    isPaused,
    isStopped,
    progress,
    formattedCurrentTime,
    formattedDuration,
    applySnapshot,
    setPlaybackTracks,
  }
})
