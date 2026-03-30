<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useFilesStore } from '@/features/file-import/stores/files.store'
import { usePlaybackStore } from '@/features/playback/stores/playback.store'
import { useFileImport } from '@/features/file-import/composables/useFileImport'
import { usePlayback } from '@/features/playback/composables/usePlayback'
import DetailHeader from '../components/DetailHeader.vue'
import DetailTransport from '../components/DetailTransport.vue'
import TrackList from '../components/TrackList.vue'
import PianoRoll from '@/features/piano-roll/components/PianoRoll.vue'

const props = defineProps<{
  id: string
}>()

const router = useRouter()
const filesStore = useFilesStore()
const playbackStore = usePlaybackStore()
useFileImport()
const { togglePlayPause, stop, seek, setTrackMuted, setTrackSolo, setTrackVolume } = usePlayback()

const fileName = computed(() => filesStore.selectedFile?.name ?? 'Unknown File')

// Files are already hydrated by router guard (ensureFilesLoaded).
// Just select the requested file if needed.
onMounted(() => {
  if (filesStore.selectedFileId !== props.id) {
    const fileExists = filesStore.files.has(props.id)
    if (fileExists) {
      filesStore.selectFile(props.id)
    } else {
      router.replace({ name: 'home' })
    }
  }
})

function goBack() {
  router.push({ name: 'home' })
}

function onToggleMute(index: number) {
  const track = playbackStore.tracks[index]
  if (track) setTrackMuted(index, !track.muted)
}

function onToggleSolo(index: number) {
  const track = playbackStore.tracks[index]
  if (track) setTrackSolo(index, !track.solo)
}

function onVolumeChange(index: number, volumeDb: number) {
  setTrackVolume(index, volumeDb)
}

const sidebarExpanded = ref(true)
function toggleSidebar() {
  sidebarExpanded.value = !sidebarExpanded.value
}
</script>

<template>
  <div class="flex h-full flex-col">
    <DetailHeader :file-name="fileName" :bpm="playbackStore.bpm" @back="goBack" />

    <DetailTransport
      :is-playing="playbackStore.isPlaying"
      :is-stopped="playbackStore.isStopped"
      :formatted-current-time="playbackStore.formattedCurrentTime"
      :formatted-duration="playbackStore.formattedDuration"
      :progress="playbackStore.progress"
      :duration="playbackStore.duration"
      @toggle-play-pause="togglePlayPause"
      @stop="stop"
      @seek="seek"
    />

    <div class="flex min-h-0 flex-1 flex-col md:flex-row">
      <!-- Mobile: collapsible track panel -->
      <div class="shrink-0 border-b border-gray-200 md:hidden dark:border-gray-700">
        <button
          class="flex w-full items-center justify-between px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
          @click="toggleSidebar"
        >
          <span>Tracks ({{ playbackStore.tracks.length }})</span>
          <span class="text-xs">{{ sidebarExpanded ? '\u25B2' : '\u25BC' }}</span>
        </button>
        <div v-show="sidebarExpanded" class="max-h-32 overflow-y-auto">
          <TrackList
            :tracks="playbackStore.tracks"
            @toggle-mute="onToggleMute"
            @toggle-solo="onToggleSolo"
            @volume-change="onVolumeChange"
          />
        </div>
      </div>

      <!-- Desktop: collapsible sidebar -->
      <div
        :class="[
          'hidden shrink-0 overflow-x-hidden overflow-y-auto border-r border-gray-200 transition-[width] duration-200 md:block dark:border-gray-700',
          sidebarExpanded ? 'w-64' : 'w-14',
        ]"
      >
        <button
          class="flex w-full items-center justify-center border-b border-gray-200 py-1.5 text-xs text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          @click="toggleSidebar"
        >
          {{ sidebarExpanded ? '\u00AB' : '\u00BB' }}
        </button>
        <TrackList
          :tracks="playbackStore.tracks"
          :compact="!sidebarExpanded"
          @toggle-mute="onToggleMute"
          @toggle-solo="onToggleSolo"
          @volume-change="onVolumeChange"
        />
      </div>

      <!-- Piano Roll -->
      <div class="min-h-0 min-w-0 flex-1">
        <PianoRoll />
      </div>
    </div>
  </div>
</template>
