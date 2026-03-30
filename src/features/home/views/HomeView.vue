<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app.store'
import { useFilesStore } from '@/features/file-import/stores/files.store'
import { useFileImport } from '@/features/file-import/composables/useFileImport'
import FileDropZone from '@/features/file-import/components/FileDropZone.vue'
import FileList from '@/features/file-import/components/FileList.vue'
import PlaybackControls from '@/features/playback/components/PlaybackControls.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const appStore = useAppStore()
const filesStore = useFilesStore()
const { importFiles, removeFile, clearAllFiles } = useFileImport()

function onOpenFile(id: string) {
  router.push({ name: 'file-detail', params: { id } })
}

const dropZoneRef = ref<InstanceType<typeof FileDropZone> | null>(null)

function onFilesSelected(files: File[]) {
  importFiles(files)
}

watch(
  () => appStore.importTrigger,
  () => {
    dropZoneRef.value?.openFilePicker()
  },
)
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Empty state -->
    <div
      v-if="!filesStore.hasFiles"
      class="flex flex-1 flex-col items-center justify-center gap-6 p-8"
    >
      <h2 class="text-3xl font-bold text-on-surface dark:text-on-surface-dark">
        Score MIDI UI
      </h2>
      <p class="max-w-md text-center text-gray-500 dark:text-gray-400">
        A minimal web UI DAW for MusicXML and MIDI files.
      </p>
      <FileDropZone ref="dropZoneRef" @files-selected="onFilesSelected" />
    </div>

    <!-- Files loaded state -->
    <template v-else>
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
        <span class="text-sm font-medium text-gray-600 dark:text-gray-300">
          {{ filesStore.fileList.length }} file{{ filesStore.fileList.length > 1 ? 's' : '' }}
        </span>
        <BaseButton size="sm" variant="ghost" @click="clearAllFiles">
          Clear All
        </BaseButton>
      </div>
      <div class="flex-1 overflow-auto">
        <FileList @remove="removeFile" @open="onOpenFile" />
      </div>
      <div
        v-if="filesStore.selectedFile"
        class="shrink-0 border-t border-gray-200 dark:border-gray-700"
      >
        <PlaybackControls />
      </div>
      <div class="shrink-0 border-t border-gray-200 p-4 dark:border-gray-700">
        <FileDropZone ref="dropZoneRef" compact @files-selected="onFilesSelected" />
      </div>
    </template>
  </div>
</template>
