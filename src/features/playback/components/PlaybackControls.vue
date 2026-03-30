<script setup lang="ts">
import { usePlaybackStore } from '../stores/playback.store'
import { usePlayback } from '../composables/usePlayback'
import BaseButton from '@/components/base/BaseButton.vue'
import SeekBar from './SeekBar.vue'

const playbackStore = usePlaybackStore()
const { togglePlayPause, stop, seek } = usePlayback()
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-2">
    <BaseButton
      size="sm"
      :variant="playbackStore.isPlaying ? 'secondary' : 'primary'"
      @click="togglePlayPause"
    >
      {{ playbackStore.isPlaying ? 'Pause' : 'Play' }}
    </BaseButton>

    <BaseButton
      size="sm"
      variant="ghost"
      :disabled="playbackStore.isStopped"
      @click="stop"
    >
      Stop
    </BaseButton>

    <span class="min-w-[5rem] text-center font-mono text-xs text-gray-600 dark:text-gray-300">
      {{ playbackStore.formattedCurrentTime }} / {{ playbackStore.formattedDuration }}
    </span>

    <SeekBar
      :progress="playbackStore.progress"
      :duration="playbackStore.duration"
      class="flex-1"
      @seek="seek"
    />
  </div>
</template>
