# Project Roadmap

## 已完成

### Phase 1-8：Piano Roll MIDI 編輯

- File Import：拖放匯入 MIDI / MusicXML，Web Worker 解析，IndexedDB 持久化
- Playback：Tone.js 音訊引擎，State Machine，per-track mute/solo/volume
- Piano Roll：DOM 音符渲染，多軌色彩，縮放，自動跟隨播放
- Note Editor：選取/移動/縮放/新增/刪除/Undo/Redo/Velocity/MIDI Export
- MusicXML 支援：匯入解析 + 播放（含 tempo/dynamics 提取）
- Pause→Resume 修復：暫停後繼續播放不重置位置
- Extension Zone：音符結束後 4 小節深色延伸區域
- DAW 快捷鍵：工具切換(1/2/3, V/B/N)、移動/轉位(Arrow)、複製貼上(Ctrl+C/X/V/D)、新增(A)
- Scroll Desync 修復：TimeRuler 改用 CSS transform 同步
- Auto-Extend Duration：編輯超出原始長度時自動延伸 Piano Roll 顯示範圍

### 測試覆蓋

165 tests across 14 test files, `vue-tsc` clean.

---

## 待處理 Issues

| Priority | Issue | 檔案 | 說明 |
|----------|-------|------|------|
| P2 | Pencil Tool Two-Step Creation | [pencil-tool-click-duration.md](../issues/pencil-tool-click-duration.md) | Pencil tool 應支援 click-drag 決定 duration，`A` 快捷鍵同理 |

---

## 短期規劃

### Phase 9：多 Track 編輯

**目標**：支援在 Piano Roll 中切換和操作多個 track

- Track 選擇器 UI（sidebar 或 dropdown）
- `activeTrackIndex` 聯動 Pencil tool 和 `A` 快捷鍵
- 不同 track 的音符以不同顏色顯示（已有 `TRACK_HEX_COLORS`）
- Per-track 選取/操作（或跨 track 多選）

### P2：Pencil Tool Click-Drag Duration

**目標**：Pencil tool 支援 click-drag 決定音符長度

- `useNoteCreate.ts`：mousedown → mousemove → mouseup 生命週期
- Duration preview（半透明音符即時顯示）
- 只 click 不拖曳 → 預設 1 grid unit（向下相容）
- `A` 快捷鍵：按下後顯示 pending note，click grid 決定 duration

---

## 中期規劃

### Phase A：UnifiedNote 擴展

**目標**：擴展 EditableNote 為 UnifiedNote，保留 MusicXML score 資訊

```typescript
interface UnifiedNote extends EditableNote {
  scoreInfo?: {
    divisions: number
    durationDivisions: number
    type?: string          // "whole" | "half" | "quarter" | ...
    dots: number
    voice?: number
    staff?: number
    isRest: boolean
    isChord: boolean
    beam?: string
    articulations?: string[]
    slur?: 'start' | 'stop'
  }
}
```

**依賴**：Phase 9

### Phase B：雙向轉換

**目標**：MusicXML ↔ UnifiedNote 完整雙向映射

| 方向 | 說明 |
|------|------|
| MusicXML → UnifiedNote | 保留 scoreInfo + 計算 time/duration（秒） |
| MIDI → UnifiedNote | scoreInfo 為空（或透過 quantize 推測） |
| UnifiedNote → MIDI export | 使用 time/duration → ticks（現有） |
| UnifiedNote → MusicXML export | 使用 scoreInfo → 重建 measure/note 結構 |

**依賴**：Phase A

### Phase D：MusicXML Export

**目標**：將編輯後的音符匯出為 MusicXML 格式

- 重建 `<score-partwise>` 結構
- `<attributes>`（divisions, key, time, clef）
- `<measure>` 分割（根據 time signature）
- `<note>` 元素（pitch/rest, duration, type, dots, voice, staff）

**依賴**：Phase A + B

---

## 長期規劃

### Phase C：MIDI Quantize

**目標**：對 MIDI 匯入的音符進行量化，反向推導 scoreInfo

```
MIDI note (seconds) → snap to grid → 推導最接近的符值(type) + divisions
```

讓 MIDI 匯入的檔案也能匯出為有意義的 MusicXML。

**依賴**：Phase A

### Phase E：Score View（樂譜視圖）

**目標**：在 Piano Roll 旁提供樂譜渲染

- 使用 VexFlow 或 OpenSheetMusicDisplay 渲染
- 雙向同步：Piano Roll 編輯 → 樂譜更新，反之亦然
- 選取同步：兩個視圖共享 `selectedNoteIds`

**依賴**：Phase A + B + D

### FastAPI Backend

詳見 [fastapi-backend.md](./fastapi-backend.md)

---

## 總覽

| 階段 | 項目 | 依賴 | 狀態 |
|------|------|------|------|
| Phase 1-8 | Piano Roll MIDI 編輯 | — | Done |
| — | Bug fixes + Enhancement (P0, P1) | — | Done |
| Phase 9 | 多 Track 編輯 | — | Planned |
| P2 | Pencil Tool Click-Drag | — | Planned |
| Phase A | UnifiedNote 擴展 | Phase 9 | Planned |
| Phase B | 雙向轉換 | Phase A | Planned |
| Phase D | MusicXML Export | Phase A+B | Planned |
| Phase C | MIDI Quantize | Phase A | Planned |
| Phase E | Score View (VexFlow) | Phase A+B+D | Planned |
| — | FastAPI Backend | — | Planned |
