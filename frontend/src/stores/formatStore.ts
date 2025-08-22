import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFormatStore = defineStore('format', () => {
  const formats = ref<any[]>([])
  const isLoading = ref(false)

  // 填入已有表格数据 action
  // py-analyze_url函数:传递newFormats数据
   function setFormats(newFormats: any[]) {
    formats.value = newFormats
    isLoading.value = false // 收到数据后，加载结束
  }

  // 加载 action
  function startLoading() {
    formats.value = [] // 清空旧数据
    isLoading.value = true
  }

  return {
    formats,
    isLoading,
    setFormats,
    startLoading,
  }
})
