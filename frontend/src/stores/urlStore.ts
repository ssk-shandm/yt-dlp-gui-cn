import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUrlStore = defineStore('Url', () => {
  // url 地址
  const currentUrl = ref('')
  const analyzedUrl = ref('')

  // 分析前和重置后均不显示图片
  const thumbnailUrl = ref('')
  function setThumbnailUrl(url: string) {
    thumbnailUrl.value = url
  }

  return {
    currentUrl,
    analyzedUrl,
    setThumbnailUrl,
    thumbnailUrl,
    resetThumbnail: () => {
      thumbnailUrl.value = ''
    },
  }
})
