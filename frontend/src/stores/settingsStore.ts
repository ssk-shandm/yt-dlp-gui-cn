import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Settings } from '@/types/desktop'

export const useSettingsStore = defineStore('settings', () => {
  const downloadPath = ref('')
  const retryTimes = ref('10')
  const concurrentFragments = ref(8)
  const proxyEnabled = ref(false)
  const proxyUrl = ref('http://127.0.0.1:7890')
  const initialized = ref(false)
  function applySettings(settings: Settings) {
    downloadPath.value = settings.downloadPath
    retryTimes.value = settings.retryTimes
    concurrentFragments.value = settings.concurrentFragments ?? 8
    proxyEnabled.value = settings.proxyEnabled ?? false
    proxyUrl.value = settings.proxyUrl ?? 'http://127.0.0.1:7890'
  }
  return { downloadPath, retryTimes, concurrentFragments, proxyEnabled, proxyUrl, initialized, applySettings }
})
