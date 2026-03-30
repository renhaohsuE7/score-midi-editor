# Feature Issue: Auto-Extend Duration When Editing Beyond Song Length

## Status: Resolved

## Summary

當使用者透過編輯操作（貼上、複製到後方、移動音符）將音符放置到超過原始歌曲長度的位置時，Piano Roll 的可視範圍應自動延伸以容納新音符。但此延伸僅影響 Piano Roll 的顯示範圍，不應修改原始檔案資料。

## Affected Operations

| 操作 | 快捷鍵 | 觸發情境 |
| ---- | ------ | -------- |
| Paste | `Ctrl+V` | 貼上的音符 end time 超過原始 duration |
| Duplicate | `Ctrl+D` | 複製到後方的音符超過原始 duration |
| Nudge Right | `→` | 向右移動音符超過原始 duration |
| Move (drag) | 滑鼠拖曳 | 拖曳音符到超過原始 duration |
| Add Note | `A` / Pencil click | 在延伸區域新增音符 |

## Current Behavior

- `playbackStore.duration` 是從原始 MIDI/MusicXML 檔案解析出來的固定值
- `totalWidth` = `(duration + 4 bars extension) * pixelsPerSecond`
- Extension zone（深色區域）提供 4 小節的額外空間
- 但如果音符超過 extension zone 的範圍，就看不到也無法操作

## Expected Behavior

1. 當任何編輯操作導致音符超出目前的 `totalWidth` 時，自動增加可視範圍
2. 增加的單位為小節（bars），確保新音符後方仍有至少 4 小節的空白延伸區
3. **不修改原始檔案資料**（`playbackStore.duration` 保持不變）
4. 僅在使用者明確匯出/存檔時，才根據編輯後的音符計算新的 duration

## Implementation Notes

### Approach: Editor-Aware Duration

在 `usePianoRoll.ts` 計算 `totalWidth` 時，考慮 editor 中音符的最大 end time：

```
editorMaxTime = max(所有 editableNotes 的 time + duration)
effectiveDuration = max(playbackStore.duration, editorMaxTime)
totalWidth = (effectiveDuration + extensionBars * 4 * secondsPerBeat) * pixelsPerSecond
contentWidth = effectiveDuration * pixelsPerSecond
```

這樣：
- 原始 `playbackStore.duration` 不受影響
- Piano Roll 自動延伸顯示範圍
- Extension zone 永遠在最後一個音符之後
- Grid lines 和 TimeRuler 自動延伸

### Key Constraint

- **不改動原始檔案**：`playbackStore.duration` 來自解析結果，保持不變
- 只有 `usePianoRoll.ts` 的顯示邏輯需要感知 editor 的音符範圍
- 匯出 MIDI 時（`midi-export.ts`）已經根據 editableNotes 計算 duration，不受影響

## Affected Files

- `src/features/piano-roll/composables/usePianoRoll.ts` — totalWidth / contentWidth 計算需感知 editorMaxTime
- `src/features/note-editor/stores/note-editor.store.ts` — 可新增 computed getter `maxEndTime` 供 usePianoRoll 使用
