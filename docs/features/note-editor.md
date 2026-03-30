# Note Editor 功能文件

## 概述

Note Editor 在 Piano Roll 上提供互動式 MIDI 音符編輯，包含選取、移動、縮放、新增、刪除、Undo/Redo、Velocity 調整、播放回流、及 MIDI 匯出。

目前僅作用於已轉換為 `PlaybackTrack[]` 的資料（MIDI 與 MusicXML 共用 `TimedNoteEvent` 中間格式），因此**兩種格式匯入的檔案都可在同一介面編輯**。

## 架構

```
src/features/note-editor/
├── types/
│   └── note-editor.types.ts          # EditableNote, EditorTool, EditCommand, DragState
├── stores/
│   ├── note-editor.store.ts          # Pinia store: 可變資料層 + 選取 + Undo/Redo + Drag + Clipboard
│   └── note-editor.store.test.ts     # 33 tests
├── composables/
│   ├── useNoteDrag.ts                # Drag 生命週期 (mousedown→mousemove→mouseup)
│   ├── useNoteCoordinates.ts         # 反向座標 xToTime(), yToMidi()
│   ├── useNoteCreate.ts              # Pencil tool 新增 / Eraser tool 刪除
│   └── useKeyboardShortcuts.ts       # 完整快捷鍵（工具切換、移動、複製貼上、新增）
├── services/
│   ├── snap.ts                       # snapTime(), snapDuration(), DIVISION_FRACTIONS
│   └── midi-export.ts                # EditableNote[] → SMF Format 1 binary
└── components/
    └── EditorToolbar.vue             # Tool 選擇器 + Undo/Redo + Export
```

## 資料模型

### EditableNote

Editor 的核心資料單位，由 `PlaybackTrack.events` 初始化：

```typescript
type NoteId = string  // "t{trackIndex}-e{eventIndex}" 或 "new-{counter}"

interface EditableNote {
  id: NoteId
  trackIndex: number
  midi: number        // MIDI note number 0-127
  note: string        // "C4", "F#5"（由 midi 推導）
  time: number        // 秒
  duration: number    // 秒
  velocity: number    // 0-1
}
```

### EditorTool / SnapDivision

```typescript
type EditorTool = 'select' | 'pencil' | 'eraser'
type SnapDivision = 'off' | '1/1' | '1/2' | '1/4' | '1/8' | '1/16'
```

### EditCommand（Undo/Redo 單位）

```typescript
interface EditCommand {
  type: 'move' | 'resize' | 'velocity' | 'add' | 'delete'
  before: EditableNote[]   // 操作前的狀態（delete 時為被刪除的 notes，add 時為空）
  after: EditableNote[]    // 操作後的狀態（delete 時為空，add 時為新增的 notes）
}
```

### DragState

```typescript
interface DragState {
  type: 'move' | 'resize-start' | 'resize-end' | 'marquee'
  originNotes: EditableNote[]
  deltaTime: number
  deltaMidi: number
}
```

## Pinia Store（note-editor.store.ts）

### State

| 欄位 | 型別 | 說明 |
|------|------|------|
| `editableNotes` | `shallowRef<Map<NoteId, EditableNote>>` | 所有可編輯音符 |
| `selectedNoteIds` | `Ref<Set<NoteId>>` | 選中的音符 ID |
| `activeTool` | `Ref<EditorTool>` | 目前工具（select/pencil/eraser） |
| `snapDivision` | `Ref<SnapDivision>` | Snap 設定 |
| `activeTrackIndex` | `Ref<number>` | Pencil 建立音符時使用的 track |
| `isEditing` | `Ref<boolean>` | 是否在編輯模式 |
| `dragState` | `Ref<DragState \| null>` | 拖曳狀態 |
| `clipboard` | `Ref<EditableNote[]>` | 複製/剪下的音符暫存 |
| `undoStack` / `redoStack` | `Ref<EditCommand[]>` | Undo/Redo 堆疊（上限 100） |

### Getters

| 名稱 | 說明 |
|------|------|
| `noteList` | editableNotes 的 Array 形式 |
| `selectedNotes` | 被選中的 EditableNote[] |
| `hasSelection` | 是否有選取 |
| `canUndo` / `canRedo` | 是否可撤銷/重做 |
| `isDragging` | 是否正在拖曳 |
| `maxEndTime` | 所有音符的最大 end time（time + duration），供 Piano Roll 延伸顯示 |

