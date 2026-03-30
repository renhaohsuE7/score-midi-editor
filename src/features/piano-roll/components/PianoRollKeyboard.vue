<script setup lang="ts">
import { computed } from 'vue'
import { isBlackKey, midiToNoteName } from '../constants'

const props = defineProps<{
  minMidi: number
  maxMidi: number
  noteHeight: number
}>()

const keys = computed(() => {
  const result: { midi: number; name: string; isBlack: boolean }[] = []
  for (let midi = props.maxMidi; midi >= props.minMidi; midi--) {
    result.push({
      midi,
      name: midiToNoteName(midi),
      isBlack: isBlackKey(midi),
    })
  }
  return result
})
</script>

<template>
  <div class="shrink-0 border-r border-gray-300 dark:border-gray-600" :style="{ width: '48px' }">
    <div
      v-for="key in keys"
      :key="key.midi"
      :class="[
        'flex items-center justify-end border-b pr-1 text-[9px] leading-none',
        key.isBlack
          ? 'border-gray-300 bg-gray-700 text-gray-300 dark:border-gray-600 dark:bg-gray-800'
          : key.midi % 12 === 0
            ? 'border-gray-300 bg-gray-100 font-bold text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200'
            : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
      ]"
      :style="{ height: `${noteHeight}px` }"
    >
      {{ key.midi % 12 === 0 ? key.name : '' }}
    </div>
  </div>
</template>
