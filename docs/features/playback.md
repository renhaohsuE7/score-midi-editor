# Playback 功能文件

## 概述

音訊播放功能使用 **Tone.js** 將已匯入的 MIDI / MusicXML 檔案轉換為即時音訊。支援播放、暫停、停止、拖曳 seek、per-track mute/solo/volume，並在 status bar 顯示播放狀態。

## 架構

```
src/features/playback/
├── types/
│   └── playback.types.ts          # Types: TimedNoteEvent, PlaybackData, EngineSnapshot, etc.
├── services/
│   ├── note-utils.ts              # pitchToMidi() / noteNameToMidi() — MIDI number 工具
│   ├── midi-to-events.ts          # ParsedMidi → PlaybackData（直接映射）
│   ├── musicxml-to-events.ts      # ParsedMusicXml → PlaybackData（divisions→秒 轉換 + tempo/dynamics）
│   ├── PlaybackEngine.ts          # OOP Engine class + State Machine（唯一 import tone）
│   └── TrackController.ts         # Per-track PolySynth → Volume → Destination 音訊鏈
├── stores/
│   └── playback.store.ts          # Pinia: EngineSnapshot 的響應式 mirror
├── composables/
│   └── usePlayback.ts             # Thin bridge: engine ↔ store ↔ file changes
└── components/
    ├── PlaybackControls.vue       # Play/Pause/Stop + 時間顯示 + SeekBar
    └── SeekBar.vue                # 進度條（click to seek）
```

## 核心設計

### Architecture: OOP Engine + State Machine + Snapshot Bridge

```
PlaybackEngine (class, single source of truth)
  ├── State Machine (canTransition / nextState)
  ├── TrackController[] (per-track mute/solo/volume)
  ├── Tone.js Transport (lazy import)
  └── RAF position tracking
         ↓ onStateChange(EngineSnapshot)
Pinia Store (pure reactive mirror, applySnapshot only)
         ↓ reactive binding
Vue Components (read store, call composable)
```

- **PlaybackEngine** 是唯一的 source of truth
- **Pinia Store** 僅透過 `applySnapshot()` 被動接收狀態，不主動修改
- **Vue Components** 讀取 store getters，透過 composable 呼叫 engine 方法

### State Machine

```typescript
const TRANSITIONS: Record<PlaybackState, PlaybackAction[]> = {
  stopped: ['play'],
  playing: ['pause', 'stop'],
  paused:  ['play', 'stop'],
}

function canTransition(from: PlaybackState, action: PlaybackAction): boolean
function nextState(action: PlaybackAction): PlaybackState
```

每個公開方法（play/pause/stop）先檢查 `canTransition()` → 防止非法狀態轉換。

### Lazy Tone.js Import

**只有 `PlaybackEngine.ts` 和 `TrackController.ts` 直接使用 Tone.js**，其他模組完全不依賴 `tone`。好處：

1. Tone.js 在 jsdom 測試環境無法執行 → 只需 mock Tone module
2. Tone.js **lazy import** → 避免 AudioContext 在使用者手勢前初始化
3. 未來切換音源（e.g. SoundFont Sampler）只需修改 TrackController

```typescript
// PlaybackEngine.ts — lazy import
let ToneCache: typeof import('tone') | null = null
async function getTone() {
  if (!ToneCache) ToneCache = await import('tone')
  return ToneCache
}
```

### 統一事件格式

無論來源是 MIDI 或 MusicXML，都轉換為相同的 `TimedNoteEvent[]` 後交給 Engine 排程：

```typescript
interface TimedNoteEvent {
  midi: number       // MIDI note number 0-127（供 Piano Roll Y 軸定位）
  note: string       // "C4", "F#5"（scientific pitch notation）
  time: number       // 開始時間（秒）
  duration: number   // 持續時間（秒）
  velocity: number   // 0-1
}

interface PlaybackData {
  tracks: PlaybackTrack[]  // 每 track 含 name + events
  duration: number         // 總時長（秒）
  bpm: number              // 初始 BPM
}
```

