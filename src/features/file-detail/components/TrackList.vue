<script setup lang="ts">
import type { TrackSnapshot } from '@/features/playback/types/playback.types'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'
import TrackRow from './TrackRow.vue'

defineProps<{
  tracks: readonly TrackSnapshot[]
  compact?: boolean
}>()

const emit = defineEmits<{
  toggleMute: [index: number]
  toggleSolo: [index: number]
  volumeChange: [index: number, volumeDb: number]
}>()

const playbackStore = usePlaybackStore()
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div v-if="tracks.length === 0" class="flex items-center justify-center p-8 text-gray-400">
      No tracks loaded
    </div>
    <TrackRow
      v-for="track in tracks"
      :key="track.index"
      :track="track"
      :compact="compact"
      :visible="playbackStore.isTrackVisible(track.index)"
      @toggle-mute="emit('toggleMute', $event)"
      @toggle-solo="emit('toggleSolo', $event)"
      @toggle-visibility="playbackStore.toggleTrackVisibility($event)"
      @volume-change="(idx, vol) => emit('volumeChange', idx, vol)"
    />
  </div>
</template>
