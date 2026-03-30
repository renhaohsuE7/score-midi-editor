import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { FileRecord, FileStatus, ParsedData } from '../types/file.types'

export const useFilesStore = defineStore('files', () => {
  // --- State ---
  const files = ref(new Map<string, FileRecord>())
  const selectedFileId = ref<string | null>(null)
  const selectedParsedData = ref<ParsedData | null>(null)
  const isLoadingParsedData = ref(false)

  // --- Getters ---
  const fileList = computed(() =>
    [...files.value.values()].sort((a, b) => b.importedAt - a.importedAt),
  )

  const hasFiles = computed(() => files.value.size > 0)

  const isAnyProcessing = computed(() =>
    [...files.value.values()].some(
      (f) => f.status === 'importing' || f.status === 'parsing',
    ),
  )

  const selectedFile = computed(() =>
    selectedFileId.value ? files.value.get(selectedFileId.value) ?? null : null,
  )

  // --- Actions ---
  function addFile(record: FileRecord) {
    files.value.set(record.id, record)
  }

  function updateFileStatus(id: string, status: FileStatus, error?: string) {
    const file = files.value.get(id)
    if (file) {
      files.value.set(id, { ...file, status, error })
    }
  }

  function markFileReady(id: string) {
    updateFileStatus(id, 'ready')
  }

  function removeFile(id: string) {
    files.value.delete(id)
    if (selectedFileId.value === id) {
      selectedFileId.value = null
      selectedParsedData.value = null
    }
  }

  function selectFile(id: string | null) {
    if (selectedFileId.value === id) return
    selectedFileId.value = id
    // Parsed data will be loaded by the composable that calls this
    selectedParsedData.value = null
  }

  function setSelectedParsedData(data: ParsedData | null) {
    selectedParsedData.value = data
    isLoadingParsedData.value = false
  }

  function hydrateFiles(records: FileRecord[]) {
    files.value.clear()
    for (const record of records) {
      files.value.set(record.id, record)
    }
  }

  function clearAll() {
    files.value.clear()
    selectedFileId.value = null
    selectedParsedData.value = null
  }

  return {
    files,
    selectedFileId,
    selectedParsedData,
    isLoadingParsedData,
    fileList,
    hasFiles,
    isAnyProcessing,
    selectedFile,
    addFile,
    updateFileStatus,
    markFileReady,
    removeFile,
    selectFile,
    setSelectedParsedData,
    hydrateFiles,
    clearAll,
  }
})
