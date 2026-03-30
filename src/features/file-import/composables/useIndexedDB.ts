import { openDB, type IDBPDatabase } from 'idb'
import type { FileRecord, ParsedData } from '../types/file.types'

interface ScoreMidiDB {
  files: {
    key: string
    value: FileRecord & { blob: Blob }
    indexes: { 'by-importedAt': number }
  }
  parsedData: {
    key: string
    value: { fileId: string } & ParsedData
  }
}

const DB_NAME = 'score-midi-db'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<ScoreMidiDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ScoreMidiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const filesStore = db.createObjectStore('files', { keyPath: 'id' })
        filesStore.createIndex('by-importedAt', 'importedAt')
        db.createObjectStore('parsedData', { keyPath: 'fileId' })
      },
    })
  }
  return dbPromise
}

export function useIndexedDB() {
  async function saveFile(record: FileRecord, blob: Blob): Promise<void> {
    const db = await getDB()
    await db.put('files', { ...record, blob })
  }

  async function getFile(id: string): Promise<(FileRecord & { blob: Blob }) | undefined> {
    const db = await getDB()
    return db.get('files', id)
  }

  async function getAllFiles(): Promise<FileRecord[]> {
    const db = await getDB()
    const all = await db.getAllFromIndex('files', 'by-importedAt')
    return all.map(({ blob: _, ...record }) => record)
  }

  async function deleteFile(id: string): Promise<void> {
    const db = await getDB()
    const tx = db.transaction(['files', 'parsedData'], 'readwrite')
    await Promise.all([
      tx.objectStore('files').delete(id),
      tx.objectStore('parsedData').delete(id),
      tx.done,
    ])
  }

  async function updateFileStatus(id: string, status: FileRecord['status']): Promise<void> {
    const db = await getDB()
    const existing = await db.get('files', id)
    if (existing) {
      await db.put('files', { ...existing, status })
    }
  }

  async function saveParsedData(fileId: string, parsed: ParsedData): Promise<void> {
    const db = await getDB()
    await db.put('parsedData', { fileId, ...parsed })
  }

  async function getParsedData(fileId: string): Promise<ParsedData | undefined> {
    const db = await getDB()
    const result = await db.get('parsedData', fileId)
    if (!result) return undefined
    const { fileId: _, ...parsed } = result
    return parsed as ParsedData
  }

  async function clearAll(): Promise<void> {
    const db = await getDB()
    const tx = db.transaction(['files', 'parsedData'], 'readwrite')
    await Promise.all([
      tx.objectStore('files').clear(),
      tx.objectStore('parsedData').clear(),
      tx.done,
    ])
  }

  return {
    saveFile,
    getFile,
    getAllFiles,
    deleteFile,
    updateFileStatus,
    saveParsedData,
    getParsedData,
    clearAll,
  }
}
