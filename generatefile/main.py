"""Generate MIDI test files for score_midi_ui frontend.

Usage:
    uv run python main.py              # generate all files to ../data/
    uv run python main.py --out /path  # custom output directory
"""

from __future__ import annotations

import argparse
from pathlib import Path

import mido

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TICKS_PER_BEAT = 480

# Quarter / half / whole note durations in ticks
Q = TICKS_PER_BEAT
H = TICKS_PER_BEAT * 2
W = TICKS_PER_BEAT * 4

# ---------------------------------------------------------------------------
# Music Theory
# ---------------------------------------------------------------------------

# Chord intervals (semitones from root)
CHORD_TYPES: dict[str, list[int]] = {
    "major": [0, 4, 7],
    "minor": [0, 3, 7],
    "dim": [0, 3, 6],
}

# C major diatonic chords: degree → (semitone offset from C, chord type)
C_MAJOR_DEGREES: dict[int, tuple[int, str]] = {
    1: (0, "major"),   # I    = C
    2: (2, "minor"),   # ii   = Dm
    3: (4, "minor"),   # iii  = Em
    4: (5, "major"),   # IV   = F
    5: (7, "major"),   # V    = G
    6: (9, "minor"),   # vi   = Am
    7: (11, "dim"),    # vii° = Bdim
}


def bpm_to_tempo(bpm: float) -> int:
    """BPM → microseconds per beat."""
    return int(60_000_000 / bpm)


def chord_notes(root_midi: int, chord_type: str) -> list[int]:
    """Build chord MIDI notes from root + chord type."""
    return [root_midi + iv for iv in CHORD_TYPES[chord_type]]


def degree_root(degree: int, octave: int = 4) -> tuple[int, str]:
    """Get (root_midi, chord_type) for a C major scale degree at given octave.

    Example: degree_root(6, 3) → (57, "minor")  # A3 minor
    """
    offset, chord_type = C_MAJOR_DEGREES[degree]
    return 12 * (octave + 1) + offset, chord_type


# ---------------------------------------------------------------------------
# MIDI Helpers
# ---------------------------------------------------------------------------


def add_note(
    track: mido.MidiTrack,
    note: int,
    duration: int,
    velocity: int,
    channel: int = 0,
) -> None:
    """Write a single note (note_on + note_off)."""
    track.append(mido.Message("note_on", note=note, velocity=velocity, channel=channel, time=0))
    track.append(mido.Message("note_off", note=note, velocity=0, channel=channel, time=duration))


def add_chord_to_track(
    track: mido.MidiTrack,
    notes: list[int],
    duration: int,
    velocity: int,
    channel: int = 0,
) -> None:
    """Write a block chord (all notes on simultaneously, off after duration)."""
    for n in notes:
        track.append(mido.Message("note_on", note=n, velocity=velocity, channel=channel, time=0))
    for i, n in enumerate(notes):
        track.append(mido.Message("note_off", note=n, velocity=0, channel=channel, time=duration if i == 0 else 0))


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------


def gen_c_major_scale(out: Path) -> None:
    """Single track, C major scale (C4→C5), 120 BPM, 4/4."""
    mid = mido.MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    track = mido.MidiTrack()
    mid.tracks.append(track)

    track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(120), time=0))
    track.append(mido.MetaMessage("time_signature", numerator=4, denominator=4, time=0))
    track.append(mido.MetaMessage("track_name", name="C Major Scale", time=0))

    for note in [60, 62, 64, 65, 67, 69, 71, 72]:  # C4 → C5
        add_note(track, note, Q, velocity=80)

    track.append(mido.MetaMessage("end_of_track", time=0))
    mid.save(str(out / "c-major-scale.mid"))


def gen_multi_track(out: Path) -> None:
    """3 tracks (Melody + Chords + Bass), 100 BPM, 4/4.

    Demonstrates multi-track rendering, per-track colors, and mute/solo.
    """
    mid = mido.MidiFile(type=1, ticks_per_beat=TICKS_PER_BEAT)

    # --- Tempo track (track 0 in Format 1) ---
    tempo_track = mido.MidiTrack()
    mid.tracks.append(tempo_track)
    tempo_track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(100), time=0))
    tempo_track.append(mido.MetaMessage("time_signature", numerator=4, denominator=4, time=0))
    tempo_track.append(mido.MetaMessage("end_of_track", time=0))

    # --- Melody (Track 1, ch 0) ---
    melody = mido.MidiTrack()
    mid.tracks.append(melody)
    melody.append(mido.MetaMessage("track_name", name="Melody", time=0))
    melody.append(mido.Message("program_change", program=0, channel=0, time=0))

    for note, dur in [(72, Q), (74, Q), (76, H), (79, Q), (77, Q), (76, Q), (74, Q)]:
        add_note(melody, note, dur, velocity=90, channel=0)
    melody.append(mido.MetaMessage("end_of_track", time=0))

    # --- Chords (Track 2, ch 1) ---
    chords_track = mido.MidiTrack()
    mid.tracks.append(chords_track)
    chords_track.append(mido.MetaMessage("track_name", name="Chords", time=0))
    chords_track.append(mido.Message("program_change", program=0, channel=1, time=0))

    add_chord_to_track(chords_track, chord_notes(60, "major"), W, velocity=60, channel=1)  # C
    add_chord_to_track(chords_track, chord_notes(55, "major"), W, velocity=60, channel=1)  # G
    chords_track.append(mido.MetaMessage("end_of_track", time=0))

    # --- Bass (Track 3, ch 2) ---
    bass = mido.MidiTrack()
    mid.tracks.append(bass)
    bass.append(mido.MetaMessage("track_name", name="Bass", time=0))
    bass.append(mido.Message("program_change", program=32, channel=2, time=0))

    for note, dur in [(48, H), (48, H), (43, H), (43, H)]:
        add_note(bass, note, dur, velocity=70, channel=2)
    bass.append(mido.MetaMessage("end_of_track", time=0))

    mid.save(str(out / "multi-track.mid"))


