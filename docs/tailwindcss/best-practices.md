# Tailwind CSS Best Practices（Vue 3 整合）

> 參考來源：
> - [Tailwind CSS Best Practices - Frontend Tools](https://www.frontendtools.tech/blog/tailwind-css-best-practices-design-system-patterns)
> - [Master TailwindCSS 4 for Vue - Vue School](https://vueschool.io/articles/vuejs-tutorials/master-tailwindcss-4-for-vue/)

## 版本建議

使用 **Tailwind CSS v4.0+**（2025 年 1 月發布），基於 Rust 引擎：
- Full build 快 5 倍
- Incremental build 快 100 倍以上
- 自動 content detection，零配置

---

## v4 主題配置（@theme directive）

Tailwind v4 使用 CSS-first 配置，取代 JavaScript config：

```css
/* app.css */
@import "tailwindcss";

@theme {
  --color-primary: #6366F1;
  --color-secondary: #F59E0B;
  --color-accent: #10B981;
  --font-family-sans: 'Inter', system-ui, sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;
}
```

> v4 不再需要 `tailwind.config.js`，所有主題配置直接寫在 CSS 中。

---

## Design Tokens 設計

### 色彩系統

```css
@theme {
  /* 語意化命名 */
  --color-primary: #6366F1;
  --color-primary-light: #818CF8;
  --color-primary-dark: #4F46E5;

  /* 功能色 */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;

  /* 中性色 */
  --color-surface: #FFFFFF;
  --color-surface-dim: #F9FAFB;
  --color-on-surface: #111827;
}
```

### 字體系統

定義語意化字體名稱並附帶 fallback：

```css
@theme {
  --font-family-sans: 'Inter', system-ui, sans-serif;
  --font-family-serif: 'Merriweather', Georgia, serif;
  --font-family-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-family-display: 'Poppins', sans-serif;
}
```

---

## Vue Component 樣式策略

### 原則：直接在 template 使用 utility classes

```vue
<template>
  <button
    class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white
           transition-colors hover:bg-primary-dark
           focus:outline-none focus:ring-2 focus:ring-primary/50"
  >
    <slot />
  </button>
</template>
```

### Utility Class 管理

- 每個元素 **最多 10–12 個 class**，超過時考慮抽取元件
- 使用 **conditional classes** 時推薦 `clsx` 或 Vue 的動態 class binding：

```vue
<template>
  <button
    :class="[
      'rounded-lg px-4 py-2 font-medium transition-colors',
      variant === 'primary'
        ? 'bg-primary text-white hover:bg-primary-dark'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    ]"
  >
    <slot />
  </button>
</template>
```

### 避免過度使用 @apply

v4 團隊建議 **減少 `@apply` 使用**，優先：
1. 抽取為 Vue component
2. 使用 CSS custom properties
3. 真的需要時才用 `@apply`

---

## Responsive Design

### Mobile-First 原則

```vue
<template>
  <!-- 基礎樣式 = mobile，逐步增加斷點 -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <slot />
  </div>
</template>
```

### 斷點語意

| Prefix | 最小寬度 | 用途 |
|--------|----------|------|
| `sm:` | 640px | 大手機 / 小平板 |
| `md:` | 768px | 平板 |
| `lg:` | 1024px | 桌面 |
| `xl:` | 1280px | 大螢幕 |
| `2xl:` | 1536px | 超大螢幕 |

---

## Dark Mode

```vue
<template>
  <div class="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
    <h1 class="text-primary dark:text-primary-light">Title</h1>
  </div>
</template>
```

建議使用 `class` strategy，搭配 JavaScript 控制 `<html>` 的 `dark` class。

---

## 效能優化

| 策略 | 說明 |
|---|---|
| JIT 模式 | v4 預設啟用，僅產生使用到的 CSS |
| 避免不必要的 variants | 只在需要時加入 hover/focus/dark 等 |
| Lazy-load 元件 | 搭配 Vue 的 `defineAsyncComponent` |
| 控制 class 數量 | 單一元素不超過 10–12 個 utility class |
| 避免 arbitrary values 濫用 | 優先使用 theme token，如 `bg-primary` 而非 `bg-[#6366F1]` |

---

## 推薦 Component Library

搭配 Tailwind + Vue 3 使用：
- **Headless UI** — 無樣式邏輯元件
- **Radix Vue** — Vue 版 Radix，accessible headless 元件
- **PrimeVue** — 支援 Tailwind 整合的完整 UI 套件
