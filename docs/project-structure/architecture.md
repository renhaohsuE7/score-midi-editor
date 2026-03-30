# Vue 3 + TypeScript 專案結構 Best Practices

> 參考來源：
> - [How to Structure Vue Projects - alexop.dev](https://alexop.dev/posts/how-to-structure-vue-projects/)
> - [Vue School - How to Structure a Large Scale Vue.js Application](https://vueschool.io/articles/vuejs-tutorials/how-to-structure-a-large-scale-vue-js-application/)

## 推薦專案結構（Feature-Based Modular）

```
src/
├── app/                     # App 初始化
│   ├── App.vue
│   ├── main.ts
│   └── plugins/             # Vue plugin 註冊
│       ├── router.ts
│       ├── pinia.ts
│       └── i18n.ts
│
├── assets/                  # 靜態資源（圖片、字型、全域 CSS）
│   ├── styles/
│   │   └── main.css         # Tailwind 入口
│   └── images/
│
├── components/              # 全域共用元件
│   ├── base/                # Base 元件（BaseButton, BaseInput...）
│   │   ├── BaseButton.vue
│   │   ├── BaseInput.vue
│   │   └── BaseModal.vue
│   ├── layout/              # 佈局元件
│   │   ├── AppHeader.vue
│   │   ├── AppSidebar.vue
│   │   └── AppFooter.vue
│   └── ui/                  # 通用 UI 元件
│       ├── LoadingSpinner.vue
│       └── ErrorBoundary.vue
│
├── composables/             # 全域共用 composables
│   ├── useAuth.ts
│   ├── useFetch.ts
│   └── useLocalStorage.ts
│
├── features/                # 功能模組（核心業務邏輯）
│   ├── score/               # 例：樂譜模組
│   │   ├── components/
│   │   │   ├── ScoreEditor.vue
│   │   │   └── ScoreList.vue
│   │   ├── composables/
│   │   │   └── useScore.ts
│   │   ├── stores/
│   │   │   └── score.store.ts
│   │   ├── types/
│   │   │   └── score.types.ts
│   │   ├── services/
│   │   │   └── score.api.ts
│   │   └── views/
│   │       └── ScoreView.vue
│   │
│   └── midi/                # 例：MIDI 模組
│       ├── components/
│       ├── composables/
│       ├── stores/
│       ├── types/
│       ├── services/
│       └── views/
│
├── router/                  # 路由設定
│   ├── index.ts
│   └── guards.ts
│
├── stores/                  # 全域 Pinia stores
│   └── app.store.ts
│
├── services/                # 全域 API / 外部服務
│   ├── api.ts               # Axios/fetch 封裝
│   └── http.ts
│
├── types/                   # 全域型別定義
│   ├── index.ts
│   └── env.d.ts
│
└── utils/                   # 純工具函式
    ├── format.ts
    └── validation.ts
```

---

## 命名規範

### 檔案命名

| 類型 | 規則 | 範例 |
|------|------|------|
| Vue Component | PascalCase | `ScoreEditor.vue` |
| Base Component | `Base` 前綴 | `BaseButton.vue`, `BaseInput.vue` |
| 子元件 | 父元件名稱為前綴 | `TodoList.vue`, `TodoListItem.vue` |
| Composable | `use` 前綴 + camelCase | `useScore.ts`, `useFetch.ts` |
| Store | `.store.ts` 後綴 | `score.store.ts` |
| Type | `.types.ts` 後綴 | `score.types.ts` |
| Service/API | `.api.ts` 後綴 | `score.api.ts` |
| Test | `.spec.ts` 後綴 | `ScoreEditor.spec.ts` |

### 元件命名原則

```
✅ SearchButtonClear.vue   （最高層級字開頭 → 修飾詞結尾）
❌ ClearSearchButton.vue

✅ TodoListItem.vue         （父子關係明確）
❌ Item.vue
```

---

## 按規模選擇結構

| 規模 | 結構 | 說明 |
|------|------|------|
| 小型 | Flat | 基礎資料夾（components, composables, views） |
| 中型 | Atomic Design | atoms → molecules → organisms → templates → pages |
| 大型 | **Feature-Based Modular（推薦）** | 按業務功能分模組 |
| 企業 | Monorepo + Feature-Based | Turborepo/Nx + 共享 types 和 UI |

---

## 模組化原則

1. **每個 feature 自包含**：components, composables, stores, types, services, views 都在同一個資料夾下
2. **feature 之間低耦合**：透過全域 store 或 event bus 溝通，不直接 import 其他 feature 的內部
3. **共用邏輯上提**：當兩個以上 feature 共用時，提升至根層級的 `composables/`、`components/`、`types/`
4. **測試就近放置**：`*.spec.ts` 放在對應檔案旁邊

---

## 關鍵技術選型

| 面向 | 推薦 | 原因 |
|------|------|------|
| Build Tool | **Vite** | Vue 官方推薦，極快的 HMR |
| State Management | **Pinia** | TypeScript 原生支援，輕量 |
| Router | **Vue Router 4** | 官方標準 |
| 型別 | **TypeScript strict** | `tsconfig.json` 中 `strict: true` |
| Linting | **ESLint + Prettier** | 搭配 `eslint-plugin-vue` |
| Testing | **Vitest + Vue Test Utils** | Vite 生態，快速 |
