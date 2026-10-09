<template>
  <section class="terminal-shell" :aria-label="$t('terminal.outputLabel')">
    <header class="terminal-toolbar">
      <div class="terminal-title">
        <span class="status-dot" aria-hidden="true" />
        <div>
          <strong>{{ $t('terminal.title') }}</strong>
          <span>{{ $t('terminal.lineCount', { count: output.length }) }} · {{ running ? $t('terminal.streaming') : $t('terminal.waiting') }}</span>
        </div>
      </div>
      <div class="terminal-actions">
        <button type="button" class="toolbar-button" data-guide="copy-logs" :disabled="!output.length" @click="copyOutput">{{ $t('terminal.copy') }}</button>
        <button type="button" class="toolbar-button" :disabled="!output.length" @click="terminalStore.clear">{{ $t('terminal.clear') }}</button>
      </div>
    </header>
    <div
      ref="terminalContainer"
      class="terminal-container"
      @scroll="handleScroll"
    >
      <div v-if="!output.length" class="empty-terminal">
        <span class="empty-icon">›_</span>
        <strong>{{ $t('terminal.emptyTitle') }}</strong>
        <p>{{ $t('terminal.emptyHint') }}</p>
      </div>
      <ol v-else class="terminal-lines" aria-live="polite">
        <li v-for="(line, index) in output" :key="`${index}-${line}`" class="terminal-line">
          <span class="line-number" aria-hidden="true">{{ index + 1 }}</span>
          <code :class="lineClass(line)">{{ line || ' ' }}</code>
        </li>
      </ol>
      <span v-if="output.length" class="cursor" aria-hidden="true">▌</span>
      <button
        v-show="showScrollBtn"
        type="button"
        class="scroll-to-bottom-btn"
        @click="scrollToBottom"
        :title="$t('terminal.scrollToBottom')"
        :aria-label="$t('terminal.scrollToBottom')"
      >↓</button>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, nextTick, onActivated, ref, watch } from 'vue'
import { useTerminalStore } from '@/stores/terminalStore'

const terminalStore = useTerminalStore()
const terminalContainer = ref<HTMLElement | null>(null)
const showScrollBtn = ref(false)
const output = computed(() => terminalStore.state.output)
const running = computed(() => output.value.some((line) => /^\[\d+\]/.test(line)))

function lineClass(line: string) {
  if (/错误|失败|error|failed/i.test(line)) return 'is-error'
  if (/完成|成功|success|finished/i.test(line)) return 'is-success'
  if (/警告|warning/i.test(line)) return 'is-warning'
  return ''
}
async function scrollToBottom() {
  await nextTick()
  if (terminalContainer.value) terminalContainer.value.scrollTop = terminalContainer.value.scrollHeight
}
function handleScroll() {
  if (!terminalContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = terminalContainer.value
  showScrollBtn.value = scrollHeight - scrollTop - clientHeight > 100
}
async function copyOutput() {
  try {
    await navigator.clipboard.writeText(output.value.join('\n'))
  } catch {
    // Clipboard access is unavailable in some browser previews.
  }
}
onActivated(scrollToBottom)
watch(output, scrollToBottom, { deep: true })
</script>

<style scoped>
.terminal-shell { display: flex; flex-direction: column; height: 100%; min-height: 320px; overflow: hidden; border: 1px solid var(--ui-border); border-radius: 16px; background: #111827; box-shadow: var(--ui-shadow); }
.terminal-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 18px; color: #e5e7eb; background: #1f2937; border-bottom: 1px solid #374151; }
.terminal-title { display: flex; align-items: center; gap: 10px; min-width: 0; }
.terminal-title strong, .terminal-title span { display: block; }
.terminal-title strong { font-size: 13px; }
.terminal-title span { margin-top: 3px; color: #9ca3af; font-size: 11px; }
.status-dot { width: 9px; height: 9px; flex: 0 0 auto; border-radius: 50%; background: #4ade80; box-shadow: 0 0 0 4px #4ade8030; }
.terminal-actions { display: flex; gap: 8px; }
.toolbar-button { padding: 6px 10px; border: 1px solid #4b5563; border-radius: 7px; color: #d1d5db; background: #273449; font: inherit; font-size: 11px; cursor: pointer; }
.toolbar-button:hover:not(:disabled) { border-color: #60a5fa; color: #fff; }
.toolbar-button:disabled { cursor: not-allowed; opacity: .45; }
.terminal-container { position: relative; flex: 1; min-height: 0; overflow: auto; padding: 16px 12px; color: #d1d5db; background: #111827; font-family: 'Cascadia Mono', Consolas, monospace; font-size: 12px; line-height: 1.7; }
.terminal-lines { margin: 0; padding: 0; list-style: none; }
.terminal-line { display: flex; min-height: 1.7em; }
.line-number { width: 42px; flex: 0 0 42px; padding-right: 12px; box-sizing: border-box; color: #4b5563; text-align: right; user-select: none; }
.terminal-line code { min-width: 0; white-space: pre-wrap; overflow-wrap: anywhere; color: #d1d5db; }
.terminal-line code.is-error { color: #fca5a5; }
.terminal-line code.is-success { color: #86efac; }
.terminal-line code.is-warning { color: #fde68a; }
.cursor { display: inline-block; color: #4ade80; animation: blink 1.2s step-end infinite; }
.empty-terminal { display: grid; place-items: center; align-content: center; height: 100%; min-height: 240px; color: #9ca3af; text-align: center; }
.empty-terminal strong { margin-top: 12px; color: #e5e7eb; font-size: 14px; }
.empty-terminal p { margin: 6px 0 0; font-size: 12px; }
.empty-icon { color: #60a5fa; font-size: 26px; font-weight: 700; }
.scroll-to-bottom-btn { position: sticky; bottom: 8px; left: calc(100% - 40px); display: grid; place-items: center; width: 30px; height: 30px; margin: -38px 8px 8px auto; border: 0; border-radius: 50%; color: #fff; background: #2563eb; font-size: 18px; cursor: pointer; box-shadow: 0 4px 12px #0006; }
.terminal-container::-webkit-scrollbar { width: 9px; height: 9px; }
.terminal-container::-webkit-scrollbar-track { background: #111827; }
.terminal-container::-webkit-scrollbar-thumb { border-radius: 5px; background: #4b5563; }
@keyframes blink { 50% { opacity: 0; } }
@media (max-width: 520px) { .terminal-toolbar { padding: 12px; } .terminal-actions { gap: 4px; } .toolbar-button { padding: 6px; } .line-number { width: 30px; flex-basis: 30px; padding-right: 7px; } }
</style>
