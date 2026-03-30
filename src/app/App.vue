<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppMain from '@/components/layout/AppMain.vue'
import AppStatusBar from '@/components/layout/AppStatusBar.vue'
import { useFilesStore } from '@/features/file-import/stores/files.store'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'

const route = useRoute()
const filesStore = useFilesStore()
const playbackStore = usePlaybackStore()

const statusMessage = computed(() => {
  if (playbackStore.isPlaying) return `Playing - ${playbackStore.formattedCurrentTime}`
  if (playbackStore.isPaused) return `Paused at ${playbackStore.formattedCurrentTime}`
  if (filesStore.isAnyProcessing) return 'Processing files...'
  if (filesStore.hasFiles) {
    const count = filesStore.fileList.length
    return `${count} file${count > 1 ? 's' : ''} loaded`
  }
  return 'Ready'
})
</script>

<template>
  <div class="flex h-screen flex-col bg-surface dark:bg-surface-dark">
    <AppHeader v-if="!route.meta.hideAppHeader" />
    <AppMain>
      <RouterView />
    </AppMain>
    <AppStatusBar :message="statusMessage" />
  </div>
</template>
