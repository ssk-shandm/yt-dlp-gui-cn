import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTerminalStore = defineStore('terminal', () => {
  const state = ref({
    output: ['测试版:v0.0.1<br>'], // 用来存放每一行输出
  })

  function addLine(line: string) {
    // 添加输出
    state.value.output.push(line)
  }
  return {
    state,
    addLine,
  }
})
