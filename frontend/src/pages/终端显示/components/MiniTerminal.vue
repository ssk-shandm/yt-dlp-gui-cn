<template>
  <div class="container">
    <div
      class="terminal-container"
      ref="terminalContainer"
      @scroll="handleScroll"
    >
      <pre>{{ outputText }}<span class="cursor">|</span></pre>
      <button
        v-show="showScrollBtn"
        class="scroll-to-bottom-btn"
        @click="scrollToBottom"
        title="滚到底部"
      >
        ⬇️
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick, computed, onActivated } from 'vue'
import { useTerminalStore } from '@/stores/terminalStore'

const terminalStore = useTerminalStore()
const terminalContainer = ref<HTMLElement | null>(null)
const showScrollBtn = ref(false)

const outputText = computed(() => {
  return terminalStore.state.output.join('\n')
})

const scrollToBottom = async () => {
  await nextTick()
  if (terminalContainer.value) {
    terminalContainer.value.scrollTop = terminalContainer.value.scrollHeight
  }
}

const handleScroll = () => {
  if (!terminalContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = terminalContainer.value
  showScrollBtn.value = scrollHeight - scrollTop - clientHeight > 100
}

onActivated(() => {
  scrollToBottom()
})

watch(outputText, () => {
  scrollToBottom()
})
</script>

<style scoped>
.container {
  position: relative;
  width: 100%;
  height: 100%;
}

.terminal-container {
  position: relative;
  margin: 0;
  height: 100%;
  overflow-y: auto;
  font-family: monospace;
  color: white;
  background-color: #1a202c;
  border-radius: 16px;
  border: 1px solid #2c3b50;
  box-shadow: var(--ui-shadow);
  padding: 24px;
  box-sizing: border-box;
}

.terminal-container pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 0.875rem;
  margin: 0;
}

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

.scroll-to-bottom-btn {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.scroll-to-bottom-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(74, 222, 128, 0.5);
}

.scroll-to-bottom-btn:active {
  transform: scale(0.95);
}
</style>
