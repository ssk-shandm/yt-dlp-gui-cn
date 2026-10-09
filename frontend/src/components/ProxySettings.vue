<template>
  <form class="proxy-settings" aria-label="本地 VPN / 代理设置" @submit.prevent="save">
    <div class="proxy-heading">
      <div>
        <h3>本地 VPN / 代理</h3>
        <p>先启动你的 VPN 客户端，再填写它提供的本地 HTTP / SOCKS5 代理地址。此设置不会安装或启动 VPN，也不会修改系统代理。</p>
      </div>
      <label class="proxy-toggle">
        <input v-model="enabled" type="checkbox" :disabled="saving" aria-label="启用本地 VPN / 代理" />
        启用
      </label>
    </div>
    <label for="local-proxy-url" class="proxy-label">本地代理地址</label>
    <div class="proxy-input-row">
      <input id="local-proxy-url" v-model="url" type="text" placeholder="http://127.0.0.1:7890" :disabled="!enabled || saving" :required="enabled" spellcheck="false" autocomplete="off" aria-describedby="proxy-help" />
      <button type="submit" :disabled="saving" class="proxy-save">{{ saving ? '保存中…' : '保存代理设置' }}</button>
    </div>
    <p id="proxy-help" class="proxy-help">示例：http://127.0.0.1:7890 或 socks5://127.0.0.1:1080。端口以你的客户端为准；仅接受本机地址（localhost / 回环 IP），不支持带账号密码的地址。</p>
    <p class="proxy-help">保存后用于新发起的链接解析、视频 / 字幕 / 封面下载、工具下载及应用更新；正在运行的任务不受影响。关闭后恢复原有系统 / 环境网络配置。若客户端只提供 TUN 模式，不必启用此项。</p>
    <p v-if="message" class="proxy-feedback" :class="{ 'is-error': failed }" :role="failed ? 'alert' : 'status'">{{ message }}</p>
  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { saveProxySettings } from '@/services/desktop'

const settings = useSettingsStore()
const enabled = ref(settings.proxyEnabled)
const url = ref(settings.proxyUrl)
const saving = ref(false)
const message = ref('')
const failed = ref(false)
watch(() => [settings.proxyEnabled, settings.proxyUrl] as const, ([active, address]) => {
  enabled.value = active
  url.value = address
})
watch([enabled, url], () => { message.value = '' })
async function save() {
  if (saving.value) return
  saving.value = true
  message.value = ''
  failed.value = false
  try {
    await saveProxySettings(enabled.value, url.value)
    message.value = enabled.value ? '已保存，新发起的请求将使用本地代理。请确保 VPN 客户端正在运行。' : '已关闭本地代理覆盖，恢复原有网络配置。'
  } catch (error) {
    failed.value = true
    message.value = error instanceof Error ? error.message : String(error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.proxy-settings { margin-top: 24px; padding: 20px 18px; border: 1px solid var(--ui-border); border-radius: 14px; background: #fbfdff; }
.proxy-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.proxy-heading h3 { margin: 0; font-size: 14px; font-weight: 650; }
.proxy-heading p, .proxy-help { margin: 7px 0 0; color: var(--ui-text-muted); font-size: 12px; line-height: 1.7; overflow-wrap: anywhere; }
.proxy-toggle { display: flex; align-items: center; gap: 6px; flex-shrink: 0; font-size: 13px; cursor: pointer; }
.proxy-toggle input { accent-color: var(--ui-accent); width: 16px; height: 16px; }
.proxy-label { display: block; margin: 16px 0 8px; font-size: 12px; font-weight: 600; }
.proxy-input-row { display: flex; flex-wrap: wrap; gap: 10px; }
.proxy-input-row input { flex: 1 1 220px; min-width: 0; padding: 10px 12px; border: 1px solid var(--ui-border); border-radius: 9px; background: #fff; color: var(--ui-text); font: inherit; font-size: 13px; }
.proxy-input-row input:disabled { background: #f0f4f8; color: var(--ui-text-muted); }
.proxy-save { padding: 10px 13px; border: 1px solid var(--ui-accent); border-radius: 9px; background: var(--ui-accent); color: #fff; font: inherit; font-size: 12px; cursor: pointer; }
.proxy-save:disabled { opacity: 0.55; cursor: wait; }
.proxy-input-row input:focus-visible, .proxy-save:focus-visible, .proxy-toggle input:focus-visible { outline: 3px solid #80b8f8; outline-offset: 3px; }
.proxy-feedback { padding: 10px 12px; margin: 12px 0 0; border-radius: 9px; background: #edf5ff; color: var(--ui-accent); font-size: 12px; line-height: 1.7; }
.proxy-feedback.is-error { background: #fff0ee; color: #b53a2d; }
</style>
