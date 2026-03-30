<script setup lang="ts">
defineProps<{
  modelValue: number
  min?: number
  max?: number
  step?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function onInput(e: Event) {
  const input = e.target as HTMLInputElement
  emit('update:modelValue', parseFloat(input.value))
}
</script>

<template>
  <div class="flex min-w-0 flex-1 items-center gap-1.5">
    <input
      type="range"
      :min="min ?? -60"
      :max="max ?? 0"
      :step="step ?? 1"
      :value="modelValue"
      class="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-gray-300 accent-primary dark:bg-gray-600"
      @input="onInput"
    />
    <span class="w-10 shrink-0 text-right font-mono text-xs text-gray-500 dark:text-gray-400">
      {{ modelValue }}dB
    </span>
  </div>
</template>
