import { setActivePinia, createPinia } from 'pinia'
import { useFilesStore } from './files.store'
import type { FileRecord, ParsedData } from '../types/file.types'

function makeRecord(overrides: Partial<FileRecord> = {}): FileRecord {
  return {
    id: 'test-1',
    name: 'test.mid',
    type: 'midi',
    size: 100,
    importedAt: Date.now(),
    status: 'ready',
    ...overrides,
  }
}

const mockParsedMidi: ParsedData = {
  type: 'midi',
  data: {
    name: 'Test',
    duration: 4,
    ppq: 480,
    tempos: [{ bpm: 120, time: 0, ticks: 0 }],
    timeSignatures: [{ beats: 4, beatType: 4, time: 0, ticks: 0 }],
    tracks: [],
  },
}

describe('useFilesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts empty', () => {
    const store = useFilesStore()
    expect(store.hasFiles).toBe(false)
    expect(store.fileList).toHaveLength(0)
    expect(store.selectedFileId).toBeNull()
  })

  it('adds and lists files sorted by importedAt desc', () => {
    const store = useFilesStore()
    store.addFile(makeRecord({ id: 'a', importedAt: 100 }))
    store.addFile(makeRecord({ id: 'b', importedAt: 200 }))

    expect(store.hasFiles).toBe(true)
    expect(store.fileList).toHaveLength(2)
    expect(store.fileList[0]!.id).toBe('b')
    expect(store.fileList[1]!.id).toBe('a')
  })

  it('updates file status', () => {
    const store = useFilesStore()
    store.addFile(makeRecord({ id: 'x', status: 'importing' }))
    store.updateFileStatus('x', 'parsing')

    expect(store.files.get('x')!.status).toBe('parsing')
  })

  it('updates status with error', () => {
    const store = useFilesStore()
    store.addFile(makeRecord({ id: 'x', status: 'parsing' }))
    store.updateFileStatus('x', 'error', 'parse failed')

    expect(store.files.get('x')!.status).toBe('error')
    expect(store.files.get('x')!.error).toBe('parse failed')
  })

  it('marks file ready', () => {
    const store = useFilesStore()
    store.addFile(makeRecord({ id: 'x', status: 'parsing' }))
    store.markFileReady('x')

    expect(store.files.get('x')!.status).toBe('ready')
  })

  it('removes file and clears selection', () => {
    const store = useFilesStore()
    store.addFile(makeRecord({ id: 'x' }))
    store.selectFile('x')
    expect(store.selectedFileId).toBe('x')

    store.removeFile('x')
    expect(store.hasFiles).toBe(false)
    expect(store.selectedFileId).toBeNull()
  })

  it('selects file and computes selectedFile', () => {
    const store = useFilesStore()
    const record = makeRecord({ id: 'x' })
    store.addFile(record)
    store.selectFile('x')

    expect(store.selectedFile).toEqual(record)
  })

  it('sets selected parsed data via lazy load', () => {
    const store = useFilesStore()
    store.addFile(makeRecord({ id: 'x' }))
    store.selectFile('x')

    expect(store.selectedParsedData).toBeNull()

    store.setSelectedParsedData(mockParsedMidi)
    expect(store.selectedParsedData).toEqual(mockParsedMidi)
  })

  it('computes isAnyProcessing', () => {
    const store = useFilesStore()
    store.addFile(makeRecord({ id: 'a', status: 'ready' }))
    expect(store.isAnyProcessing).toBe(false)

    store.addFile(makeRecord({ id: 'b', status: 'parsing' }))
    expect(store.isAnyProcessing).toBe(true)

    store.updateFileStatus('b', 'ready')
    store.addFile(makeRecord({ id: 'c', status: 'importing' }))
    expect(store.isAnyProcessing).toBe(true)
  })

  it('hydrates from DB records (metadata only)', () => {
    const store = useFilesStore()
    const records = [
      makeRecord({ id: 'a', importedAt: 100 }),
      makeRecord({ id: 'b', importedAt: 200 }),
    ]

    store.hydrateFiles(records)

    expect(store.fileList).toHaveLength(2)
  })

  it('clearAll resets everything', () => {
    const store = useFilesStore()
    store.addFile(makeRecord({ id: 'x' }))
    store.selectFile('x')
    store.setSelectedParsedData(mockParsedMidi)

    store.clearAll()

    expect(store.hasFiles).toBe(false)
    expect(store.selectedFileId).toBeNull()
    expect(store.selectedParsedData).toBeNull()
  })
})
