# File Import 功能文件

## 概述

檔案匯入功能提供拖放 / 檔案選擇器匯入 MIDI 和 MusicXML 檔案，使用 Web Worker 解析，並持久化至 IndexedDB。

## 支援格式

| 副檔名 | 類型 | 解析方式 |
|--------|------|----------|
| `.mid` / `.midi` | MIDI | Web Worker + `@tonejs/midi` |
| `.musicxml` / `.mxl` | MusicXML | Main thread + `DOMParser` |

> MusicXML 使用 main thread 是因為 `DOMParser` 在 Web Worker 中不可用。

## 架構

```
src/
├── config/
│   └── default-examples.ts        # 預設範例檔案清單（manifest）
└── features/file-import/
    ├── types/
    │   ├── file.types.ts          # FileRecord, ParsedMidi, ParsedMusicXml, ParsedData
    │   └── worker.types.ts        # MIDI Worker 訊息協議
    ├── workers/
    │   ├── midi.worker.ts         # MIDI 解析 Worker（@tonejs/midi）
    │   └── musicxml-parser.ts     # MusicXML 解析（純函式，非 Worker）
    ├── services/
    │   └── file-parser.service.ts # Worker 生命週期管理 + Promise API
    ├── stores/
    │   └── files.store.ts         # Pinia store（metadata only）
    ├── composables/
    │   ├── useIndexedDB.ts        # IndexedDB CRUD 封裝
    │   └── useFileImport.ts       # 匯入流程 + lazy load + 初始化
    └── components/
        ├── FileDropZone.vue       # 拖放 + 檔案選擇器
        └── FileList.vue           # 檔案清單 + 選擇狀態
```

## 初始化流程（Router Guard）

檔案載入由 Vue Router `beforeEach` guard 統一處理，確保任何路由渲染前資料已就緒：

```
app 啟動
  → router.beforeEach → ensureFilesLoaded()（singleton promise）
    → IndexedDB.getAllFiles()
    → Pinia.hydrateFiles(records)
    → 若 IndexedDB 為空 → loadDefaults()
      → 依 DEFAULT_EXAMPLES 清單 fetch → 匯入 + 解析 + 持久化
  → 路由組件 mount（資料已就緒）
```

`ensureFilesLoaded()` 採用 singleton promise 模式，僅首次導航執行，後續導航立即 resolve。

### 預設範例清單

定義於 `src/config/default-examples.ts`：

```typescript
export const DEFAULT_EXAMPLES = [
  'examples/chord-progression.mid',
  'examples/c-major-scale.mid',
  'examples/c-major-scale.musicxml',
] as const
```

檔案放置於 `public/examples/`，由 Vite 作為靜態資源提供。

## 匯入資料流

```
使用者拖入檔案
  → FileDropZone emits filesSelected
  → useFileImport.importFiles()
    → generateId()
    → Pinia 新增 FileRecord（status=importing）
    → IndexedDB 存原始 Blob
    → file.arrayBuffer() / file.text()
    → Worker / parseMusicXml()
    → IndexedDB 存 ParsedData
    → IndexedDB 更新 status=ready
    → Pinia 更新 status=ready
  → FileList 響應式更新
```

> **注意**：匯入完成後同時更新 IndexedDB 和 Pinia 中的 status，確保頁面重整後狀態正確。

## Lazy-Load ParsedData

ParsedData **不**常駐 Pinia，而是在使用者選擇檔案時 lazy-load：

```
selectFile(id)
  → selectedFileId 變更（若 id 相同則跳過，避免重複清空已載入的資料）
  → useFileImport 中的 watch 觸發
  → IndexedDB.getParsedData(id)
  → store.setSelectedParsedData(data)
```

## 儲存架構（Hybrid）

| 層 | 職責 | 資料 |
|----|------|------|
| **IndexedDB** | 持久化（source of truth） | FileRecord + 原始 Blob + ParsedData |
| **Pinia** | 響應式 UI 快取 | FileRecord metadata only |

## IndexedDB Schema

- **DB 名稱**: `score-midi-db` v1
- **files store**: keyPath=`id`，index `by-importedAt`
- **parsedData store**: keyPath=`fileId`

### IndexedDB 方法

