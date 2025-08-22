import { defineStore } from 'pinia'
import { ref } from 'vue'
import defaultImage from '@/assets/test.jpg'

export const useUrlStore = defineStore('Url', () => {
  // url 地址
  const currentUrl = ref('')
  const analyzedUrl = ref('')

  // 默认图片
  const thumbnailUrl = ref(defaultImage)
  function setThumbnailUrl(url:string){
    thumbnailUrl.value = url
  }

  return {
    currentUrl,
    analyzedUrl,
    setThumbnailUrl,
    thumbnailUrl
  }
})
