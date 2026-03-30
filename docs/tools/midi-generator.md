# MIDI Test File Generator

## 概述

`generatefile/` 是一個獨立的 Python 工具，使用 [mido](https://mido.readthedocs.io/) 產生 MIDI 測試檔案，供前端 Piano Roll 和播放功能開發與展示使用。

## 環境需求

- Python ≥ 3.13
- [uv](https://docs.astral.sh/uv/) 套件管理工具

## 使用方式

```bash
cd generatefile

# 產生所有測試檔案到 ../data/
uv run python main.py

# 指定輸出目錄
uv run python main.py --out ./output
```

首次執行時 `uv` 會自動建立 `.venv` 並安裝 `mido`。

## 產生的檔案

| 檔案 | 內容 | 測試目的 |
| --- | --- | --- |
| `c-major-scale.mid` | C4→C5 八個四分音符，120 BPM | 基礎功能、Piano Roll 顯示 |
| `multi-track.mid` | 3 tracks（Melody + Chords + Bass），100 BPM | 多軌色彩、Mute/Solo、TrackList |
| `velocity-range.mid` | C4 重複 8 次，velocity 16→127 | Velocity/dynamics 視覺化 |
| `wide-range.mid` | C2→C7 跨 5 個八度，半音符 | Piano Roll 自動範圍偵測、垂直捲動 |
| `chords-polyphonic.mid` | 6 組和弦（3-4 音同時），90 BPM | 多音符重疊渲染 |
| `mixed-durations.mid` | 全音符→十六分音符遞減，100 BPM | 音符寬度精確度 |
| `tempo-change.mid` | 3 段速度變化：80→120→160 BPM | BPM 提取、tempo 切換 |
| `chord-progression.mid` | I-vi-IV-V (C-Am-F-G) × 2, 3 tracks, 120 BPM | 樂理正確的多軌展示 |

## 檔案部署

產生的 `.mid` 檔案需放置於兩個位置：

```
data/                   ← 原始資料存放
public/examples/        ← 前端可直接存取（Vite 靜態資源）
```

## MIDI 格式說明

所有檔案使用 Standard MIDI Format (SMF)：

- **Format 0**：單軌（c-major-scale、velocity-range、wide-range、chords、mixed-durations、tempo-change）
- **Format 1**：多軌（multi-track、chord-progression — Track 0 為 tempo track）
- **PPQ**：480 ticks/beat
- **Velocity**：0-127（raw），前端透過 @tonejs/midi 正規化為 0-1

### 前端使用的 MIDI 欄位

| MIDI 欄位       | 前端用途                          |
|-----------------|-----------------------------------|
| `note.midi`     | Piano Roll Y 軸定位（0-127）      |
| `note.name`     | UI 顯示（"C4", "F#5"）           |
| `note.time`     | Piano Roll X 軸定位（秒）         |
| `note.duration` | 音符矩形寬度（秒）               |
| `note.velocity` | 播放音量（正規化 0-1）           |
| `tempo[0].bpm`  | 全域 BPM 顯示                    |
| `track.name`    | TrackList 顯示名稱               |

## 樂理層（Music Theory）

`main.py` 包含可重用的樂理常數與工具函式：

```python
# 和弦類型（根音的半音偏移）
CHORD_TYPES = {"major": [0, 4, 7], "minor": [0, 3, 7], "dim": [0, 3, 6]}

# C 大調各級和弦
C_MAJOR_DEGREES = {1: (0, "major"), 2: (2, "minor"), ..., 6: (9, "minor")}

# 工具函式
chord_notes(root_midi, chord_type)   # → [root, 3rd, 5th] MIDI numbers
degree_root(degree, octave)          # → (root_midi, chord_type)
add_note(track, note, duration, velocity, channel)
add_chord_to_track(track, notes, duration, velocity, channel)
```

### chord-progression.mid 樂理結構

進行：I-vi-IV-V（C-Am-F-G），每和弦 1 bar（4/4），重複 2 次 = 8 bars

| Track | 內容 | 音域 | 原則 |
| --- | --- | --- | --- |
| Melody | 四分音符旋律 | C5-E5 | 強拍用和弦音，弱拍用經過音 |
| Chords | 全音符 block chord | A3-G4 | 三和弦密排 |
| Bass | root-5th 交替四分音符 | A1-D3 | 數字低音（figured bass）風格 |

## 新增測試檔案

在 `main.py` 新增 generator function，並加入 `GENERATORS` 列表：

```python
def gen_my_test(out: Path) -> None:
    mid = mido.MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    track = mido.MidiTrack()
    mid.tracks.append(track)

    track.append(mido.MetaMessage("set_tempo", tempo=bpm_to_tempo(120), time=0))
    track.append(mido.MetaMessage("track_name", name="My Test", time=0))

    # Add notes...
    track.append(mido.Message("note_on", note=60, velocity=80, time=0))
    track.append(mido.Message("note_off", note=60, velocity=0, time=TICKS_PER_BEAT))

    track.append(mido.MetaMessage("end_of_track", time=0))
    mid.save(str(out / "my-test.mid"))

# Register in GENERATORS list
GENERATORS = [
    ...
    ("my-test.mid", gen_my_test),
]
```

## 專案結構

```
generatefile/
├── main.py            # Generator script
├── pyproject.toml     # Python project config (uv + mido)
├── uv.lock            # Lock file
└── .venv/             # Virtual environment (auto-created)
```