| 方法 | 說明 |
|------|------|
| `saveFile(record, blob)` | 儲存檔案 metadata + blob |
| `getFile(id)` | 取得單一檔案（含 blob） |
| `getAllFiles()` | 取得所有檔案 metadata（不含 blob） |
| `deleteFile(id)` | 刪除檔案 + 對應 ParsedData（交易） |
| `updateFileStatus(id, status)` | 更新 IndexedDB 中的檔案狀態 |
| `saveParsedData(fileId, parsed)` | 儲存解析後資料 |
| `getParsedData(fileId)` | 取得解析後資料 |
| `clearAll()` | 清空所有 store（交易） |

## Pinia Store（files.store.ts）

### State

| 欄位 | 型別 | 說明 |
|------|------|------|
| `files` | `Map<string, FileRecord>` | 所有匯入檔案 metadata |
| `selectedFileId` | `string \| null` | 目前選中的檔案 ID |
| `selectedParsedData` | `ParsedData \| null` | 選中檔案的解析資料（lazy-loaded） |
| `isLoadingParsedData` | `boolean` | 是否正在載入解析資料 |

### Getters

| 名稱 | 說明 |
|------|------|
| `fileList` | 按 `importedAt` 降序排列的陣列 |
| `hasFiles` | 是否有匯入檔案 |
| `isAnyProcessing` | 是否有檔案在 importing/parsing |
| `selectedFile` | 目前選中的 FileRecord |

### Actions

| 名稱 | 說明 |
|------|------|
| `addFile(record)` | 新增檔案 |
| `updateFileStatus(id, status, error?)` | 更新狀態（用 Map.set 確保響應性） |
| `markFileReady(id)` | 標記為 ready |
| `removeFile(id)` | 移除檔案，清除選擇 |
| `selectFile(id)` | 選擇檔案；若 id 相同則 early return（保留已載入的 parsedData） |
| `setSelectedParsedData(data)` | 設定 lazy-loaded 的解析資料 |
| `hydrateFiles(records)` | 從 IndexedDB 批量載入 metadata |
| `clearAll()` | 清空所有狀態 |

## Composable API

### `ensureFilesLoaded(): Promise<void>`

Standalone function（非 composable），由 router `beforeEach` 呼叫。Singleton promise 模式，僅執行一次。

### `useFileImport()`

Composable，需在 Vue component setup 中使用（含 `watch` 副作用）。

| 回傳 | 說明 |
| --- | --- |
| `importFiles(files: File[])` | 匯入多個檔案（並行） |
| `removeFile(id: string)` | 刪除檔案（IndexedDB + Pinia） |
| `clearAllFiles()` | 清空所有資料，重設 init singleton |

## 型別定義摘要

```typescript
type FileType = 'midi' | 'musicxml'
type FileStatus = 'importing' | 'parsing' | 'ready' | 'error'

interface FileRecord {
  id: string; name: string; type: FileType
  size: number; importedAt: number
  status: FileStatus; error?: string
}

interface ParsedMidi {
  name: string; duration: number; ppq: number
  tempos: MidiTempo[]; timeSignatures: MidiTimeSignature[]
  tracks: MidiTrack[]  // 每 track 含 notes: MidiNote[]
}

interface MidiNote {
  midi: number; name: string        // e.g. 60, "C4"
  time: number; duration: number    // 秒
  ticks: number; durationTicks: number
  velocity: number                  // 0-1
}

interface ParsedMusicXml {
  title?: string
  parts: MusicXmlPart[]  // 每 part 含 measures → notes
}

interface MusicXmlNote {
  step?: string; octave?: number; alter?: number  // pitch
  duration: number   // divisions 單位（非秒）
  type?: string; isRest: boolean; isChord: boolean
  voice?: number; dots: number; staff?: number
}

type ParsedData =
  | { type: 'midi'; data: ParsedMidi }
  | { type: 'musicxml'; data: ParsedMusicXml }
```

## 測試

```bash
docker compose exec dev npx vitest run
```

相關測試檔案：

| 檔案 | 測試數 |
|------|--------|
| `musicxml-parser.test.ts` | 5 |
| `files.store.test.ts` | 11 |
| `useIndexedDB.test.ts` | 6 |
| `useFileImport.test.ts` | 8 |
| `FileDropZone.test.ts` | 5 |
| `FileList.test.ts` | 6 |