def gen_velocity_range(out: Path) -> None:
    """Single track, same note (C4) repeated at 8 velocity levels."""
    mid = mido.MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    track = mido.MidiTrack()
    mid.tracks.append(track)

    track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(120), time=0))
    track.append(mido.MetaMessage("track_name", name="Velocity Range", time=0))

    for vel in [16, 32, 48, 64, 80, 96, 112, 127]:
        add_note(track, 60, Q, velocity=vel)

    track.append(mido.MetaMessage("end_of_track", time=0))
    mid.save(str(out / "velocity-range.mid"))


def gen_wide_range(out: Path) -> None:
    """Single track, notes spanning MIDI 36 (C2) to 96 (C7)."""
    mid = mido.MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    track = mido.MidiTrack()
    mid.tracks.append(track)

    track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(120), time=0))
    track.append(mido.MetaMessage("track_name", name="Wide Range", time=0))

    for note in [36, 48, 60, 72, 84, 96]:
        add_note(track, note, H, velocity=80)

    track.append(mido.MetaMessage("end_of_track", time=0))
    mid.save(str(out / "wide-range.mid"))


def gen_chords_polyphonic(out: Path) -> None:
    """Single track, polyphonic chords (multiple simultaneous notes)."""
    mid = mido.MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    track = mido.MidiTrack()
    mid.tracks.append(track)

    track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(90), time=0))
    track.append(mido.MetaMessage("track_name", name="Chords", time=0))

    chords = [
        chord_notes(60, "major"),            # C major
        chord_notes(60, "major") + [72],     # C major (wide)
        chord_notes(62, "minor"),            # D minor
        chord_notes(64, "minor"),            # E minor
        chord_notes(65, "major"),            # F major
        chord_notes(60, "major") + [72],     # C major (wide)
    ]

    for notes in chords:
        add_chord_to_track(track, notes, H, velocity=75)

    track.append(mido.MetaMessage("end_of_track", time=0))
    mid.save(str(out / "chords-polyphonic.mid"))


def gen_mixed_durations(out: Path) -> None:
    """Single track, various note durations (whole → sixteenth)."""
    mid = mido.MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    track = mido.MidiTrack()
    mid.tracks.append(track)

    track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(100), time=0))
    track.append(mido.MetaMessage("track_name", name="Mixed Durations", time=0))

    patterns = [
        (60, W), (62, H), (64, Q), (65, Q),
        (67, Q // 2), (69, Q // 2), (71, Q // 2), (72, Q // 2),
        (74, Q // 4), (76, Q // 4), (77, Q // 4), (79, Q // 4),
    ]

    for note, dur in patterns:
        add_note(track, note, dur, velocity=80)

    track.append(mido.MetaMessage("end_of_track", time=0))
    mid.save(str(out / "mixed-durations.mid"))


def gen_tempo_change(out: Path) -> None:
    """Single track with tempo changes: 80 → 120 → 160 BPM."""
    mid = mido.MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    track = mido.MidiTrack()
    mid.tracks.append(track)

    track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(80), time=0))
    track.append(mido.MetaMessage("time_signature", numerator=4, denominator=4, time=0))
    track.append(mido.MetaMessage("track_name", name="Tempo Changes", time=0))

    section_notes = [60, 62, 64, 65]

    for note in section_notes:
        add_note(track, note, Q, velocity=80)

    track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(120), time=0))
    for note in section_notes:
        add_note(track, note, Q, velocity=80)

    track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(160), time=0))
    for note in section_notes:
        add_note(track, note, Q, velocity=80)

    track.append(mido.MetaMessage("end_of_track", time=0))
    mid.save(str(out / "tempo-change.mid"))


