import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Settings } from '@/types/desktop'

export const useSettingsStore = defineStore('settings', () => {
  const downloadPath = ref('')
  const retryTimes = ref('10')
  const initialized = ref(false)
  function applySettings(settings: Settings) {
    downloadPath.value = settings.downloadPath
    retryTimes.value = settings.retryTimes
  }
  return { downloadPath, retryTimes, initialized, applySettings }
})
