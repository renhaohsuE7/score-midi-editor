// MusicXML parsing logic — extracted as a pure function.
// DOMParser is NOT available in Web Workers, so this module
// is imported directly on the main thread by file-parser.service.ts.

import type {
  ParsedMusicXml,
  MusicXmlPart,
  MusicXmlMeasure,
  MusicXmlNote,
  MusicXmlNoteAttributes,
  MusicXmlDirection,
} from '../types/file.types'

function getTextContent(parent: Element, tag: string): string | null {
  return parent.getElementsByTagName(tag)[0]?.textContent ?? null
}

function getNumber(parent: Element, tag: string): number | undefined {
  const text = getTextContent(parent, tag)
  return text !== null ? Number(text) : undefined
}

function parseAttributes(attrEl: Element): MusicXmlNoteAttributes {
  return {
    divisions: getNumber(attrEl, 'divisions'),
    keyFifths: getNumber(attrEl, 'fifths'),
    keyMode: getTextContent(attrEl, 'mode') ?? undefined,
    timeBeats: getNumber(attrEl, 'beats'),
    timeBeatType: getNumber(attrEl, 'beat-type'),
    clefSign: getTextContent(attrEl, 'sign') ?? undefined,
    clefLine: getNumber(attrEl, 'line'),
  }
}

function parseNote(noteEl: Element): MusicXmlNote {
  const isRest = noteEl.getElementsByTagName('rest').length > 0
  const isChord = noteEl.getElementsByTagName('chord').length > 0
  const dots = noteEl.getElementsByTagName('dot').length

  const note: MusicXmlNote = {
    duration: Number(getTextContent(noteEl, 'duration') ?? 0),
    type: getTextContent(noteEl, 'type') ?? undefined,
    isRest,
    isChord,
    voice: getNumber(noteEl, 'voice'),
    dots,
    staff: getNumber(noteEl, 'staff'),
  }

  if (!isRest) {
    note.step = getTextContent(noteEl, 'step') ?? undefined
    note.octave = getNumber(noteEl, 'octave')
    note.alter = getNumber(noteEl, 'alter')
  }

  return note
}

const DYNAMICS_TAGS = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'] as const

function parseDirections(measureEl: Element): MusicXmlDirection[] | undefined {
  const dirEls = measureEl.getElementsByTagName('direction')
  if (dirEls.length === 0) return undefined

  const directions: MusicXmlDirection[] = []

  for (let i = 0; i < dirEls.length; i++) {
    const dirEl = dirEls[i]!
    const dir: MusicXmlDirection = {}

    const soundEl = dirEl.getElementsByTagName('sound')[0]
    if (soundEl) {
      const tempoAttr = soundEl.getAttribute('tempo')
      if (tempoAttr) dir.tempo = Number(tempoAttr)
    }

    const dynamicsEl = dirEl.getElementsByTagName('dynamics')[0]
    if (dynamicsEl) {
      for (const tag of DYNAMICS_TAGS) {
        if (dynamicsEl.getElementsByTagName(tag).length > 0) {
          dir.dynamics = tag
          break
        }
      }
    }

    if (dir.tempo !== undefined || dir.dynamics !== undefined) {
      directions.push(dir)
    }
  }

  return directions.length > 0 ? directions : undefined
}

function parseMeasure(measureEl: Element): MusicXmlMeasure {
  const number = Number(measureEl.getAttribute('number') ?? 0)
  const notes: MusicXmlNote[] = []
  let attributes: MusicXmlNoteAttributes | undefined

  const attrEl = measureEl.getElementsByTagName('attributes')[0]
  if (attrEl) {
    attributes = parseAttributes(attrEl)
  }

  const directions = parseDirections(measureEl)

  const noteEls = measureEl.getElementsByTagName('note')
  for (let i = 0; i < noteEls.length; i++) {
    notes.push(parseNote(noteEls[i]!))
  }

  return { number, attributes, directions, notes }
}

export function parseMusicXml(xml: string): ParsedMusicXml {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')

  const errorNode = doc.querySelector('parsererror')
  if (errorNode) {
    throw new Error(`XML parse error: ${errorNode.textContent}`)
  }

  const title =
    doc.getElementsByTagName('movement-title')[0]?.textContent ??
    doc.getElementsByTagName('work-title')[0]?.textContent ??
    undefined

  const parts: MusicXmlPart[] = []
  const partListEls = doc.getElementsByTagName('score-part')
  const partEls = doc.getElementsByTagName('part')

  for (let i = 0; i < partEls.length; i++) {
    const partEl = partEls[i]!
    const partId = partEl.getAttribute('id') ?? `P${i + 1}`
    const scorePart = partListEls[i]
    const partName =
      scorePart?.getElementsByTagName('part-name')[0]?.textContent ?? partId

    const measures: MusicXmlMeasure[] = []
    const measureEls = partEl.getElementsByTagName('measure')
    for (let j = 0; j < measureEls.length; j++) {
      measures.push(parseMeasure(measureEls[j]!))
    }

    parts.push({ id: partId, name: partName, measures })
  }

  return { title, parts }
}
