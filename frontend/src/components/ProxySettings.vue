<template>
  <form class="proxy-settings" :aria-label="$t('common.proxy.formLabel')" @submit.prevent="save">
    <div class="proxy-heading">
      <div>
        <h3>{{ $t('common.proxy.title') }}</h3>
        <p>{{ $t('common.proxy.intro') }}</p>
      </div>
      <label class="proxy-toggle">
        <input v-model="enabled" type="checkbox" :disabled="saving" :aria-label="$t('common.proxy.enableLabel')" />
        {{ $t('common.proxy.enable') }}
      </label>
    </div>
    <label for="local-proxy-url" class="proxy-label">{{ $t('common.proxy.urlLabel') }}</label>
    <div class="proxy-input-row">
      <input id="local-proxy-url" v-model="url" type="text" placeholder="http://127.0.0.1:7890" :disabled="!enabled || saving" :required="enabled" spellcheck="false" autocomplete="off" aria-describedby="proxy-help" />
      <button type="submit" :disabled="saving" class="proxy-save">{{ saving ? $t('common.proxy.saving') : $t('common.proxy.save') }}</button>
    </div>
    <p id="proxy-help" class="proxy-help">{{ $t('common.proxy.examples') }}</p>
    <p class="proxy-help">{{ $t('common.proxy.scope') }}</p>
    <p v-if="message" class="proxy-feedback" :class="{ 'is-error': failed }" :role="failed ? 'alert' : 'status'">{{ message }}</p>
  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { i18n } from '@/i18n'
import { useSettingsStore } from '@/stores/settingsStore'
import { saveProxySettings } from '@/services/desktop'
import { errorText } from '@/i18n/codes'

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
    message.value = enabled.value ? i18n.global.t('common.proxy.saved') : i18n.global.t('common.proxy.disabled')
  } catch (error) {
    failed.value = true
    message.value = errorText(error)
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
