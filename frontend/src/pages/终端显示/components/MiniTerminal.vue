<template>
  <div class="container">
    <div
      class="terminal-container"
      ref="terminalContainer"
    >
      <pre v-html="outputHtml"></pre>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick, computed,onActivated } from 'vue'
import { useTerminalStore } from '@/stores/terminalStore'

const terminalStore = useTerminalStore()

const terminalContainer = ref<HTMLElement | null>(null)


// 在所有返回的数据之后添加光标
const outputHtml = computed(()=>{
  return terminalStore.state.output.join('')+'<span class="cursor">|</span>'
}
)

// 滚动
const scrollToBottom = async () => {
  await nextTick()
  if (terminalContainer.value) {
    terminalContainer.value.scrollTop = terminalContainer.value.scrollHeight
  }
}
// watch(outputHtml, async () => {
//   await nextTick()
//   if (terminalContainer.value) {
//     // 滚动条滚到最底部
//     terminalContainer.value.scrollTop = terminalContainer.value.scrollHeight
//   }
// })
onActivated(() => {
  scrollToBottom()
})
watch(outputHtml, () => {
  scrollToBottom()
})


// 追加数据
// const handleTerminalOutput = (event: Event) => {
//   const newLine = (event as CustomEvent).detail;
//   terminalStore.addLine(newLine);
// }

// onMounted(() => {
//   window.addEventListener('terminal-output', handleTerminalOutput)
// })
// onUnmounted(() => {
//   window.removeEventListener('terminal-output', handleTerminalOutput)
// })

</script>

<style scoped>
.terminal-container {
  margin: 2vh 0 2vh 0;
  height: 90vh;
  overflow-y: auto;
  font-family: monospace;
  color: white;
  background-color: #1a202c;
  border-radius: 0.5rem;
  padding: 1rem;
  box-sizing: border-box;
}

.terminal-container pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.875rem;
  margin: 0;
}

/* 光标的闪烁动画 */
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

.terminal-container :deep(.cursor) {
  animation: blink 1.2s step-end infinite;
  color: #4ade80;
  font-weight: bold;
  display: inline-block;
  user-select: none;
}

/* 滚动条样式 */
.terminal-container::-webkit-scrollbar {
  width: 8px;
}

.terminal-container::-webkit-scrollbar-track {
  background: #1a202c;
}

.terminal-container::-webkit-scrollbar-thumb {
  background-color: #4a5568;
  border-radius: 4px;
}
</style>
