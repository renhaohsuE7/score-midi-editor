# Future: Python FastAPI Backend

## 概述

目前 Score MIDI UI 為純前端 PWA 應用。未來計畫加上 Python FastAPI 後端，提供伺服器端的檔案處理、音訊渲染和專案持久化。

---

## 預計 API 端點

### 檔案管理

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/files/upload` | 上傳 MusicXML / MIDI 檔案 |
| GET | `/api/files/:id` | 取得檔案 |
| DELETE | `/api/files/:id` | 刪除檔案 |
| POST | `/api/files/:id/parse` | 伺服器端解析檔案 |

### 專案管理

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/projects` | 專案列表 |
| POST | `/api/projects` | 建立專案 |
| GET | `/api/projects/:id` | 取得專案 |
| PUT | `/api/projects/:id` | 更新專案 |
| DELETE | `/api/projects/:id` | 刪除專案 |

### 渲染 & 匯出

| Method | Path | 說明 |
|--------|------|------|
| POST | `/api/render/audio` | 伺服器端音訊渲染（SoundFont） |
| POST | `/api/export/midi` | 匯出 MIDI |
| POST | `/api/export/musicxml` | 匯出 MusicXML |

---

## 技術選型

- **Framework**: FastAPI
- **Python**: 3.12+
- **ORM**: SQLAlchemy / SQLModel
- **Database**: PostgreSQL
- **File Storage**: Local / S3
- **MIDI Processing**: music21, mido
- **MusicXML Processing**: music21
- **Audio Rendering**: FluidSynth (SoundFont)
- **Task Queue**: Celery + Redis（長時間渲染任務）

---

## Docker 整合

後端加入後，`docker-compose.yml` 將新增：

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - .env.dev
    volumes:
      - ./backend:/app

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: score_midi
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

---

## 前端整合策略

1. 前端新增 `src/services/api.ts`：統一 HTTP client（fetch / axios）
2. Feature modules 的 `*.api.ts` service 檔將切換為呼叫後端 API
3. IndexedDB 作為離線快取層，有網路時同步至後端
4. Vite proxy 設定：dev 環境將 `/api/*` 代理至 backend service
