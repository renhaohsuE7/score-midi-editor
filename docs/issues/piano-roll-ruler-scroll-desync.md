# Bug: Piano Roll Time Ruler Scroll Desync

## Status: Resolved

## Summary

在 Piano Roll 中水平捲動時，上方的 bar number (TimeRuler) 和底下的 grid/notes 區域的捲動速率不同，導致對不齊。在 `chord-progression.mid` 大約第 8 小節之後開始明顯偏移。

## Reproduce

1. 開啟 `chord-progression.mid`
2. 在 Piano Roll 中向右水平捲動
3. 觀察上方 bar number 和底下 grid 開始不同步

## Root Cause

`PianoRoll.vue` 中 ruler 容器沒有明確的寬度約束：

```vue
<!-- Line 211: rulerRef 容器 -->
<div ref="rulerRef" class="shrink-0 overflow-hidden">
  <PianoRollTimeRuler :total-width="totalWidth" ... />
</div>
```

scroll sync 邏輯（`onMainScroll`）透過 `rulerRef.value.scrollLeft = el.scrollLeft` 同步捲動，但 ruler 容器的可捲動範圍和主 scroll 區域不一致（因為容器寬度不同），導致捲動比例偏移。

主 scroll 區域（`mainScrollRef`）透過 `flex-1 overflow-auto` 控制寬度，而 ruler 容器只有 `shrink-0 overflow-hidden`，沒有 `min-w-0` 約束。

## Affected Files

- `src/features/piano-roll/components/PianoRoll.vue` — scroll sync + ruler 容器
- `src/features/piano-roll/components/PianoRollTimeRuler.vue` — ruler 內部寬度
- `src/features/piano-roll/composables/usePianoRoll.ts` — totalWidth 計算

## Fix Applied

Replaced `scrollLeft` sync with CSS `transform: translateX()` on the TimeRuler component. This provides pixel-perfect sync regardless of container width differences (caused by vertical scrollbar in the main scroll area). Removed `rulerRef`, added `scrollX` ref updated in `onMainScroll`.

**File**: `PianoRoll.vue`
