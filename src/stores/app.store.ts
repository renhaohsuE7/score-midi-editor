import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', () => {
  const title = ref(import.meta.env.VITE_APP_TITLE || 'Score MIDI UI')
  const isDark = ref(false)
  const importTrigger = ref(0)

  function toggleDark() {
    isDark.value = !isDark.value
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function triggerFileImport() {
    importTrigger.value++
  }

  return { title, isDark, toggleDark, importTrigger, triggerFileImport }
})