### Actions

| 名稱 | 說明 |
|------|------|
| `initFromPlaybackTracks(tracks)` | 從 PlaybackTrack[] 建立 editableNotes，進入編輯模式 |
| `selectNote(id, shift?)` | 選取音符；shift=true 加入/移除 |
| `selectAll()` | 全選 |
| `clearSelection()` | 清除選取 |
| `addNote(note)` | 新增音符（透過 executeCommand） |
| `deleteSelectedNotes()` | 刪除選中音符（透過 executeCommand） |
| `setVelocity(ids, velocity)` | 修改指定音符的 velocity |
| `startDrag(type, noteIds)` | 開始拖曳 |
| `updateDrag(deltaTime, deltaMidi)` | 更新拖曳 delta（mousemove） |
| `commitDrag()` | 提交拖曳為 EditCommand（套用 snap） |
| `cancelDrag()` | 取消拖曳（Escape） |
| `moveSelectedNotes(deltaTime, deltaMidi)` | 移動選中音符（時間 + 音高），支援 snap |
| `addNoteAtPosition(time, midi)` | 在指定位置新增音符（snap time，snap grid duration），自動選取 |
| `copySelectedNotes()` | 複製選中音符到 clipboard |
| `cutSelectedNotes()` | 剪下選中音符（copy + delete） |
| `pasteNotes(atTime)` | 從 clipboard 貼上到指定時間（相對偏移） |
| `duplicateSelectedNotes()` | 複製選中音符到其後方（Ctrl+D） |
| `getSnapGridSize()` | 回傳目前 snap grid 的時間單位（秒） |
| `executeCommand(cmd)` | 執行 EditCommand，push undoStack |
| `undo()` / `redo()` | 撤銷 / 重做 |
| `toPlaybackTracks()` | 將 editableNotes 轉回 PlaybackTrack[]（供播放） |
| `reset()` | 重設所有狀態 |

## Composables

### useNoteDrag

在 Vue component setup 中使用，管理完整拖曳生命週期：

```
mousedown (on note div)
  → beginDrag(type, noteId, event)
  → window.addEventListener('mousemove' / 'mouseup' / 'keydown')

mousemove → editorStore.updateDrag(deltaTime, deltaMidi)
mouseup   → editorStore.commitDrag() + cleanup
Escape    → editorStore.cancelDrag() + cleanup
```

拖曳期間只更新 `dragState`，不修改 `editableNotes`。Preview 由 PianoRollNotes computed 從 `dragState + originNotes + delta` 計算。

### useNoteCreate

- **Pencil tool**：click grid → `snapTime()` 定位 → `addNote()` → `selectNote()`
- **Eraser tool**：click note → `selectNote()` + `deleteSelectedNotes()`

### useKeyboardShortcuts

#### 工具切換

| 快捷鍵 | 動作 |
|--------|------|
| `1` / `V` | Select tool |
| `2` / `B` | Pencil tool |
| `3` / `N` | Eraser tool |

#### 音符操作

| 快捷鍵 | 動作 |
|--------|------|
| `A` | 在 playhead 位置新增 C4 音符（snap duration），自動選取 |
| `ArrowUp` | 選中音符上移 1 semitone |
| `ArrowDown` | 選中音符下移 1 semitone |
| `Shift+ArrowUp` | 選中音符上移 1 octave (12 semitones) |
| `Shift+ArrowDown` | 選中音符下移 1 octave |
| `ArrowLeft` | 選中音符左移 1 snap grid unit |
| `ArrowRight` | 選中音符右移 1 snap grid unit |

#### 剪貼簿

| 快捷鍵 | 動作 |
|--------|------|
| `Ctrl+C` | 複製選中音符 |
| `Ctrl+X` | 剪下選中音符 |
| `Ctrl+V` | 貼上到 playhead 位置 |
| `Ctrl+D` | 複製到選中音符後方 |

#### 編輯

| 快捷鍵 | 動作 |
|--------|------|
| `Delete` / `Backspace` | 刪除選中音符 |
| `Ctrl+A` | 全選 |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |

