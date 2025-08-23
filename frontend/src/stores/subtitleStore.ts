import { defineStore } from 'pinia'
import { ref } from 'vue'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'

export const useSubtitleStore = defineStore('subtitle', () => {
  const subtitles = ref<any[]>([])
  const isLoading = ref(false)

  // py-analyze_url函数:传递newSubtitles数据
  function setSubtitles(newSubtitles: any[]) {
    subtitles.value = newSubtitles
    isLoading.value = false
  }

  // 加载 action
  function startLoading() {
    subtitles.value = [] // 清空旧数据
    isLoading.value = true
  }
  // 下载
  const downloadSubtitle = (url: string, langCode: string) => {
    if (!url || !langCode) {
      NotificationPlugin.warning({ title: '操作提示', content: 'URL 或语言代码无效' })
      return
    }
    NotificationPlugin.info({ title: '系统提示', content: `已请求下载 ${langCode} 字幕...` })
    window.eel.download_specific_subtitle(url, langCode)
  }

  // // 下载
  // const downloadSubtitle = async (url: string, langCode: string) => {
  //   if (!url || !langCode) {
  //     NotificationPlugin.warning({ title: '操作提示', content: 'URL 或语言代码无效' })
  //     return
  //   }
  //   NotificationPlugin.info({ title: '系统提示', content: `正在请求下载 ${langCode} 字幕...` })

  //   const result = await window.eel.download_specific_subtitle(url, langCode)
  //   if (result.status === 'success') {
  //     NotificationPlugin.success({ title: '下载成功', content: result.message || '下载完成！'})
  //   } else {
  //     NotificationPlugin.error({ title: '下载失败', content: result.message || '下载失败，后端错误。'})
  //   }
  // }

  return {
    subtitles,
    isLoading,
    setSubtitles,
    startLoading,
    downloadSubtitle,
  }
})