## 資料轉換

### MIDI → PlaybackData（直接映射）

ParsedMidi 已包含秒級的 `time` 和 `duration`，只需直接映射：

```
MidiNote.midi     → TimedNoteEvent.midi       （MIDI note number）
MidiNote.name     → TimedNoteEvent.note
MidiNote.time     → TimedNoteEvent.time       （已是秒）
MidiNote.duration → TimedNoteEvent.duration   （已是秒）
MidiNote.velocity → TimedNoteEvent.velocity
```

BPM 取自 `ParsedMidi.tempos[0].bpm`，預設 120。

### MusicXML → PlaybackData（divisions 轉換）

MusicXML 的 `note.duration` 使用 **divisions** 抽象單位，需轉換為秒：

```
durationSec = (note.duration / divisions) * (60 / tempo)
```

#### 轉換演算法

```
For each part:
  state: currentTime=0, divisions=1, tempo=120, velocity=0.8

  For each measure:
    如果有 attributes → 更新 divisions
    如果有 directions → 更新 tempo / velocity
    For each note:
      durationSec = (note.duration / divisions) * (60 / effectiveTempo)
      midi = pitchToMidi(step, octave, alter)

      if isChord → 事件放在前一個音的開始時間，不推進 currentTime
      if isRest  → 推進 currentTime，不產生事件
      else       → 事件放在 currentTime，推進 currentTime
```

#### Tempo & Dynamics 提取

MusicXML parser 現已提取 `<direction>` 元素：

- **Tempo**：`<direction><sound tempo="..."/>` → 用於計算 `durationSec`，同時作為全域 BPM
- **Dynamics**：`<dynamics><mf/></dynamics>` → 對應 velocity 映射：

| dynamics | ppp  | pp   | p    | mp   | mf   | f    | ff   | fff  |
|----------|------|------|------|------|------|------|------|------|
| velocity | 0.15 | 0.30 | 0.45 | 0.60 | 0.75 | 0.85 | 0.95 | 1.00 |

若 MusicXML 未包含 direction，預設 tempo=120 BPM、velocity=0.8。

#### 目前限制

- 不處理 tuplets、grace notes、ornaments

## PlaybackEngine

### 公開 API

| 方法 | 說明 |
|------|------|
| `ensureAudioContext()` | 必須在 user gesture 中呼叫，啟動 AudioContext |
| `loadPlaybackData(fileId, data)` | 建立 TrackController per track，排程所有 events |
| `play()` | State machine guarded → Transport.start() |
| `pause()` | State machine guarded → Transport.pause() |
| `stop()` | State machine guarded → Transport.stop() + reset position |
| `togglePlayPause()` | 根據 state 呼叫 play/pause |
| `seek(seconds)` | 設定 Transport 位置 |
| `setTrackMuted(index, muted)` | 設定單一 track 的 mute 狀態 |
| `setTrackSolo(index, solo)` | 設定單一 track 的 solo 狀態（跨 track 協調） |
| `setTrackVolume(index, volumeDb)` | 設定單一 track 的音量（dB） |
| `dispose()` | 完整清理 |
| `reset()` | dispose + 重設 BPM |

### 狀態屬性（readonly getters）

`state`, `currentTime`, `duration`, `bpm`, `isAudioReady`, `activeFileId`, `tracks`

### EngineSnapshot

每次狀態變更時，Engine 透過 `onStateChange` callback emit 一個不可變的 snapshot：

```typescript
interface EngineSnapshot {
  readonly state: PlaybackState
  readonly currentTime: number
  readonly duration: number
  readonly bpm: number
  readonly isAudioReady: boolean
  readonly activeFileId: string | null
  readonly tracks: readonly TrackSnapshot[]
}
```

## TrackController

每個音軌一個實例，擁有獨立的音訊鏈：

```
PolySynth(Synth) → Volume → Destination
```

### 功能