def gen_chord_progression(out: Path) -> None:
    """3 tracks with I-vi-IV-V (C-Am-F-G) chord progression, 120 BPM, 4/4.

    Musically correct multi-track demo:
    - Melody: scale tones fitting the harmony (chord tones on strong beats)
    - Chords: block chords (whole notes)
    - Bass:   figured bass pattern (root → 5th alternating, quarter notes)

    Progression repeats 2× for a total of 8 bars.
    """
    mid = mido.MidiFile(type=1, ticks_per_beat=TICKS_PER_BEAT)

    # Progression: I-vi-IV-V
    progression = [1, 6, 4, 5]
    repeats = 2

    # --- Tempo track ---
    tempo_track = mido.MidiTrack()
    mid.tracks.append(tempo_track)
    tempo_track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(120), time=0))
    tempo_track.append(mido.MetaMessage("time_signature", numerator=4, denominator=4, time=0))
    tempo_track.append(mido.MetaMessage("end_of_track", time=0))

    # --- Build per-bar data from progression ---
    # Melody: chord tones on strong beats (1, 3), passing tones on weak beats (2, 4)
    # Each bar = 4 quarter notes in octave 5 (melody) / 3 (chords) / 2 (bass)
    melody_patterns: dict[int, list[int]] = {
        # degree → [beat1, beat2, beat3, beat4] as MIDI notes
        1: [76, 74, 72, 74],   # E5, D5, C5, D5  (C: chord tone E, passing D, root C, passing D)
        6: [72, 71, 69, 71],   # C5, B4, A4, B4  (Am: chord tone C, passing B, root A, passing B)
        4: [69, 67, 65, 67],   # A4, G4, F4, G4  (F: chord tone A, passing G, root F, passing G)
        5: [71, 69, 67, 69],   # B4, A4, G4, A4  (G: chord tone B, passing A, root G, passing A)
    }

    # Bass figured bass: root → 5th → root → 5th (quarter notes)
    bass_patterns: dict[int, list[int]] = {
        # degree → [beat1, beat2, beat3, beat4] as MIDI notes (octave 2)
        1: [36, 43, 36, 43],   # C2, G2, C2, G2
        6: [33, 40, 33, 40],   # A1, E2, A1, E2
        4: [41, 48, 41, 48],   # F2, C3, F2, C3
        5: [43, 50, 43, 50],   # G2, D3, G2, D3
    }

    # Chord voicings (octave 3 for root, close position)
    chord_voicings: dict[int, list[int]] = {
        1: chord_notes(48, "major"),   # C3-E3-G3
        6: chord_notes(45, "minor"),   # A2-C3-E3
        4: chord_notes(41, "major"),   # F2-A2-C3  → too low, use octave 3
        5: chord_notes(43, "major"),   # G2-B2-D3  → too low, use octave 3
    }
    # Adjust chords to octave 3-4 range for better separation from bass
    chord_voicings = {
        1: [60, 64, 67],   # C4-E4-G4
        6: [57, 60, 64],   # A3-C4-E4
        4: [53, 57, 60],   # F3-A3-C4
        5: [55, 59, 62],   # G3-B3-D4
    }

    # --- Melody track (ch 0) ---
    melody = mido.MidiTrack()
    mid.tracks.append(melody)
    melody.append(mido.MetaMessage("track_name", name="Melody", time=0))
    melody.append(mido.Message("program_change", program=0, channel=0, time=0))

    for _ in range(repeats):
        for deg in progression:
            for note in melody_patterns[deg]:
                add_note(melody, note, Q, velocity=85, channel=0)
    melody.append(mido.MetaMessage("end_of_track", time=0))

    # --- Chords track (ch 1) ---
    chords = mido.MidiTrack()
    mid.tracks.append(chords)
    chords.append(mido.MetaMessage("track_name", name="Chords", time=0))
    chords.append(mido.Message("program_change", program=0, channel=1, time=0))

    for _ in range(repeats):
        for deg in progression:
            add_chord_to_track(chords, chord_voicings[deg], W, velocity=60, channel=1)
    chords.append(mido.MetaMessage("end_of_track", time=0))

    # --- Bass track (ch 2) — figured bass ---
    bass = mido.MidiTrack()
    mid.tracks.append(bass)
    bass.append(mido.MetaMessage("track_name", name="Bass", time=0))
    bass.append(mido.Message("program_change", program=32, channel=2, time=0))

    for _ in range(repeats):
        for deg in progression:
            for note in bass_patterns[deg]:
                add_note(bass, note, Q, velocity=70, channel=2)
    bass.append(mido.MetaMessage("end_of_track", time=0))

    mid.save(str(out / "chord-progression.mid"))


# ---------------------------------------------------------------------------
# Registry & CLI
# ---------------------------------------------------------------------------

GENERATORS = [
    ("c-major-scale.mid", gen_c_major_scale),
    ("multi-track.mid", gen_multi_track),
    ("velocity-range.mid", gen_velocity_range),
    ("wide-range.mid", gen_wide_range),
    ("chords-polyphonic.mid", gen_chords_polyphonic),
    ("mixed-durations.mid", gen_mixed_durations),
    ("tempo-change.mid", gen_tempo_change),
    ("chord-progression.mid", gen_chord_progression),
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate MIDI test files")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "data",
        help="Output directory (default: ../data/)",
    )
    args = parser.parse_args()

    out: Path = args.out
    out.mkdir(parents=True, exist_ok=True)

    for name, gen_fn in GENERATORS:
        gen_fn(out)
        print(f"  {name}")

    print(f"\nGenerated {len(GENERATORS)} files → {out}/")


if __name__ == "__main__":
    main()
