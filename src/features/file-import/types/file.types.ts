export type FileType = 'midi' | 'musicxml'
export type FileStatus = 'importing' | 'parsing' | 'ready' | 'error'

export interface FileRecord {
  id: string
  name: string
  type: FileType
  size: number
  importedAt: number
  status: FileStatus
  error?: string
}

export interface ImportedFile {
  id: string
  blob: Blob
}

// --- Parsed MIDI (mapped from @tonejs/midi API) ---

export interface MidiTempo {
  bpm: number
  time: number
  ticks: number
}

export interface MidiTimeSignature {
  beats: number
  beatType: number
  time: number
  ticks: number
}

export interface MidiNote {
  midi: number
  name: string
  time: number
  duration: number
  ticks: number
  durationTicks: number
  velocity: number
}

export interface MidiTrack {
  name: string
  channel: number
  instrument: string
  notes: MidiNote[]
}

export interface ParsedMidi {
  name: string
  duration: number
  ppq: number
  tempos: MidiTempo[]
  timeSignatures: MidiTimeSignature[]
  tracks: MidiTrack[]
}

// --- Parsed MusicXML (DOMParser extracted) ---

export interface MusicXmlNoteAttributes {
  divisions?: number
  keyFifths?: number
  keyMode?: string
  timeBeats?: number
  timeBeatType?: number
  clefSign?: string
  clefLine?: number
}

export interface MusicXmlNote {
  step?: string
  octave?: number
  alter?: number
  duration: number
  type?: string
  isRest: boolean
  isChord: boolean
  voice?: number
  dots: number
  staff?: number
}

export interface MusicXmlDirection {
  tempo?: number
  dynamics?: string
}

export interface MusicXmlMeasure {
  number: number
  attributes?: MusicXmlNoteAttributes
  directions?: MusicXmlDirection[]
  notes: MusicXmlNote[]
}

export interface MusicXmlPart {
  id: string
  name: string
  measures: MusicXmlMeasure[]
}

export interface ParsedMusicXml {
  title?: string
  parts: MusicXmlPart[]
}

// --- Union type for parsed data ---

export type ParsedData =
  | { type: 'midi'; data: ParsedMidi }
  | { type: 'musicxml'; data: ParsedMusicXml }