### useNoteCoordinates

反向座標轉換（對應 `usePianoRoll` 的正向函式）：

| 方法 | 說明 |
|------|------|
| `xToTime(x)` | x 像素 → 秒 |
| `yToMidi(y)` | y 像素 → MIDI number |
| `widthToDuration(w)` | 寬度像素 → 秒 |

## Services

### snap.ts

```typescript
snapTime(time, division, secondsPerBeat): number    // 對齊最近格線
snapDuration(duration, division, secondsPerBeat): number  // 對齊（至少一格）
DIVISION_FRACTIONS: Record<SnapDivision, number>    // division → beat 比例
```

Division 對照（`DIVISION_FRACTIONS`）：`1/1`=1beat, `1/2`=0.5beat, `1/4`=0.25beat, `1/8`=0.125beat, `1/16`=0.0625beat

### midi-export.ts

將 editableNotes 匯出為 SMF Format 1 .mid 檔案：

- Track 0 = tempo track（tempo meta event + time signature）
- Track 1+ = note tracks（note on/off events with delta time）
- PPQ = 480
- VLQ encoding for delta times

```typescript
exportToMidi(notesByTrack: Map<number, EditableNote[]>, bpm: number): Uint8Array
downloadMidi(data: Uint8Array, filename: string): void  // 觸發瀏覽器下載
```

## 與 Piano Roll 的整合

### 雙模式渲染（PianoRollNotes.vue）

```
noteRects = computed(() => {
  if (editorStore.isEditing) → notesFromEditor()   // 讀 editableNotes + drag preview
  else                       → notesFromPlayback()  // 讀 playbackStore（唯讀）
})
```

### 初始化（PianoRoll.vue）

```
watch(playbackStore.playbackTracks, (tracks) => {
  tracks.length > 0 → editorStore.initFromPlaybackTracks(tracks)
  else              → editorStore.reset()
}, { immediate: true })
```

### 互動事件

| 事件 | 工具 | 動作 |
|------|------|------|
| click note | select | selectNote（+ shift 多選） |
| drag note body | select | move（time + pitch） |
| drag note edges | select | resize（duration） |
| click note | eraser | 刪除 |
| click background | pencil | 建立新音符 |
| click background | select | 清除選取 |
| dblclick note | any | Velocity popup slider |

### EditorToolbar

位於 PianoRoll 頂部工具列，包含：

- **S / P / E** 工具按鈕（Select / Pencil / Eraser）
- **Undo / Redo** 按鈕
- **Export .mid** 按鈕
- **Snap** 選擇器（Off, 1/1, 1/2, 1/4, 1/8, 1/16）

## 與 Playback 的整合

`usePlayback.play()` 在播放時檢查 `noteEditorStore.isEditing`：

```
play()
  → if noteEditorStore.isEditing:
    → toPlaybackTracks() → edited PlaybackData
    → engine.loadPlaybackData(fileId, editedData)
    → playbackStore.setPlaybackTracks(editedTracks)
  → else:
    → 使用原始 ParsedData
```

這確保使用者在編輯後按 Play，能聽到修改結果。

## 效能考量

- **shallowRef + triggerRef**：editableNotes 使用 `shallowRef` 避免深層響應性
- **Drag preview**：mousemove 只更新 `dragState`（~60fps），不重建 Map
- **Undo 上限**：100 commands，超過丟棄最舊的
- **DOM 音符**：一般 MIDI 500-2000 notes 的 DOM div 效能足夠

## 測試

```bash
docker compose exec dev npx vitest run
```

| 檔案 | 測試數 | 說明 |
|------|--------|------|
| `note-editor.store.test.ts` | 33 | init, 選取, add/delete, undo/redo, toPlaybackTracks, reset, moveSelectedNotes, addNoteAtPosition, clipboard (copy/cut/paste/duplicate) |

## MIDI 與 MusicXML 統一編輯：目前狀態與未來規劃

### 目前架構（Phase 1-8）

