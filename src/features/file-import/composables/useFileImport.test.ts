import { setActivePinia, createPinia } from 'pinia'
import {
  useFileImport,
  ensureFilesLoaded,
  formatFileSize,
  _resetInitForTesting,
} from './useFileImport'
import { useFilesStore } from '../stores/files.store'

// Mock the parser service to avoid actual Worker usage in tests
vi.mock('../services/file-parser.service', () => ({
  parseMidiFile: vi.fn(async (_id: string, _buffer: ArrayBuffer) => ({
    name: 'Test MIDI',
    duration: 4,
    ppq: 480,
    tempos: [{ bpm: 120, time: 0, ticks: 0 }],
    timeSignatures: [{ beats: 4, beatType: 4, time: 0, ticks: 0 }],
    tracks: [],
  })),
  parseMusicXmlFile: vi.fn(async (_id: string, _xml: string) => ({
    title: 'Test Score',
    parts: [{ id: 'P1', name: 'Piano', measures: [] }],
  })),
  terminateWorkers: vi.fn(),
}))

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})

describe('useFileImport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    _resetInitForTesting()
  })

  it('imports a MIDI file and updates store', async () => {
    const { importFiles } = useFileImport()
    const filesStore = useFilesStore()

    const file = new File([new ArrayBuffer(10)], 'test.mid', { type: 'audio/midi' })
    await importFiles([file])

    expect(filesStore.hasFiles).toBe(true)
    expect(filesStore.fileList).toHaveLength(1)
    expect(filesStore.fileList[0]!.name).toBe('test.mid')
    expect(filesStore.fileList[0]!.type).toBe('midi')
    expect(filesStore.fileList[0]!.status).toBe('ready')
  })

  it('imports a MusicXML file and updates store', async () => {
    const { importFiles } = useFileImport()
    const filesStore = useFilesStore()

    const file = new File(['<xml/>'], 'score.musicxml', { type: 'application/xml' })
    await importFiles([file])

    expect(filesStore.hasFiles).toBe(true)
    expect(filesStore.fileList[0]!.name).toBe('score.musicxml')
    expect(filesStore.fileList[0]!.type).toBe('musicxml')
    expect(filesStore.fileList[0]!.status).toBe('ready')
  })

  it('skips unsupported file types', async () => {
    const { importFiles } = useFileImport()
    const filesStore = useFilesStore()

    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    await importFiles([file])

    expect(filesStore.hasFiles).toBe(false)
  })

  it('removes a file from store and DB', async () => {
    const { importFiles, removeFile } = useFileImport()
    const filesStore = useFilesStore()

    const file = new File([new ArrayBuffer(10)], 'test.mid', { type: 'audio/midi' })
    await importFiles([file])

    const id = filesStore.fileList[0]!.id
    await removeFile(id)

    expect(filesStore.hasFiles).toBe(false)
  })

  it('ensureFilesLoaded hydrates store from DB', async () => {
    const { importFiles } = useFileImport()

    // Import first
    const file = new File([new ArrayBuffer(10)], 'persist.mid', { type: 'audio/midi' })
    await importFiles([file])

    // Reset store and singleton (simulate new session)
    const freshPinia = createPinia()
    setActivePinia(freshPinia)
    _resetInitForTesting()

    await ensureFilesLoaded()

    const filesStore = useFilesStore()
    expect(filesStore.hasFiles).toBe(true)
    expect(filesStore.fileList.some((f) => f.name === 'persist.mid')).toBe(true)
  })
})
