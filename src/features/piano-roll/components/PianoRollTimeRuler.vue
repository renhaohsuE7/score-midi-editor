<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  totalWidth: number
  secondsPerBeat: number
  pixelsPerSecond: number
}>()

const beatMarkers = computed(() => {
  const pixelsPerBeat = props.secondsPerBeat * props.pixelsPerSecond
  if (pixelsPerBeat <= 0) return []
  const count = Math.ceil(props.totalWidth / pixelsPerBeat)
  const markers: { x: number; label: string; isMeasure: boolean }[] = []
  for (let i = 0; i <= count; i++) {
    const isMeasure = i % 4 === 0
    markers.push({
      x: i * pixelsPerBeat,
      label: isMeasure ? `${Math.floor(i / 4) + 1}` : '',
      isMeasure,
    })
  }
  return markers
})
</script>

<template>
  <div
    class="relative shrink-0 border-b border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
    :style="{ width: `${totalWidth}px`, height: '20px' }"
  >
    <template v-for="marker in beatMarkers" :key="marker.x">
      <div
        :class="[
          'absolute top-0 bottom-0',
          marker.isMeasure
            ? 'border-l border-gray-400 dark:border-gray-500'
            : 'border-l border-gray-200 dark:border-gray-700',
        ]"
        :style="{ left: `${marker.x}px` }"
      />
      <span
        v-if="marker.label"
        class="absolute top-0.5 text-[9px] text-gray-500 dark:text-gray-400"
        :style="{ left: `${marker.x + 3}px` }"
      >
        {{ marker.label }}
      </span>
    </template>
  </div>
</template>
