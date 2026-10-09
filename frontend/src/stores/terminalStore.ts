import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTerminalStore = defineStore('terminal', () => {
  const state = ref({ output: [] as string[] })
  function addLine(line: string) {
    state.value.output.push(line)
    if (state.value.output.length > 2000) state.value.output.splice(0, state.value.output.length - 2000)
  }
  function clear() {
    state.value.output = []
  }
  return { state, addLine, clear }
})
