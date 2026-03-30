# Feature Issue: Pencil Tool Two-Step Note Creation

## Status: Open

## Summary

目前 Pencil tool (`2`/`B`) 和 `A` 快捷鍵新增音符時，音符的 duration（時值/時間長度）是自動根據 snap grid 決定的。使用者期望的行為是：

1. **第一次 click**：放置音符起點（pitch + time 由 click 位置決定）
2. **拖曳或第二次 click**：決定音符的 duration（時間長度）

這更接近專業 DAW（FL Studio、Ableton）的行為。

## Current Behavior

### Pencil Tool (`2`/`B`)
- Click grid → 立即建立一個固定 duration（snap grid size）的音符
- 檔案：`useNoteCreate.ts` 的 `handleGridClick()`

### `A` 快捷鍵
- 按下 → 立即在 playhead 位置建立 C4 音符，duration = snap grid size
- 檔案：`useKeyboardShortcuts.ts` → `addNoteAtPosition(currentTime, 60)`

## Expected Behavior

### Pencil Tool
1. Click 放置音符起點（顯示 preview 或短音符）
2. 按住拖曳向右 → 即時 preview duration
3. 放開滑鼠 → 確定 duration（snap 對齊）
4. 如果只是 click 不拖曳 → 預設 1 grid unit duration（保持向下相容）

### `A` 快捷鍵
1. 按 `A` → 在 playhead + C4 位置顯示 preview 音符
2. 等待 user 滑鼠 click → click 的 x 座標決定 duration
3. 按 `Escape` 取消

## Implementation Notes

### Approach: Click-Drag for Pencil

修改 `useNoteCreate.ts` 中的 `handleGridClick()`：
- mousedown 記錄起始位置（time, midi）
- mousemove 計算 duration preview
- mouseup commit 音符（snap duration）

類似現有 `useNoteDrag.ts` 的 drag lifecycle 模式。

### Approach: `A` Key with Click Confirm

新增一個 "pending note" state：
- store 中新增 `pendingNote: { time, midi } | null`
- 按 `A` 設定 pendingNote
- PianoRollNotes 渲染 pending note preview（半透明）
- Click grid 確認 duration
- Escape 取消

## Affected Files

- `src/features/note-editor/composables/useNoteCreate.ts`
- `src/features/note-editor/composables/useKeyboardShortcuts.ts`
- `src/features/note-editor/stores/note-editor.store.ts` — 可能需要 pendingNote state
- `src/features/piano-roll/components/PianoRollNotes.vue` — pending note preview 渲染
- `src/features/piano-roll/components/PianoRoll.vue` — event routing
