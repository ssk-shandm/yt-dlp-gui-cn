import packageInfo from '../../package.json' with { type: 'json' }
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTerminalStore = defineStore('terminal', () => {
  const state = ref({ output: [`yt-dlp GUI v${packageInfo.version} — Tauri 桌面端`] })
  function addLine(line: string) {
    state.value.output.push(line)
    if (state.value.output.length > 2000) state.value.output.splice(0, state.value.output.length - 2000)
  }
  return { state, addLine }
})
