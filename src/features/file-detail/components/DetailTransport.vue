<script setup lang="ts">
import BaseButton from '@/components/base/BaseButton.vue'
import SeekBar from '@/features/playback/components/SeekBar.vue'

defineProps<{
  isPlaying: boolean
  isStopped: boolean
  formattedCurrentTime: string
  formattedDuration: string
  progress: number
  duration: number
}>()

const emit = defineEmits<{
  togglePlayPause: []
  stop: []
  seek: [seconds: number]
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2 border-b border-gray-200 px-3 py-2 md:gap-3 md:px-4 dark:border-gray-700">
    <BaseButton
      size="sm"
      :variant="isPlaying ? 'secondary' : 'primary'"
      @click="emit('togglePlayPause')"
    >
      {{ isPlaying ? 'Pause' : 'Play' }}
    </BaseButton>

    <BaseButton size="sm" variant="ghost" :disabled="isStopped" @click="emit('stop')">
      Stop
    </BaseButton>

    <span class="min-w-[5rem] text-center font-mono text-xs text-gray-600 dark:text-gray-300">
      {{ formattedCurrentTime }} / {{ formattedDuration }}
    </span>

    <SeekBar
      :progress="progress"
      :duration="duration"
      class="order-last w-full md:order-none md:w-auto md:flex-1"
      @seek="emit('seek', $event)"
    />
  </div>
</template>
