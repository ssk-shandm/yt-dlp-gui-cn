<template>
  <Teleport to="body">
    <dialog ref="dialog" class="tool-dialog" aria-labelledby="tool-dialog-title" @cancel.prevent="tools.close()">
      <form @submit.prevent="tools.install()">
        <header class="dialog-header">
          <span class="section-eyebrow">{{ $t('tools.eyebrow') }}</span>
          <h2 id="tool-dialog-title">{{ state.status?.installed ? $t('tools.heading.manage') : $t('tools.heading.setup') }}</h2>
          <p>{{ $t('tools.intro') }}</p>
        </header>
        <fieldset :disabled="state.busy || state.checking" class="profile-options">
          <legend class="sr-only">{{ $t('tools.profileLegend') }}</legend>
          <label class="profile-card" :class="{ selected: state.profile === 'basic' }">
            <input v-model="state.profile" type="radio" value="basic" name="tool-profile" />
            <span class="profile-title">{{ $t('tools.profile.basic.title') }} <span class="profile-tag">{{ $t('tools.profile.basic.tag') }}</span></span>
            <span class="profile-license">{{ $t('tools.profile.basic.license') }}</span>
            <span>{{ $t('tools.profile.basic.description') }}</span>
            <small>{{ $t('tools.profile.basic.size') }}</small>
          </label>
          <label class="profile-card" :class="{ selected: state.profile === 'full' }">
            <input v-model="state.profile" type="radio" value="full" name="tool-profile" />
            <span class="profile-title">{{ $t('tools.profile.full.title') }}</span>
            <span class="profile-license">{{ $t('tools.profile.full.license') }}</span>
            <span>{{ $t('tools.profile.full.description') }}</span>
            <small>{{ $t('tools.profile.full.size') }}</small>
          </label>
        </fieldset>
        <p class="profile-note">{{ $t('tools.note') }}</p>
        <div v-if="state.message" class="install-status" role="status" aria-live="polite">
          <p>{{ toolText(state.message) }}</p>
          <p v-if="state.busy && state.speed" class="transfer-speed">{{ state.speed }}<span v-if="state.remaining"> · {{ toolText(state.remaining) }}</span></p>
          <progress v-if="state.busy" :value="state.progress ?? undefined" max="100" :aria-label="$t('tools.progressLabel')" />
        </div>
        <p v-if="state.error" class="install-error" role="alert">{{ toolText(state.error) }}</p>
        <footer class="dialog-actions">
          <button v-if="state.busy" type="button" class="secondary-action" :disabled="state.cancelling" @click="tools.cancel()">{{ state.cancelling ? $t('tools.cancelling') : $t('tools.cancel') }}</button>
          <button v-else type="button" class="secondary-action" @click="tools.close()">{{ state.status?.installed ? $t('tools.close') : $t('tools.later') }}</button>
          <button class="primary-action" type="submit" :disabled="state.busy || state.checking">{{ state.busy ? $t('tools.installing') : state.error ? $t('tools.retry') : $t('tools.install') }}</button>
        </footer>
        <p class="offline-note">{{ $t('tools.offlineNote') }}</p>
      </form>
    </dialog>
  </Teleport>
</template>
<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { tools, toolText } from '@/services/tools'
const state = tools.state
const dialog = ref<HTMLDialogElement>()
watchEffect(() => {
  if (!dialog.value) return
  if (state.visible && !dialog.value.open) dialog.value.showModal()
  else if (!state.visible && dialog.value.open) dialog.value.close()
})
</script>
<style scoped>
.tool-dialog { width: min(650px, calc(100vw - 36px)); max-height: calc(100dvh - 40px); border: 1px solid var(--ui-border); border-radius: 20px; padding: 30px; box-sizing: border-box; color: var(--ui-text); background: #fff; box-shadow: 0 24px 90px #102b4b33; overflow: auto; }
.tool-dialog::backdrop { background: #142b4b66; backdrop-filter: blur(3px); }
.dialog-header h2 { font-size: 23px; margin: 9px 0; letter-spacing: -.5px; }
.dialog-header p, .profile-note, .offline-note { color: var(--ui-text-muted); font-size: 12px; line-height: 1.8; }
.profile-options { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 22px 0 12px; padding: 0; border: 0; }
.profile-card { display: flex; flex-direction: column; gap: 10px; position: relative; padding: 20px 18px; border: 1px solid var(--ui-border); border-radius: 14px; background: #fbfdff; font-size: 12px; line-height: 1.8; cursor: pointer; transition: border-color 150ms, background 150ms; }
.profile-card.selected { border-color: var(--ui-accent); background: #edf5ff; box-shadow: 0 0 0 1px var(--ui-accent); }
.profile-card input { position: absolute; right: 16px; top: 22px; accent-color: var(--ui-accent); }
.profile-card:focus-within { outline: 3px solid #80b8f8; outline-offset: 3px; }
.profile-title { font-size: 17px; font-weight: 700; }
.profile-tag { color: var(--ui-accent); font-size: 10px; margin-left: 6px; }
.profile-license { color: var(--ui-accent); font-weight: 600; }
.profile-card small { color: var(--ui-text-muted); margin-top: auto; }
.profile-options:disabled .profile-card { cursor: wait; opacity: .75; }
.install-status { background: #edf5ff; border-radius: 10px; padding: 12px; color: var(--ui-accent); font-size: 12px; overflow-wrap: anywhere; }
.install-status p { margin: 0 0 5px; }
.install-status progress { width: 100%; accent-color: var(--ui-accent); }
.install-error { background: #fff0ee; color: #b53a2d; padding: 12px; font-size: 12px; line-height: 1.8; border-radius: 10px; white-space: pre-wrap; overflow-wrap: anywhere; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.dialog-actions button { padding: 10px 18px; border-radius: 9px; font: inherit; font-size: 13px; cursor: pointer; }
.primary-action { color: #fff; background: var(--ui-accent); border: 1px solid var(--ui-accent); }
.secondary-action { background: #fff; border: 1px solid var(--ui-border); color: var(--ui-text-muted); }
.dialog-actions button:disabled { opacity: .55; cursor: wait; }
.dialog-actions button:focus-visible { outline: 3px solid #80b8f8; outline-offset: 3px; }
.offline-note { font-size: 11px; margin: 15px 0 0; }
@media (max-width: 520px) { .profile-options { grid-template-columns: 1fr; } .tool-dialog { padding: 22px; } }
</style>
