# Piano Roll 功能文件

## 概述

Piano Roll 是 DAW 風格的音符視覺化元件，以 DOM 方式繪製多軌 MIDI 音符矩形。左側鋼琴鍵盤標示音高，頂部時間尺標示節拍/小節，紅色播放頭追蹤目前播放位置。支援多軌色彩區分、mute 淡化、縮放控制、自動跟隨播放。

## 架構

```
src/features/piano-roll/
├── types/
│   └── piano-roll.types.ts        # PianoRollConfig interface
├── constants.ts                    # Track colors、black key detection、midiToNoteName
├── composables/
│   └── usePianoRoll.ts            # Reactive state: zoom、midiRange、座標轉換
└── components/
    ├── PianoRoll.vue              # Main container: scroll sync + auto-scroll + zoom UI
    ├── PianoRollKeyboard.vue      # Left-side piano key labels
    ├── PianoRollTimeRuler.vue     # Top ruler with beat markers
    ├── PianoRollGrid.vue          # Background grid (semitone lines + beat lines)
    ├── PianoRollNotes.vue         # Note rectangles (DOM-based, per-track coloring)
    └── PianoRollPlayhead.vue      # Red vertical playhead line
```

## 資料來源

Piano Roll 有兩種渲染模式（由 `noteEditorStore.isEditing` 決定）：

| 模式 | 來源 | 說明 |
|------|------|------|
| **唯讀**（初始/無資料） | `playbackStore.playbackTracks` | 原始 PlaybackTrack 資料 |
| **編輯**（有資料時自動啟用） | `noteEditorStore.editableNotes` | 可變 EditableNote Map + 拖曳 preview |

> 目前 Piano Roll 在載入 playbackTracks 後會立即 `initFromPlaybackTracks()`，因此通常處於編輯模式。詳見 [Note Editor 文件](./note-editor.md)。

每個 `PlaybackTrack` 包含：

```typescript
interface PlaybackTrack {
  name: string
  events: TimedNoteEvent[]
}

interface TimedNoteEvent {
  midi: number       // MIDI note number 0-127 → Y 軸定位
  note: string       // "C4", "F#5"
  time: number       // 秒 → X 軸定位
  duration: number   // 秒 → 矩形寬度
  velocity: number   // 0-1
}
```

## 核心設計

### usePianoRoll Composable

響應式的 Piano Roll 狀態與座標轉換：

| 屬性/方法           | 型別              | 說明                                                    |
|---------------------|-------------------|---------------------------------------------------------|
| `pixelsPerSecond`   | `Ref<number>`     | 水平縮放因子（預設 100，範圍 20–500）                   |
| `noteHeight`        | `Ref<number>`     | 每個 semitone 的像素高度（預設 12）                     |
| `midiRange`         | `Computed`        | 自動偵測 `{min, max}`，含 ±4 semitone padding           |
| `effectiveDuration` | `Computed<number>`| `max(playbackStore.duration, editorStore.maxEndTime)` — 考慮編輯超出原始長度 |
| `contentWidth`      | `Computed<number>`| `effectiveDuration × pixelsPerSecond` — 音符內容區域寬度 |
| `extensionDuration` | `Computed<number>`| `EXTENSION_BARS(4) × 4 × secondsPerBeat` — 延伸區域時長 |
| `totalWidth`        | `Computed<number>`| `(effectiveDuration + extensionDuration) × pixelsPerSecond` |
| `totalHeight`       | `Computed<number>`| `(max - min + 1) × noteHeight`                          |
| `secondsPerBeat`    | `Computed<number>`| `60 / bpm`                                              |
| `timeToX(sec)`      | `function`        | 秒 → X 像素                                            |
| `midiToY(midi)`     | `function`        | MIDI number → Y 像素（高音在上）                        |
| `durationToWidth()` | `function`        | 持續秒數 → 寬度像素                                    |
| `zoomIn()`          | `function`        | `pixelsPerSecond × 1.5`（max 500）                      |
| `zoomOut()`         | `function`        | `pixelsPerSecond / 1.5`（min 20）                       |

### MIDI Range 自動偵測

掃描所有 track 的所有 event，找出最小/最大 MIDI number，加上 ±4 semitone padding。若無音符則預設 C3–C6（48–84）。

### 座標系統

```
Y 軸：高音在上（maxMidi → top: 0px）
X 軸：時間由左到右（time=0 → left: 0px）

midiToY(midi) = (maxMidi - midi) × noteHeight
timeToX(sec)  = sec × pixelsPerSecond
```

## 元件說明

### PianoRoll.vue（Main Container）

職責：

1. **Scroll Sync** — 主捲動區域的 `scrollTop` 同步到 Keyboard，`scrollX` 透過 CSS `transform: translateX()` 同步到 TimeRuler（避免 scrollLeft 因 scrollbar 寬度差異導致 desync）
2. **Auto-Scroll** — 播放中自動捲動，保持 playhead 可見（若 playhead 超出右側 50px 邊界或小於左側，自動調整 scrollLeft）
3. **Zoom Controls** — +/- 按鈕呼叫 `zoomIn()` / `zoomOut()`
4. **Editor 整合** — 初始化 `noteEditorStore`，整合 `useNoteDrag` / `useNoteCreate` / `useKeyboardShortcuts` composables
5. **EditorToolbar** — 工具列顯示 S/P/E 工具、Undo/Redo、Snap 選擇器、Export .mid
6. **Velocity Popup** — Double-click 音符顯示浮動 slider（0-127），按 OK 提交
7. **Extension Zone** — 音符內容結束後 4 小節的深色半透明覆蓋區域（`bg-black/15`），提供空白空間供新增/移動音符。使用 `pointer-events-none` 確保不影響操作

