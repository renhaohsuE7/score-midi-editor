# Vue 3 Composables Best Practices

> 參考來源：
> - [Vue.js Official - Composables](https://vuejs.org/guide/reusability/composables.html)
> - [Good Practices and Design Patterns for Vue Composables - DEV](https://dev.to/jacobandrewsky/good-practices-and-design-patterns-for-vue-composables-24lk)
> - [Vue Mastery - Coding Better Composables](https://www.vuemastery.com/blog/coding-better-composables-1-of-5/)

## 什麼是 Composable

Composable 是利用 Vue Composition API 封裝**可重用的有狀態邏輯**的函式，類似 React 的 custom hooks，但使用 Vue 的 reactivity system。

---

## 命名規範

- 函式名稱以 **`use`** 開頭，camelCase
- 檔案名稱與函式同名：`useScore.ts` → `export function useScore()`

```typescript
// ✅
export function useMouse() { ... }
export function useFetch(url: MaybeRefOrGetter<string>) { ... }

// ❌
export function mouse() { ... }
export function fetchData() { ... }
```

---

## 輸入參數設計

### 接受 Ref / Getter / 純值

使用 `toValue()` (Vue 3.3+) 統一處理：

```typescript
import { toValue, watchEffect } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

export function useFetch(url: MaybeRefOrGetter<string>) {
  watchEffect(() => {
    const resolvedUrl = toValue(url) // 自動 unwrap ref 或 getter
    fetch(resolvedUrl).then(/* ... */)
  })
}

// 消費端可以用不同方式傳入
useFetch('/api/data')              // 純值
useFetch(urlRef)                   // ref
useFetch(() => `/api/${id.value}`) // getter
```

---

## 回傳值設計

### 回傳包含 ref 的普通物件（推薦）

```typescript
// ✅ 正確：回傳 plain object containing refs
export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  // ...event listeners...

  return { x, y } // 解構後仍保持 reactivity
}

// 使用端
const { x, y } = useMouse() // ✅ x, y 仍然是 reactive 的
```

### 如果偏好物件存取

```typescript
const mouse = reactive(useMouse())
console.log(mouse.x) // 自動 unwrap，直接使用
```

---

## Side Effects 管理

### 必須在 lifecycle hooks 中處理 DOM 操作

```typescript
import { onMounted, onUnmounted } from 'vue'

export function useEventListener(
  target: EventTarget,
  event: string,
  callback: EventListener
) {
  onMounted(() => target.addEventListener(event, callback))
  onUnmounted(() => target.removeEventListener(event, callback))
}
```

### 規則

- DOM 相關操作放在 `onMounted()`（避免 SSR 錯誤）
- **必須**在 `onUnmounted()` 清理（防止 memory leak）
- Watcher 會自動隨 component 銷毀，但自訂 listener 不會

---

## Async Composable 模式

```typescript
import { ref, watchEffect, toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

interface UseFetchReturn<T> {
  data: Ref<T | null>
  error: Ref<Error | null>
  isLoading: Ref<boolean>
}

export function useFetch<T>(url: MaybeRefOrGetter<string>): UseFetchReturn<T> {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<Error | null>(null)
  const isLoading = ref(false)

  watchEffect(async () => {
    data.value = null
    error.value = null
    isLoading.value = true

    try {
      const response = await fetch(toValue(url))
      data.value = await response.json()
    } catch (err) {
      error.value = err as Error
    } finally {
      isLoading.value = false
    }
  })

  return { data, error, isLoading }
}
```

---

## 組合 Composables

小型 composable 組合成複雜邏輯：

```typescript
// 基礎 composable
export function useEventListener(target: EventTarget, event: string, cb: EventListener) {
  onMounted(() => target.addEventListener(event, cb))
  onUnmounted(() => target.removeEventListener(event, cb))
}

// 組合使用
export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  useEventListener(window, 'mousemove', (event) => {
    x.value = (event as MouseEvent).pageX
    y.value = (event as MouseEvent).pageY
  })

  return { x, y }
}
```

---

## 單一職責原則

```typescript
// ❌ 巨型 composable
export function useCart() {
  // 包含 add, remove, fetch, calculate, checkout...
}

// ✅ 拆分為單一職責
export function useAddToCart() { ... }
export function useFetchCart() { ... }
export function useRemoveFromCart() { ... }
export function useCartTotal() { ... }
```

---

## 呼叫限制

| 可以呼叫 | 不可以呼叫 |
|----------|-----------|
| `<script setup>` 內 | 非同步回呼中（除非在 `<script setup>` 的 `await` 後） |
| `setup()` hook 內 | `setTimeout` / `Promise.then` 中 |
| 其他 composable 內 | 一般函式中 |
| lifecycle hooks 內 | |

---

## 狀態隔離

每個使用 composable 的元件**獨立擁有自己的狀態副本**：

```typescript
// ComponentA 和 ComponentB 各自呼叫 useMouse()
// 它們的 x, y 是獨立的，互不影響
```

若需跨元件共享狀態 → 使用 **Pinia Store**。

---

## 測試策略

- Composable 本質是 TypeScript 函式，可用 **Vitest** 直接測試
- 不需要 DOM mocking（除非涉及 DOM 操作）
- 專注測試邏輯，不測試 Vue 框架行為

```typescript
import { useFetch } from './useFetch'

describe('useFetch', () => {
  it('should fetch data', async () => {
    const { data, error, isLoading } = useFetch('/api/test')
    // assertions...
  })
})
```

---

## 核心原則總結

| 原則 | 說明 |
|------|------|
| `use` 前綴 | 所有 composable 以 `use` 開頭 |
| 回傳 plain object of refs | 支持解構保持 reactivity |
| `toValue()` 處理輸入 | 統一 ref / getter / 純值 |
| 清理 side effects | `onUnmounted` 中移除 listener |
| 單一職責 | 拆小不拆大 |
| 同步呼叫 | 只在 setup context 中呼叫 |
| TypeScript 型別 | 明確標註 input / output 型別 |
