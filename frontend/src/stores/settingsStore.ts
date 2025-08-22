import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // 设置下载目录
  const downloadPath = ref('设置下载目录')
  console.log('设置了下载目录:',downloadPath.value)

  function setDownloadPath(path: string) {
    downloadPath.value = path
  }

  // 设置重试次数
  const retryTimes = ref('重试次数')
  console.log('设置了重试次数:',retryTimes.value)

  // // 伪造ip
  // const fakeip = ref('默认ip')

  return {
    downloadPath,
    setDownloadPath,
    retryTimes,
    // fakeip
  }
})
