import { useIndexedDB } from './useIndexedDB'
import type { FileRecord, ParsedData } from '../types/file.types'

function makeRecord(id = 'test-1'): FileRecord {
  return {
    id,
    name: 'test.mid',
    type: 'midi',
    size: 100,
    importedAt: Date.now(),
    status: 'ready',
  }
}

const mockParsedData: ParsedData = {
  type: 'midi',
  data: {
    name: 'Test',
    duration: 4,
    ppq: 480,
    tempos: [],
    timeSignatures: [],
    tracks: [],
  },
}

describe('useIndexedDB', () => {
  const db = useIndexedDB()

  it('saves and retrieves a file', async () => {
    const record = makeRecord('save-1')
    const blob = new Blob(['test'], { type: 'audio/midi' })

    await db.saveFile(record, blob)
    const result = await db.getFile('save-1')

    expect(result).toBeDefined()
    expect(result!.id).toBe('save-1')
    expect(result!.name).toBe('test.mid')
    expect(result!.blob).toBeDefined()
  })

  it('returns undefined for non-existent file', async () => {
    const result = await db.getFile('non-existent')
    expect(result).toBeUndefined()
  })

  it('lists all files without blob', async () => {
    const blob = new Blob(['x'])
    await db.saveFile(makeRecord('list-1'), blob)
    await db.saveFile(makeRecord('list-2'), blob)

    const files = await db.getAllFiles()
    expect(files.length).toBeGreaterThanOrEqual(2)

    const listFile = files.find((f) => f.id === 'list-1')
    expect(listFile).toBeDefined()
    expect((listFile as unknown as Record<string, unknown>)['blob']).toBeUndefined()
  })

  it('saves and retrieves parsed data', async () => {
    await db.saveParsedData('parsed-1', mockParsedData)
    const result = await db.getParsedData('parsed-1')

    expect(result).toBeDefined()
    expect(result!.type).toBe('midi')
    expect((result!.data as { name: string }).name).toBe('Test')
  })

  it('returns undefined for non-existent parsed data', async () => {
    const result = await db.getParsedData('non-existent-parsed')
    expect(result).toBeUndefined()
  })

  it('deletes file and associated parsed data', async () => {
    const blob = new Blob(['x'])
    await db.saveFile(makeRecord('del-1'), blob)
    await db.saveParsedData('del-1', mockParsedData)

    await db.deleteFile('del-1')

    expect(await db.getFile('del-1')).toBeUndefined()
    expect(await db.getParsedData('del-1')).toBeUndefined()
  })
})
