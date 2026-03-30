<script setup lang="ts">
defineProps<{
  message?: string
}>()
</script>

<template>
  <footer class="flex h-6 items-center border-t border-gray-200 bg-surface px-4 text-xs text-gray-500 dark:border-gray-700 dark:bg-surface-dark dark:text-gray-400">
    <span>{{ message || 'Ready' }}</span>
  </footer>
</template>
