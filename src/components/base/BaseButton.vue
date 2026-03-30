<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}>()
</script>

<template>
  <button
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50',
      {
        'bg-primary text-white hover:bg-primary-dark': variant === 'primary' || !variant,
        'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700': variant === 'secondary',
        'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800': variant === 'ghost',
      },
      {
        'px-2.5 py-1 text-xs': size === 'sm',
        'px-4 py-2 text-sm': size === 'md' || !size,
        'px-6 py-3 text-base': size === 'lg',
      },
    ]"
  >
    <slot />
  </button>
</template>
