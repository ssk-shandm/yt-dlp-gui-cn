import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { VideoFormat } from '@/types/desktop'

export const useFormatStore = defineStore('format', () => {
  const formats = ref<VideoFormat[]>([])
  const isLoading = ref(false)
  function setFormats(value: VideoFormat[]) { formats.value = value; isLoading.value = false }
  function startLoading() { formats.value = []; isLoading.value = true }
  return { formats, isLoading, setFormats, startLoading }
})
