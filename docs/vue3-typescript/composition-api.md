# Vue 3 + TypeScript Composition API Best Practices

> 參考來源：[Vue.js Official - TypeScript with Composition API](https://vuejs.org/guide/typescript/composition-api)

## 總覽

Vue 3.5+ / 3.6+ 搭配 TypeScript 的 Composition API 已是 2025–2026 主流標準，採用率超過 85%。應全面使用 `<script setup lang="ts">` 搭配 type-based declarations。

---

## defineProps — 型別宣告（推薦）

```typescript
<script setup lang="ts">
// ✅ Type-based declaration（推薦）
const props = defineProps<{
  foo: string
  bar?: number
}>()
</script>
```

### 帶預設值（Vue 3.5+ reactive destructure）

```typescript
interface Props {
  msg?: string
  labels?: string[]
}

const { msg = 'hello', labels = ['one', 'two'] } = defineProps<Props>()
```

### 帶預設值（Vue 3.4 以下 withDefaults）

```typescript
const props = withDefaults(defineProps<Props>(), {
  msg: 'hello',
  labels: () => ['one', 'two'] // mutable 型別必須用 function 包裝
})
```

### 複雜 Prop 類型

```typescript
interface Book {
  title: string
  author: string
  year: number
}

const props = defineProps<{
  book: Book
}>()
```

---

## defineEmits — 型別宣告（推薦）

```typescript
// ✅ Vue 3.3+ labeled tuple syntax（推薦）
const emit = defineEmits<{
  change: [id: number]
  update: [value: string]
}>()
```

---

## ref() 型別推導

```typescript
// 自動推導
const year = ref(2020) // Ref<number>

// 明確泛型
const year = ref<string | number>('2020')

// 無初始值
const n = ref<number>() // Ref<number | undefined>
```

**建議**：2026 年偏好使用 `ref()` 搭配 explicit types，比 `reactive()` 更靈活且對 TypeScript generics 友好。

---

## reactive()

```typescript
interface Book {
  title: string
  year?: number
}

const book: Book = reactive({ title: 'Vue 3 Guide' })
```

> ⚠️ 不要對 `reactive()` 使用 generic argument，因為 ref unwrapping 行為差異會導致型別不正確。

---

## computed()

```typescript
const count = ref(0)

// 自動推導
const double = computed(() => count.value * 2) // ComputedRef<number>

// 明確泛型
const double = computed<number>(() => count.value * 2)
```

---

## Provide / Inject 型別安全

```typescript
import { provide, inject } from 'vue'
import type { InjectionKey } from 'vue'

// 建立 type-safe key（建議放在獨立檔案）
const key = Symbol() as InjectionKey<string>

// Provider
provide(key, 'foo') // type-checked

// Consumer
const foo = inject(key) // string | undefined
const bar = inject<string>('key', 'default') // string
```

---

## Template Refs

### Vue 3.5+（推薦 useTemplateRef）

```typescript
<script setup lang="ts">
import { useTemplateRef } from 'vue'

const el = useTemplateRef<HTMLInputElement>('el')
</script>

<template>
  <input ref="el" />
</template>
```

### Component Refs

```typescript
import { useTemplateRef } from 'vue'
import Foo from './Foo.vue'

type FooType = InstanceType<typeof Foo>
const compRef = useTemplateRef<FooType>('comp')
```

---

## Event Handlers

```typescript
function handleChange(event: Event) {
  console.log((event.target as HTMLInputElement).value)
}
```

> 始終為 event handler 參數標註型別，尤其在 `strict: true` 下。

---

## 核心原則

| 原則 | 說明 |
|---|---|
| Type-based declarations | `defineProps` / `defineEmits` 優先使用型別宣告 |
| `InjectionKey` | provide/inject 必須使用以確保型別安全 |
| Mutable defaults 包裝 | `withDefaults` 中 mutable 值用 `() => []` |
| `import type` | 避免循環依賴，使用 `import type` 匯入型別 |
| `strict: true` | `tsconfig.json` 從第一天就啟用 strict 模式 |
| Optional chaining | Template refs 使用 `el.value?.focus()` |
