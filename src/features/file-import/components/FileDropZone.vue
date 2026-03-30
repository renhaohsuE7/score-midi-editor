<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import { ACCEPT_STRING } from '../composables/useFileImport'

defineProps<{
  compact?: boolean
}>()

const emit = defineEmits<{
  filesSelected: [files: File[]]
}>()

const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const files = Array.from(e.dataTransfer?.files ?? [])
  if (files.length) emit('filesSelected', files)
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (files.length) emit('filesSelected', files)
  input.value = ''
}

function openFilePicker() {
  fileInput.value?.click()
}

defineExpose({ openFilePicker })
</script>

<template>
  <div
    :class="[
      'rounded-xl border-2 border-dashed transition-colors',
      isDragOver
        ? 'border-primary bg-primary/5'
        : 'border-gray-300 dark:border-gray-600',
      compact ? 'p-4' : 'flex flex-col items-center justify-center gap-4 p-12',
    ]"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <template v-if="!compact">
      <div class="text-4xl text-gray-400">
        &#x1F3B5;
      </div>
      <p class="text-center text-gray-500 dark:text-gray-400">
        Drag &amp; drop MusicXML or MIDI files here
      </p>
      <BaseButton variant="primary" @click="openFilePicker">
        Browse Files
      </BaseButton>
    </template>
    <template v-else>
      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        Drop files here or
        <button
          class="font-medium text-primary underline hover:text-primary-dark"
          @click="openFilePicker"
        >
          browse
        </button>
      </p>
    </template>

    <input
      ref="fileInput"
      type="file"
      :accept="ACCEPT_STRING"
      multiple
      class="hidden"
      @change="onFileChange"
    />
  </div>
</template>
