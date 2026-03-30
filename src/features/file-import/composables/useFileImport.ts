import { watch } from 'vue'
import { useFilesStore } from '../stores/files.store'
import { useIndexedDB } from './useIndexedDB'
import { parseMidiFile, parseMusicXmlFile } from '../services/file-parser.service'
import { DEFAULT_EXAMPLES } from '@/config/default-examples'
import type { FileRecord, FileType, ParsedData } from '../types/file.types'

const ACCEPTED_EXTENSIONS: Record<string, FileType> = {
  '.mid': 'midi',
  '.midi': 'midi',
  '.musicxml': 'musicxml',
  '.mxl': 'musicxml',
}

export const ACCEPT_STRING = Object.keys(ACCEPTED_EXTENSIONS).join(',')

function detectFileType(fileName: string): FileType | null {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
  return ACCEPTED_EXTENSIONS[ext] ?? null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// --- Standalone import logic (no Vue reactivity) ---

async function importSingleFile(file: File): Promise<void> {
  const filesStore = useFilesStore()
  const db = useIndexedDB()

  const fileType = detectFileType(file.name)
  if (!fileType) return

  const id = generateId()
  const record: FileRecord = {
    id,
    name: file.name,
    type: fileType,
    size: file.size,
    importedAt: Date.now(),
    status: 'importing',
  }

  filesStore.addFile(record)

  try {
    await db.saveFile(record, file)
    filesStore.updateFileStatus(id, 'parsing')

    let parsed: ParsedData
    if (fileType === 'midi') {
      const buffer = await file.arrayBuffer()
      const data = await parseMidiFile(id, buffer)
      parsed = { type: 'midi', data }
    } else {
      const xml = await file.text()
      const data = await parseMusicXmlFile(id, xml)
      parsed = { type: 'musicxml', data }
    }

    await db.saveParsedData(id, parsed)
    await db.updateFileStatus(id, 'ready')
    filesStore.markFileReady(id)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[file-import] Failed to import "${file.name}":`, err)
    filesStore.updateFileStatus(id, 'error', message)
  }
}

async function importFileList(rawFiles: File[]): Promise<void> {
  await Promise.all(rawFiles.map((file) => importSingleFile(file)))
}

async function loadDefaults(): Promise<void> {
  const files: File[] = []
  for (const path of DEFAULT_EXAMPLES) {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}${path}`)
      if (!res.ok) continue
      const blob = await res.blob()
      const name = path.split('/').pop()!
      files.push(new File([blob], name))
    } catch {
      // skip if fetch fails (e.g. in tests)
    }
  }

  if (files.length) {
    await importFileList(files)
  }
}

// --- Singleton init (called from router guard) ---

let _initPromise: Promise<void> | null = null

/**
 * Hydrate file store from IndexedDB; load default examples on first visit.
 * Safe to call multiple times — only the first call does real work.
 */
export function ensureFilesLoaded(): Promise<void> {
  if (!_initPromise) {
    _initPromise = (async () => {
      const db = useIndexedDB()
      const filesStore = useFilesStore()

      const records = await db.getAllFiles()
      filesStore.hydrateFiles(records)

      if (records.length === 0) {
        await loadDefaults()
      }
    })()
  }
  return _initPromise
}

// --- Composable (with Vue reactivity) ---

export function useFileImport() {
  const filesStore = useFilesStore()
  const db = useIndexedDB()

  // Lazy-load parsed data when selectedFileId changes
  watch(
    () => filesStore.selectedFileId,
    async (id) => {
      if (!id) {
        filesStore.setSelectedParsedData(null)
        return
      }
      filesStore.isLoadingParsedData = true
      try {
        const parsed = await db.getParsedData(id)
        // Guard: selection may have changed during await
        if (filesStore.selectedFileId === id) {
          filesStore.setSelectedParsedData(parsed ?? null)
        }
      } catch {
        if (filesStore.selectedFileId === id) {
          filesStore.setSelectedParsedData(null)
        }
      }
    },
  )

  async function removeFile(id: string) {
    await db.deleteFile(id)
    filesStore.removeFile(id)
  }

  async function clearAllFiles() {
    await db.clearAll()
    filesStore.clearAll()
    // Allow re-init after clearing all data
    _initPromise = null
  }

  return {
    importFiles: importFileList,
    removeFile,
    clearAllFiles,
  }
}

/** @internal Reset singleton for testing. */
export function _resetInitForTesting(): void {
  _initPromise = null
}
