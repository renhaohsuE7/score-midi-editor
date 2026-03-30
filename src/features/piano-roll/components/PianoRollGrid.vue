<script setup lang="ts">
import { computed } from 'vue'
import { isBlackKey } from '../constants'

const props = defineProps<{
  minMidi: number
  maxMidi: number
  noteHeight: number
  totalWidth: number
  secondsPerBeat: number
  pixelsPerSecond: number
}>()

const rows = computed(() => {
  const result: { midi: number; isBlack: boolean; isC: boolean }[] = []
  for (let midi = props.maxMidi; midi >= props.minMidi; midi--) {
    result.push({
      midi,
      isBlack: isBlackKey(midi),
      isC: midi % 12 === 0,
    })
  }
  return result
})

const beatLines = computed(() => {
  const pixelsPerBeat = props.secondsPerBeat * props.pixelsPerSecond
  if (pixelsPerBeat <= 0) return []
  const lines: { x: number; isMeasure: boolean; label: number }[] = []
  const count = Math.ceil(props.totalWidth / pixelsPerBeat)
  for (let i = 0; i <= count; i++) {
    lines.push({
      x: i * pixelsPerBeat,
      isMeasure: i % 4 === 0,
      label: i,
    })
  }
  return lines
})
</script>

<template>
  <div class="pointer-events-none absolute inset-0" :style="{ width: `${totalWidth}px` }">
    <!-- Row backgrounds -->
    <div
      v-for="row in rows"
      :key="row.midi"
      :class="[
        'border-b',
        row.isC
          ? 'border-gray-300 dark:border-gray-500'
          : 'border-gray-100 dark:border-gray-800',
        row.isBlack
          ? 'bg-gray-100 dark:bg-gray-800/50'
          : 'bg-white dark:bg-gray-900',
      ]"
      :style="{ height: `${noteHeight}px` }"
    />
    <!-- Beat lines -->
    <div
      v-for="line in beatLines"
      :key="line.label"
      :class="[
        'absolute top-0 bottom-0',
        line.isMeasure
          ? 'border-l border-gray-300 dark:border-gray-500'
          : 'border-l border-gray-200 dark:border-gray-700',
      ]"
      :style="{ left: `${line.x}px` }"
    />
  </div>
</template>
