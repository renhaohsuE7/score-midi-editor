/** Unique identifier for an editable note — "t{trackIndex}-e{eventIndex}" or UUID for new notes */
export type NoteId = string

export interface EditableNote {
  id: NoteId
  trackIndex: number
  /** MIDI note number (0-127) */
  midi: number
  /** Note name in scientific pitch notation, e.g. "C4" */
  note: string
  /** Start time in seconds */
  time: number
  /** Duration in seconds */
  duration: number
  /** Velocity 0-1 */
  velocity: number
}

export type EditorTool = 'select' | 'pencil' | 'eraser'

export type SnapDivision = 'off' | '1/1' | '1/2' | '1/4' | '1/8' | '1/16'

export interface EditCommand {
  type: 'move' | 'resize' | 'velocity' | 'add' | 'delete'
  before: EditableNote[]
  after: EditableNote[]
}

export interface DragState {
  type: 'move' | 'resize-start' | 'resize-end' | 'marquee'
  originNotes: EditableNote[]
  deltaTime: number
  deltaMidi: number
}
