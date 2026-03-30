# Standard MIDI File (SMF) Format Specification（前端解析重點）

> 參考來源：
> - [Stanford CCRMA - MIDI File Format](https://ccrma.stanford.edu/~craig/14q/midifile/MidiFileFormat.html)
> - [CCARH - Standard MIDI File Structure](https://www.ccarh.org/courses/253/handout/smf/)

## 副檔名

`.mid` / `.midi`（二進制格式）

## 整體結構

```
SMF File = Header Chunk + Track Chunk(s)

┌──────────────────────────┐
│ Header Chunk (MThd)      │  14 bytes 固定
├──────────────────────────┤
│ Track Chunk 1 (MTrk)     │  可變長度
├──────────────────────────┤
│ Track Chunk 2 (MTrk)     │  (Format 1/2 才有多 track)
├──────────────────────────┤
│ ...                      │
└──────────────────────────┘
```

## Header Chunk（14 bytes）

| Offset | Size | 欄位 | 說明 |
|--------|------|------|------|
| 0 | 4 | `MThd` | 魔術數字（0x4D546864） |
| 4 | 4 | Length | 固定 = 6 |
| 8 | 2 | Format | 0 = 單軌, 1 = 多軌同步, 2 = 多軌獨立 |
| 10 | 2 | Tracks | Track 數量 |
| 12 | 2 | Division | 正數 = ticks/quarter note, 負數 = SMPTE |

### Format 類型

| Format | 說明 | 常用場景 |
|--------|------|---------|
| **0** | 單一 Track，所有 Channel 混在一起 | 簡單音樂 |
| **1** | 多 Track 同步（Track 0 = tempo map） | **最常見** |
| **2** | 多 Track 獨立（各自獨立樂曲） | 少見 |

## Track Chunk

| Offset | Size | 欄位 | 說明 |
|--------|------|------|------|
| 0 | 4 | `MTrk` | 魔術數字（0x4D54726B） |
| 4 | 4 | Length | 後續資料的 byte 數 |
| 8+ | ... | Events | Delta Time + Event 序列 |

## Delta Time（Variable-Length Quantity, VLQ）

每個 event 前面都有 delta time（距上一個 event 的 tick 數）：

```
1 byte:   0xxxxxxx                         (0 ~ 127)
2 bytes:  1xxxxxxx 0xxxxxxx                (128 ~ 16383)
3 bytes:  1xxxxxxx 1xxxxxxx 0xxxxxxx       (16384 ~ 2097151)
```

- 最高 bit = 1 表示「後面還有」
- 最高 bit = 0 表示「最後一個 byte」
- 每 byte 有效 7 bits

## Event 類型

### 1. MIDI Channel Events

| Status Byte | 事件 | Data Bytes |
|-------------|------|------------|
| `0x8n` | Note Off | note(0-127) + velocity(0-127) |
| `0x9n` | Note On | note(0-127) + velocity(0-127)* |
| `0xAn` | Aftertouch | note + pressure |
| `0xBn` | Control Change | controller + value |
| `0xCn` | Program Change | program(1 byte) |
| `0xDn` | Channel Pressure | pressure(1 byte) |
| `0xEn` | Pitch Bend | LSB + MSB |

> `n` = channel (0-15)
> *Note On with velocity=0 等同 Note Off

### 2. Meta Events（`0xFF`）

| Type | 事件 | 內容 |
|------|------|------|
| `0x00` | Sequence Number | 2 bytes |
| `0x01` | Text | 文字 |
| `0x02` | Copyright | 版權 |
| `0x03` | **Track Name** | Track 名稱 |
| `0x04` | Instrument Name | 樂器名稱 |
| `0x20` | Channel Prefix | 1 byte channel |
| `0x2F` | **End of Track** | 空（必要，每 track 結尾） |
| `0x51` | **Tempo** | 3 bytes: microseconds/quarter note |
| `0x58` | **Time Signature** | nn dd cc bb |
| `0x59` | **Key Signature** | sf mi (升降數 + 大小調) |

### 3. SysEx Events（`0xF0` / `0xF7`）

廠商專用資料，前端解析通常可忽略。

## MIDI Note Number 對照

| Note | MIDI # | 說明 |
|------|--------|------|
| C-1 | 0 | 最低 |
| C4 | 60 | **Middle C** |
| A4 | 69 | 標準調音 440Hz |
| G9 | 127 | 最高 |

## Tempo 計算

```
BPM = 60,000,000 / microseconds_per_quarter_note

例：500,000 μs = 120 BPM
    0x07A120 = 500,000
```

## 前端解析重點

1. **使用 `@tonejs/midi`**：自動處理 VLQ、running status、tempo map
2. **ArrayBuffer 輸入**：File API → `arrayBuffer()` → 傳入 parser
3. **Web Worker**：大檔案解析不阻塞 UI
4. **Transferable Objects**：`ArrayBuffer` 可零拷貝傳給 Worker
5. **Format 0 與 1 都要支援**：Format 0 所有事件在單一 track，Format 1 多 track
6. **Tempo Map**：可能有多個 tempo change event，需建立時間映射表

## 驗證 Example MIDI

我們的 `c-major-scale.mid`（130 bytes）hex 分析：

```
MThd                    Header magic
00 00 00 06             Length = 6
00 00                   Format = 0 (single track)
00 01                   Tracks = 1
01 E0                   Division = 480 ticks/beat

MTrk                    Track magic
00 00 00 6C             Length = 108 bytes

00 FF 51 03 07 A1 20    Tempo: 500,000 μs = 120 BPM
00 FF 58 04 04 02 18 08 Time Sig: 4/4
00 FF 03 0D ...         Track Name: "C Major Scale"

00 90 3C 50             Note On: C4 (60), vel=80
83 60 80 3C 00          Note Off: C4 after 480 ticks
... (repeat for D4, E4, F4, G4, A4, B4, C5)

00 FF 2F 00             End of Track
```
