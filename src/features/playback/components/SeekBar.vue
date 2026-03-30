<script setup lang="ts">
const props = defineProps<{
  progress: number
  duration: number
}>()

const emit = defineEmits<{
  seek: [seconds: number]
}>()

function onClick(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  emit('seek', ratio * props.duration)
}
</script>

<template>
  <div
    class="relative h-2 cursor-pointer rounded-full bg-gray-200 dark:bg-gray-700"
    role="slider"
    :aria-valuenow="Math.round(progress * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
    @click="onClick"
  >
    <div
      class="absolute left-0 top-0 h-full rounded-full bg-primary transition-[width] duration-100"
      :style="{ width: `${progress * 100}%` }"
    />
  </div>
</template>
