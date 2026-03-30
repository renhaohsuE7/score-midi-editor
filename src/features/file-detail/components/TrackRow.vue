<script setup lang="ts">
import type { TrackSnapshot } from '@/features/playback/types/playback.types'
import { TRACK_BG_COLORS } from '@/features/piano-roll/constants'
import VolumeSlider from './VolumeSlider.vue'

defineProps<{
  track: TrackSnapshot
  compact?: boolean
}>()

const emit = defineEmits<{
  toggleMute: [index: number]
  toggleSolo: [index: number]
  volumeChange: [index: number, volumeDb: number]
}>()
</script>

<template>
  <!-- Compact mode: vertical stack, color + M/S only -->
  <div
    v-if="compact"
    class="flex flex-col items-center gap-1 border-b border-gray-200 py-2 dark:border-gray-700"
  >
    <div
      :class="['h-1 w-6 rounded-full', TRACK_BG_COLORS[track.index % TRACK_BG_COLORS.length]]"
    />
    <button
      :class="[
        'h-6 w-6 shrink-0 rounded text-[10px] font-bold transition-colors',
        track.muted
          ? 'bg-red-500 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
      ]"
      :title="track.muted ? 'Unmute' : 'Mute'"
      @click="emit('toggleMute', track.index)"
    >
      M
    </button>
    <button
      :class="[
        'h-6 w-6 shrink-0 rounded text-[10px] font-bold transition-colors',
        track.solo
          ? 'bg-yellow-500 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
      ]"
      :title="track.solo ? 'Unsolo' : 'Solo'"
      @click="emit('toggleSolo', track.index)"
    >
      S
    </button>
  </div>

  <!-- Expanded mode: two-row layout -->
  <div
    v-else
    class="border-b border-gray-200 px-3 py-2 dark:border-gray-700"
  >
    <!-- Row 1: color + name -->
    <div class="flex items-center gap-2">
      <div
        :class="['h-3 w-3 shrink-0 rounded-full', TRACK_BG_COLORS[track.index % TRACK_BG_COLORS.length]]"
      />
      <span
        class="min-w-0 flex-1 truncate text-sm font-medium text-on-surface dark:text-on-surface-dark"
      >
        {{ track.name || `Track ${track.index + 1}` }}
      </span>
    </div>

    <!-- Row 2: M/S + volume -->
    <div class="mt-1 flex items-center gap-2">
      <button
        :class="[
          'h-6 w-6 shrink-0 rounded text-xs font-bold transition-colors',
          track.muted
            ? 'bg-red-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
        ]"
        :title="track.muted ? 'Unmute' : 'Mute'"
        @click="emit('toggleMute', track.index)"
      >
        M
      </button>
      <button
        :class="[
          'h-6 w-6 shrink-0 rounded text-xs font-bold transition-colors',
          track.solo
            ? 'bg-yellow-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
        ]"
        :title="track.solo ? 'Unsolo' : 'Solo'"
        @click="emit('toggleSolo', track.index)"
      >
        S
      </button>
      <VolumeSlider
        :model-value="track.volumeDb"
        @update:model-value="emit('volumeChange', track.index, $event)"
      />
    </div>
  </div>
</template>
