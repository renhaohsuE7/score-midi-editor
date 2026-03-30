import { parseMusicXml } from './musicxml-parser'

const HELLO_WORLD_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Music</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note>
        <pitch><step>C</step><octave>4</octave></pitch>
        <duration>4</duration>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`

const C_MAJOR_SCALE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>C Major Scale</work-title></work>
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note>
    </measure>
  </part>
</score-partwise>`

describe('parseMusicXml', () => {
  it('parses hello-world single whole note', () => {
    const result = parseMusicXml(HELLO_WORLD_XML)

    expect(result.parts).toHaveLength(1)
    expect(result.parts[0]!.id).toBe('P1')
    expect(result.parts[0]!.name).toBe('Music')
    expect(result.parts[0]!.measures).toHaveLength(1)

    const measure = result.parts[0]!.measures[0]!
    expect(measure.number).toBe(1)
    expect(measure.attributes).toBeDefined()
    expect(measure.attributes!.divisions).toBe(1)
    expect(measure.attributes!.timeBeats).toBe(4)
    expect(measure.attributes!.timeBeatType).toBe(4)
    expect(measure.attributes!.clefSign).toBe('G')
    expect(measure.attributes!.clefLine).toBe(2)

    expect(measure.notes).toHaveLength(1)
    const note = measure.notes[0]!
    expect(note.step).toBe('C')
    expect(note.octave).toBe(4)
    expect(note.duration).toBe(4)
    expect(note.type).toBe('whole')
    expect(note.isRest).toBe(false)
    expect(note.isChord).toBe(false)
  })

  it('parses C major scale with title and multiple measures', () => {
    const result = parseMusicXml(C_MAJOR_SCALE_XML)

    expect(result.title).toBe('C Major Scale')
    expect(result.parts).toHaveLength(1)
    expect(result.parts[0]!.name).toBe('Piano')
    expect(result.parts[0]!.measures).toHaveLength(2)

    const m1 = result.parts[0]!.measures[0]!
    expect(m1.notes).toHaveLength(4)
    expect(m1.notes[0]!.step).toBe('C')
    expect(m1.notes[1]!.step).toBe('D')
    expect(m1.notes[2]!.step).toBe('E')
    expect(m1.notes[3]!.step).toBe('F')

    const m2 = result.parts[0]!.measures[1]!
    expect(m2.notes).toHaveLength(4)
    expect(m2.notes[0]!.step).toBe('G')
    expect(m2.notes[3]!.step).toBe('C')
    expect(m2.notes[3]!.octave).toBe(5)
  })

  it('parses rest notes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise version="4.0">
      <part-list><score-part id="P1"><part-name>T</part-name></score-part></part-list>
      <part id="P1">
        <measure number="1">
          <note><rest/><duration>4</duration><type>whole</type></note>
        </measure>
      </part>
    </score-partwise>`

    const result = parseMusicXml(xml)
    const note = result.parts[0]!.measures[0]!.notes[0]!
    expect(note.isRest).toBe(true)
    expect(note.step).toBeUndefined()
    expect(note.octave).toBeUndefined()
  })

  it('parses chord notes', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <score-partwise version="4.0">
      <part-list><score-part id="P1"><part-name>T</part-name></score-part></part-list>
      <part id="P1">
        <measure number="1">
          <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
          <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
        </measure>
      </part>
    </score-partwise>`

    const result = parseMusicXml(xml)
    const notes = result.parts[0]!.measures[0]!.notes
    expect(notes[0]!.isChord).toBe(false)
    expect(notes[1]!.isChord).toBe(true)
    expect(notes[1]!.step).toBe('E')
  })

  it('throws on invalid XML', () => {
    expect(() => parseMusicXml('<invalid><unclosed>')).toThrow('XML parse error')
  })
})
