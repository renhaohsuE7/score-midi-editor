# MusicXML 4.0 Format Specification（前端解析重點）

> 參考來源：
> - [W3C MusicXML 4.0 Tutorial](https://www.w3.org/2021/06/musicxml40/tutorial/hello-world/)
> - [W3C MusicXML 4.0 Note Element](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/note/)
> - [MusicXML Structure](https://www.w3.org/2021/06/musicxml40/tutorial/structure-of-musicxml-files/)

## 副檔名

| 副檔名 | 說明 |
|--------|------|
| `.musicxml` | 純 XML 文字檔 |
| `.mxl` | ZIP 壓縮包（內含 .musicxml + META-INF/container.xml） |

## 兩種文件結構

| 格式 | 根元素 | 組織方式 | 採用率 |
|------|--------|----------|--------|
| **score-partwise** | `<score-partwise>` | Part → Measure → Note | **主流**（大多數軟體使用） |
| score-timewise | `<score-timewise>` | Measure → Part → Note | 少見 |

可用 XSLT 互轉：`parttime.xsl` / `timepart.xsl`

## 文件結構（score-partwise）

```
<score-partwise version="4.0">
  ├── <work>                      # 可選：作品標題
  ├── <movement-title>            # 可選：樂章標題
  ├── <identification>            # 可選：作者、版權、編碼資訊
  ├── <part-list>                 # **必要**：聲部清單
  │   └── <score-part id="P1">
  │       └── <part-name>
  └── <part id="P1">             # **必要**：對應 part-list 的 id
      └── <measure number="1">
          ├── <attributes>        # 小節屬性（首次出現或變更時）
          │   ├── <divisions>     # **關鍵**：每四分音符的 tick 數
          │   ├── <key>           # 調號（fifths: 升降號數量）
          │   ├── <time>          # 拍號（beats / beat-type）
          │   └── <clef>          # 譜號（sign + line）
          ├── <note>              # 音符
          ├── <direction>         # 表情記號、力度
          ├── <harmony>           # 和弦標記
          └── <barline>           # 小節線樣式
```

## `<note>` 元素詳解

### 四種模式

1. **一般音符**：pitch + duration + [tie]
2. **和弦**：`<chord>` + pitch + duration（與前一音符同時）
3. **裝飾音**：`<grace>` + pitch（無 duration）
4. **提示音**：`<cue>` + pitch + duration（無 tie）

### 核心子元素

```xml
<note>
  <pitch>                         <!-- 或 <rest/> 或 <unpitched> -->
    <step>C</step>                <!-- A-G -->
    <alter>-1</alter>             <!-- 可選：升降半音 -->
    <octave>4</octave>            <!-- 0-9 -->
  </pitch>
  <duration>1</duration>          <!-- 相對 divisions 的長度（演奏用） -->
  <voice>1</voice>                <!-- 聲部 -->
  <type>quarter</type>            <!-- 記譜外觀（whole/half/quarter/eighth/16th...） -->
  <dot/>                          <!-- 附點（0 或多個） -->
  <stem>up</stem>                 <!-- 符桿方向 -->
  <staff>1</staff>                <!-- 譜表（鋼琴雙譜時） -->
  <beam number="1">begin</beam>  <!-- 連桿 -->
  <notations>                     <!-- 記譜符號 -->
    <articulations/>              <!-- 斷奏、強音等 -->
    <ornaments/>                  <!-- 裝飾音 -->
    <slur/>                       <!-- 圓滑線 -->
    <tied/>                       <!-- 連結線（記譜） -->
  </notations>
  <lyric>                         <!-- 歌詞 -->
    <syllabic>single</syllabic>
    <text>La</text>
  </lyric>
</note>
```

### divisions 與 duration 的關係

| divisions 值 | 四分音符 duration | 全音符 duration | 八分音符 duration |
|:---:|:---:|:---:|:---:|
| 1 | 1 | 4 | 不可表示（需更大 divisions） |
| 2 | 2 | 8 | 1 |
| 480 | 480 | 1920 | 240 |

> **duration** 是演奏時間（MIDI 風格），**type** 是記譜外觀 — 兩者分開設計方便不同軟體使用。

## 前端解析重點

1. **只需支援 score-partwise**（主流格式）
2. **DOMParser** 可在瀏覽器 / Web Worker 中解析 XML
3. **.mxl 檔案**需先 unzip（使用 JSZip），找到 `META-INF/container.xml` 取得主檔路徑
4. **divisions 是每小節第一個出現的值**，後續小節可能改變
5. **元素順序固定**：pitch/rest → duration → voice → type → ...
