<script setup lang="ts">
import { useFilesStore } from '../stores/files.store'
import { formatFileSize } from '../composables/useFileImport'

const emit = defineEmits<{
  remove: [id: string]
  open: [id: string]
}>()

const filesStore = useFilesStore()

const typeBadge: Record<string, { label: string; class: string }> = {
  midi: { label: 'MIDI', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  musicxml: {
    label: 'MusicXML',
    class: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
}

const statusBadge: Record<string, { label: string; class: string }> = {
  importing: {
    label: 'Importing...',
    class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  parsing: {
    label: 'Parsing...',
    class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  ready: {
    label: 'Ready',
    class: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  error: {
    label: 'Error',
    class: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
}
</script>

<template>
  <div class="divide-y divide-gray-200 dark:divide-gray-700">
    <div
      v-for="file in filesStore.fileList"
      :key="file.id"
      :class="[
        'flex items-center gap-3 py-3 pr-4 transition-colors',
        filesStore.selectedFileId === file.id
          ? 'border-l-2 border-primary bg-primary/10 pl-3.5'
          : 'border-l-2 border-transparent pl-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50',
      ]"
      role="button"
      tabindex="0"
      @click="filesStore.selectFile(file.id)"
      @dblclick="emit('open', file.id)"
      @keydown.enter="filesStore.selectFile(file.id)"
    >
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-on-surface dark:text-on-surface-dark">
          {{ file.name }}
        </p>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {{ formatFileSize(file.size) }}
          <span v-if="file.error" class="ml-1 text-red-500">{{ file.error }}</span>
        </p>
      </div>

      <span
        :class="['inline-flex rounded-full px-2 py-0.5 text-xs font-medium', typeBadge[file.type]?.class]"
      >
        {{ typeBadge[file.type]?.label }}
      </span>

      <span
        :class="['inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusBadge[file.status]?.class]"
      >
        {{ statusBadge[file.status]?.label }}
      </span>

      <button
        class="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-700"
        title="Remove file"
        @click.stop="emit('remove', file.id)"
      >
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>
