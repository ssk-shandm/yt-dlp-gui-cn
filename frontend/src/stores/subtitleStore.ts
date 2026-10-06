import { defineStore } from 'pinia'
import { ref } from 'vue'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'
import { startDownload } from '@/services/desktop'
import type { Subtitle } from '@/types/desktop'

export const useSubtitleStore = defineStore('subtitle', () => {
  const subtitles = ref<Subtitle[]>([])
  const isLoading = ref(false)
  function setSubtitles(value: Subtitle[]) { subtitles.value = value; isLoading.value = false }
  function startLoading() { subtitles.value = []; isLoading.value = true }
  function downloadSubtitle(url: string, language: string) {
    if (!url || !language) {
      NotificationPlugin.warning({ title: '操作提示', content: 'URL 或语言代码无效' })
      return
    }
    void startDownload({ url, kind: 'subtitle', language })
  }
  return { subtitles, isLoading, setSubtitles, startLoading, downloadSubtitle }
})
