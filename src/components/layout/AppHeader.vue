<script setup lang="ts">
import { useAppStore } from '@/stores/app.store'
import BaseButton from '@/components/base/BaseButton.vue'

const appStore = useAppStore()
</script>

<template>
  <header class="flex h-12 items-center justify-between border-b border-gray-200 bg-surface px-4 dark:border-gray-700 dark:bg-surface-dark">
    <h1 class="text-lg font-semibold text-on-surface dark:text-on-surface-dark">
      {{ appStore.title }}
    </h1>
    <nav class="flex items-center gap-2">
      <BaseButton size="sm" variant="primary" @click="appStore.triggerFileImport()">
        Import
      </BaseButton>
      <slot name="actions" />
    </nav>
  </header>
</template>
