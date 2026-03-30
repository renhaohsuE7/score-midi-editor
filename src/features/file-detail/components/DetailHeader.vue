<script setup lang="ts">
import BaseButton from '@/components/base/BaseButton.vue'

defineProps<{
  fileName: string
  bpm: number
}>()

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <header
    class="flex h-12 items-center gap-2 border-b border-gray-200 bg-surface px-3 md:gap-3 md:px-4 dark:border-gray-700 dark:bg-surface-dark"
  >
    <BaseButton size="sm" variant="ghost" @click="emit('back')"> &larr; Home </BaseButton>

    <h1
      class="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface dark:text-on-surface-dark"
    >
      {{ fileName }}
    </h1>

    <span
      class="shrink-0 rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
    >
      {{ bpm }} BPM
    </span>
  </header>
</template>