| 方法 | 說明 |
|------|------|
| `scheduleEvents(events, transport)` | 建立音訊節點 + 排程 note events |
| `setMuted(muted)` | 設定 mute（直接控制 Volume.mute） |
| `setSolo(solo)` | 設定 solo 標記 |
| `setVolume(volumeDb)` | 設定音量（dB） |
| `updateEffectiveOutput(anySoloed)` | Solo 跨 track 協調：若有任何 track solo → 僅 solo track 發聲 |
| `releaseAll()` | 釋放所有正在發聲的音符 |
| `dispose(transport)` | 清除排程 + 釋放音訊節點 |
| `toSnapshot()` | 回傳 `TrackSnapshot` |

### 音源

- MVP 使用 **PolySynth(Synth)**，每 track 一個實例
- Envelope: attack=0.01, decay=0.1, sustain=0.3, release=0.2
- 未來可替換為 **Sampler + SoundFont** 以提升音色

### Auto-Stop

在 `duration + 0.1s` 排程一個結束事件。為避免 Tone.js 內部時序衝突，使用 `setTimeout(..., 0)` 延遲執行 `transport.stop()`。

## Playback Store（Pinia）

純粹的 reactive mirror，透過 `applySnapshot()` 接收 Engine 狀態。

### State

| 欄位 | 型別 | 說明 |
|------|------|------|
| `state` | `PlaybackState` | 'stopped' / 'playing' / 'paused' |
| `currentTime` | `number` | 目前播放秒數 |
| `duration` | `number` | 總時長（秒） |
| `isAudioReady` | `boolean` | AudioContext 是否已啟動 |
| `activeFileId` | `string \| null` | 正在播放的檔案 ID |
| `bpm` | `number` | BPM |
| `tracks` | `readonly TrackSnapshot[]` | Per-track 狀態快照 |

### Getters

| 名稱 | 說明 |
|------|------|
| `isPlaying` / `isPaused` / `isStopped` | 狀態 boolean |
| `progress` | 0-1 進度比例 |
| `formattedCurrentTime` / `formattedDuration` | `m:ss` 格式 |

### Additional State

| 欄位               | 型別               | 說明                                                          |
|--------------------|--------------------|---------------------------------------------------------------|
| `playbackTracks`   | `PlaybackTrack[]`  | 原始 PlaybackData.tracks（含完整 events），供 Piano Roll 讀取 |

### Actions

| 名稱                          | 說明                                        |
|-------------------------------|---------------------------------------------|
| `applySnapshot(snapshot)`     | 從 Engine callback 更新播放狀態欄位         |
| `setPlaybackTracks(tracks)`   | 儲存 PlaybackData.tracks 供 Piano Roll 使用 |

## usePlayback Composable（Thin Bridge）

### 職責

```typescript
const engine = new PlaybackEngine({
  onStateChange: (snapshot) => playbackStore.applySnapshot(snapshot),
})
```

1. 建立 PlaybackEngine 實例
2. Wire `onStateChange` → `store.applySnapshot`
3. 將公開方法委託給 engine
4. Watch `filesStore.selectedParsedData` 處理檔案切換
5. `onUnmounted` → `engine.dispose()`

### 公開方法

| 方法 | 說明 |
|------|------|
| `play()` | pause 狀態直接 resume（不 reload）；editor 模式重載編輯資料；否則載入檔案 → engine.play() |
| `pause()` | engine.pause() |
| `stop()` | engine.stop() |
| `togglePlayPause()` | 根據 store.isPlaying 切換 |
| `seek(seconds)` | engine.seek() |
| `setTrackMuted(index, muted)` | engine.setTrackMuted() |
| `setTrackSolo(index, solo)` | engine.setTrackSolo() |
| `setTrackVolume(index, volumeDb)` | engine.setTrackVolume() |

### Note Editor 整合

`usePlayback` 在 `play()` 時檢查 `noteEditorStore.isEditing`：

- **編輯模式**：呼叫 `noteEditorStore.toPlaybackTracks()` 取得編輯後的 tracks，組合成 `PlaybackData` 後載入 engine。每次 play 都重新載入（確保聽到最新編輯）。
- **非編輯模式**：使用原始 `ParsedData` 轉換結果（與原本行為相同）。