```
匯入                    中間格式                          編輯層
┌──────────┐          ┌────────────────┐              ┌──────────────────┐
│ .mid     │──parse──→│ PlaybackTrack  │──init──→     │ EditableNote     │
│ .musicxml│──parse──→│ (TimedNoteEvent│              │ (id, trackIndex, │
└──────────┘          │  midi, note,   │              │  midi, note,     │
                      │  time, duration│              │  time, duration, │
                      │  velocity)     │              │  velocity)       │
                      └────────────────┘              └──────┬───────────┘
                                                             │
                                              ┌──────────────┼──────────────┐
                                              ↓              ↓              ↓
                                         Playback       MIDI Export    (Future)
                                     toPlaybackTracks   exportToMidi   MusicXML Export
```

**優點**：MIDI 和 MusicXML 都先轉換為 `TimedNoteEvent`（秒級時間 + MIDI number），編輯層完全格式無關。

**限制**：
- 編輯後只能匯出為 MIDI（不保留 MusicXML 特有資訊）
- MusicXML 的 divisions、符值（type）、附點、休止符、聲部（voice）、譜號等資訊在轉換為 `TimedNoteEvent` 時已遺失
- 無法做「樂譜級」的編輯（如改變拍號、調號、符值）

### 未來規劃：Score-Aware 統一編輯模型

若要在同一 UI 同時支援 MIDI 風格（Piano Roll）與 MusicXML 風格（樂譜）的編輯，需擴展資料模型：

#### Phase A：擴展 EditableNote 為 UnifiedNote

```typescript
interface UnifiedNote extends EditableNote {
  // --- 共用欄位（現有） ---
  // id, trackIndex, midi, note, time, duration, velocity

  // --- Score 層欄位（MusicXML 來源可填，MIDI 來源為 null） ---
  scoreInfo?: {
    divisions: number         // MusicXML divisions 單位
    durationDivisions: number // 原始 duration（divisions 單位）
    type?: string             // "whole" | "half" | "quarter" | "eighth" | "16th" ...
    dots: number              // 附點數
    voice?: number            // 聲部
    staff?: number            // 譜表
    isRest: boolean
    isChord: boolean
    beam?: string             // beam grouping
    articulations?: string[]  // staccato, accent, etc.
    slur?: 'start' | 'stop'
  }
}
```

#### Phase B：雙向轉換

| 方向 | 說明 |
|------|------|
| MusicXML → UnifiedNote | 保留 scoreInfo，同時計算 time/duration（秒） |
| MIDI → UnifiedNote | scoreInfo 為空（或透過 quantize 推測符值） |
| UnifiedNote → MIDI export | 使用 time/duration（秒）→ ticks |
| UnifiedNote → MusicXML export | 使用 scoreInfo → 重建 measure/note 結構 |

#### Phase C：MIDI Quantize（反向推導 scoreInfo）

對於 MIDI 匯入的檔案，可選擇性地執行 quantize：

```
MIDI note (seconds) → snap to grid → 推導最接近的符值(type) + divisions
```

這讓 MIDI 匯入的檔案也能匯出為有意義的 MusicXML。

#### Phase D：MusicXML Export Service

```typescript
// 未來新增
exportToMusicXml(notes: UnifiedNote[], metadata: ScoreMetadata): string
```

需要重建：
- `<score-partwise>` 結構
- `<attributes>`（divisions, key, time, clef）
- `<measure>` 分割（根據 time signature）
- `<note>` 元素（pitch/rest, duration, type, dots, voice, staff）

#### Phase E：Score View（樂譜視圖）

在 Piano Roll 旁邊或切換模式提供樂譜渲染：
- 使用 VexFlow 或 OpenSheetMusicDisplay 渲染樂譜
- 雙向同步：在 Piano Roll 編輯 → 樂譜更新，反之亦然
- 選取同步：兩個視圖共享 `selectedNoteIds`

### 規劃優先順序

| 優先級 | 項目 | 依賴 |
|--------|------|------|
| **已完成** | Phase 1-8：Piano Roll MIDI 編輯 | — |
| **待做** | Phase 9：多 Track 編輯 | — |
| 中期 | Phase A：UnifiedNote 擴展 | Phase 9 |
| 中期 | Phase B：雙向轉換 | Phase A |
| 中期 | Phase D：MusicXML Export | Phase A+B |
| 長期 | Phase C：MIDI Quantize | Phase A |
| 長期 | Phase E：Score View（VexFlow） | Phase A+B+D |