佈局：

```
┌────────┬──────────────────────────────┐
│ corner │     PianoRollTimeRuler       │ ← overflow-hidden, sync via CSS transform
├────────┼──────────────────────────────┤
│        │                              │
│Keyboard│  Grid + Notes + Playhead     │ ← overflow-auto (main scroll)
│        │                              │
│ sync   │  (relative container         │
│scrollY │   width=totalWidth           │
│        │   height=totalHeight)        │
└────────┴──────────────────────────────┘
```

### PianoRollKeyboard.vue

- 垂直排列的鋼琴鍵標籤（minMidi → maxMidi）
- 白鍵 / 黑鍵背景色區分
- 在 C 音（八度邊界）顯示音名標籤（如 "C4"）
- 寬度固定 48px

### PianoRollTimeRuler.vue

- 水平時間標尺，每個 beat 一條刻度線
- 高度固定 20px
- 根據 `secondsPerBeat` 和 `pixelsPerSecond` 計算刻度間距

### PianoRollGrid.vue

- **水平線**：每個 semitone 一條細線，C 音加粗
- **垂直線**：每個 beat 一條細線
- 使用 absolute positioning，與 Notes/Playhead 疊加

### PianoRollNotes.vue

- 為每個 track 的每個 event 產生一個 `<div>` 矩形
- **位置**：`left = time × pps`, `top = (maxMidi - midi) × noteHeight`
- **大小**：`width = max(duration × pps, 2px)`, `height = noteHeight - 1`
- **顏色**：按 track index 使用 `TRACK_HEX_COLORS` 色盤（8 色循環）
- **Mute 效果**：muted track 的音符 opacity 降為 0.25
- **編輯模式**：選中音符顯示白色 ring-2；拖曳中的音符 opacity 降為 0.6，位置/大小即時 preview
- **Resize handles**：音符左右各 6px 偵測區域，hover 時 cursor 變為 `ew-resize`
- **Events**：`noteMousedown`（含 zone: body/resize-start/resize-end）、`noteDblclick`（velocity popup）

### PianoRollPlayhead.vue

- 紅色垂直線（`w-px bg-red-500`）
- `left = currentTime × pixelsPerSecond`
- 僅在 `currentTime > 0 || isPlaying` 時顯示

## 共用常數

### Track 色盤

```typescript
// Tailwind classes（用於 TrackRow 色條）
TRACK_BG_COLORS = ['bg-blue-500', 'bg-green-500', ..., 'bg-red-500']

// Hex（用於 PianoRollNotes inline style）
TRACK_HEX_COLORS = ['#3b82f6', '#22c55e', ..., '#ef4444']
```

8 色循環，TrackRow 和 PianoRollNotes 共用同一組色盤。

### 工具函式

| 函式                        | 說明                                  |
|-----------------------------|---------------------------------------|
| `isBlackKey(midi: number)`  | 判斷 MIDI number 是否為黑鍵          |
| `midiToNoteName(midi: number)` | MIDI number → "C4", "F#5" 等      |

## 整合

### FileDetailView.vue 佈局

```
┌─────────────────────────────────────┐
│ DetailHeader                        │
├─────────────────────────────────────┤
│ DetailTransport                     │
├────────────┬────────────────────────┤
│ TrackList   │                       │
│ (sidebar)   │     PianoRoll         │
│             │                       │
├────────────┴────────────────────────┤
```

- **Desktop (≥ md)**：可收合 sidebar（w-64 / w-14）+ PianoRoll 佔滿右側
- **Mobile (< md)**：TrackList 上方可收合面板 + PianoRoll 在下方

### 與 Playback 的互動

1. `usePlayback` 載入檔案時呼叫 `playbackStore.setPlaybackTracks(data.tracks)` → Piano Roll 自動更新
2. `playbackStore.currentTime` 變更 → Playhead 位置更新 + auto-scroll
3. `playbackStore.tracks[i].muted` 變更 → 對應 track 音符淡化
4. 檔案切換 / reset 時 `setPlaybackTracks([])` → Piano Roll 清空

### 與 Note Editor 的互動

1. `playbackTracks` 變更 → `editorStore.initFromPlaybackTracks(tracks)` → 進入編輯模式
2. PianoRollNotes 切換為 `notesFromEditor()` 渲染 editableNotes（含選取 ring、drag preview）
3. 工具列互動：Select（拖曳）/ Pencil（建立）/ Eraser（刪除）
4. 播放時 `usePlayback.play()` 自動使用 `editorStore.toPlaybackTracks()` 的編輯資料
5. Export 將 editableNotes 匯出為 SMF Format 1 .mid 檔案

詳見 [Note Editor 文件](./note-editor.md)。