```typescript
if (noteEditorStore.isEditing) {
  const editedTracks = noteEditorStore.toPlaybackTracks()
  const baseData = toPlaybackData()
  await engine.loadPlaybackData(fileId, { tracks: editedTracks, ... })
  playbackStore.setPlaybackTracks(editedTracks)
} else if (engine.activeFileId !== fileId) {
  // 原始流程
}
```

詳見 [Note Editor 文件](./note-editor.md)。

### 檔案切換

`watch(filesStore.selectedParsedData, ..., { immediate: true })` 偵測選擇變更：

1. 如果正在播放 → 停止
2. 如果有新資料 → 轉換 + loadPlaybackData + setPlaybackTracks
3. 如果無資料 → engine.reset()

> `immediate: true` 確保從首頁導航進入 detail 頁面時，若 parsedData 在 watcher 註冊前已載入完成，仍能正確觸發 playback data 初始化。

### 位置追蹤

使用 `requestAnimationFrame` loop（內建於 PlaybackEngine）：

- 自然綁定顯示刷新率（~60fps）
- 不佔用 Tone.js 排程佇列
- 僅在 playing 狀態下更新
- 每幀 emit snapshot → store 自動更新

## UI 整合

### HomeView.vue

```
有檔案且有選中 → 顯示 PlaybackControls
  ├── Play/Pause 按鈕
  ├── Stop 按鈕
  ├── 時間顯示（m:ss / m:ss）
  └── SeekBar（click to seek）
```

### App.vue Status Bar

| 狀態 | 顯示 |
|------|------|
| Playing | `Playing - 1:30` |
| Paused | `Paused at 1:30` |
| 有檔案 | `3 files loaded` |
| 空 | `Ready` |

## AudioContext 注意事項

瀏覽器安全政策要求 AudioContext 必須在使用者手勢（click/tap）中啟動：

1. Tone.js **lazy import** — 避免 import 時就初始化 AudioContext
2. `engine.play()` 在首次呼叫時內部執行 `ensureAudioContext()` → `Tone.start()`
3. 後續操作不需重新啟動

## 型別定義摘要

```typescript
type PlaybackState = 'stopped' | 'playing' | 'paused'
type PlaybackAction = 'play' | 'pause' | 'stop'

interface TrackSnapshot {
  readonly index: number
  readonly name: string
  readonly muted: boolean
  readonly solo: boolean
  readonly volumeDb: number
}

interface EngineSnapshot {
  readonly state: PlaybackState
  readonly currentTime: number
  readonly duration: number
  readonly bpm: number
  readonly isAudioReady: boolean
  readonly activeFileId: string | null
  readonly tracks: readonly TrackSnapshot[]
}

type EngineStateChangeCallback = (snapshot: EngineSnapshot) => void

interface PlaybackEngineConfig {
  onStateChange: EngineStateChangeCallback
}
```

## 測試

```bash
docker compose exec dev npx vitest run
```

| 檔案                          | 測試數 | 說明                                                              |
|-------------------------------|--------|-------------------------------------------------------------------|
| `TrackController.test.ts`     | 11     | 建立、排程、mute/solo/volume、solo 路由、dispose、snapshot        |
| `PlaybackEngine.test.ts`      | 25     | State machine (9) + Engine lifecycle (13) + per-track controls (3) |
| `playback.store.test.ts`      | 6      | applySnapshot、computed getters、track 資料                       |
| `usePlayback.test.ts`         | 17     | Thin bridge 委託、onStateChange wiring、檔案切換、pause→resume、MusicXML 載入、editor-mode play |
| `note-utils.test.ts`          | 12     | pitchToMidi、noteNameToMidi（含升降記號、邊界值）                 |
| `musicxml-to-events.test.ts`  | 14     | divisions 轉換、chords、rests、accidentals、tempo/dynamics        |
| `midi-to-events.test.ts`      | 6      | 直接映射、過濾空 track、BPM 預設                                  |
