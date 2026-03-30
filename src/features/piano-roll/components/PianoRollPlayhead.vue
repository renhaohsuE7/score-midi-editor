<script setup lang="ts">
import { computed } from 'vue'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'

const props = defineProps<{
  pixelsPerSecond: number
  totalHeight: number
}>()

const playbackStore = usePlaybackStore()

const xPos = computed(() => playbackStore.currentTime * props.pixelsPerSecond)
const visible = computed(() => playbackStore.currentTime > 0 || playbackStore.isPlaying)
</script>

<template>
  <div
    v-if="visible"
    class="pointer-events-none absolute top-0 z-10 w-px bg-red-500"
    :style="{
      left: `${xPos}px`,
      height: `${totalHeight}px`,
    }"
  />
</template>
