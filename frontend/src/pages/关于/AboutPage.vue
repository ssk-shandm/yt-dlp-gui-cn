<template>
  <section class="about-page surface-card">
    <section class="about-section">
      <div class="section-heading">
        <div>
          <span class="section-eyebrow">{{ $t('about.eyebrowDetails') }}</span>
          <h2>{{ $t('about.basicInfo') }}</h2>
        </div>
        <span
          class="section-mark"
          aria-hidden="true"
          >01</span
        >
      </div>
      <dl class="about-list">
        <div>
          <dt>{{ $t('about.version') }}</dt>
          <dd>
            <button
              class="link-btn"
              @click="openLink(RELEASES_URL)"
            >
              v{{ APP_VERSION }} <IconLaunch aria-hidden="true" />
            </button>
          </dd>
        </div>
        <div>
          <dt>{{ $t('about.copyright') }}</dt>
          <dd>
            <button
              class="link-btn"
              @click="openLink(REPOSITORY_URL)"
            >
              {{ COPYRIGHT_LINE }}
            </button>
          </dd>
        </div>
        <div>
          <dt>{{ $t('about.license') }}</dt>
          <dd>
            <button
              class="link-btn"
              @click="openLink(LICENSE_URL)"
            >
              {{ LICENSE_NAME }} <IconLaunch aria-hidden="true" />
            </button>
          </dd>
        </div>
        <div>
          <dt>{{ $t('about.repository') }}</dt>
          <dd>
            <button
              class="link-btn repository-link"
              @click="openLink(REPOSITORY_URL)"
            >
              {{ REPOSITORY_URL }} <IconLaunch aria-hidden="true" />
            </button>
          </dd>
        </div>
      </dl>
      <div class="tool-info">
        <p>{{ $t('about.licenseNotice') }}</p>
        <p>{{ $t('about.webview2Notice') }}</p>
        <p>{{ $t('about.smartScreenNotice') }}</p>
        <button type="button" class="link-btn" @click="showGuiLicenses">{{ $t('about.guiLicenses') }}</button>
      </div>
      <p
        v-if="openError"
        class="open-error"
        role="alert"
      >
        {{ openError }}
      </p>
    </section>

    <section class="about-section settings-section">
      <div class="section-heading">
        <div>
          <span class="section-eyebrow">{{ $t('about.eyebrowPreferences') }}</span>
          <h2>{{ $t('about.settings') }}</h2>
        </div>
        <span
          class="section-mark"
          aria-hidden="true"
          >02</span
        >
      </div>
      <ProxySettings />
      <div class="settings-list">
        <div class="setting-row">
          <div class="setting-copy">
            <h3>{{ $t('about.autoUpdate.title') }}</h3>
            <p>{{ $t('about.autoUpdate.description') }}</p>
          </div>
          <label class="switch-control">
            <span class="sr-only">{{ $t('about.autoUpdate.switchLabel') }}</span>
            <input
              v-model="updateState.autoCheck"
              type="checkbox"
              :aria-label="$t('about.autoUpdate.switchLabel')"
              @change="appUpdater.savePreference"
            />
            <span
              class="switch-track"
              aria-hidden="true"
              ><span
            /></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-copy">
            <h3>{{ $t('about.manualUpdate.title') }}</h3>
            <p>{{ $t('about.manualUpdate.description') }}</p>
          </div>
          <button class="update-action" data-guide="check-updates" type="button" :disabled="updateBusy || toolManager.busy" @click="appUpdater.checkAndInstall()">
            {{ updateBusy ? $t('about.manualUpdate.busy') : $t('about.manualUpdate.action') }}
          </button>
        </div>
      </div>
      <div v-if="updateState.message" class="update-status" :class="{ 'is-error': updateState.phase === 'error' }" role="status" aria-live="polite">
        <p>{{ updateState.message }}</p>
        <progress v-if="updateState.phase === 'downloading'" :value="updateState.progress ?? undefined" max="100" :aria-label="$t('about.updateProgress')" />
        <span v-if="updateState.phase === 'downloading' && updateState.progress !== null">{{ updateState.progress }}%</span>
      </div>
      <p
        v-if="updateState.preferenceError"
        class="open-error"
        role="alert"
      >
        {{ updateState.preferenceError }}
      </p>
    </section>

    <section class="about-section tools-section">
      <div class="section-heading"><div><span class="section-eyebrow">{{ $t('about.eyebrowTools') }}</span><h2>{{ $t('about.downloadTools') }}</h2></div><span class="section-mark" aria-hidden="true">03</span></div>
      <div class="tool-info">
        <p class="tool-profile">{{ toolProfileText }}</p>
        <p>{{ $t('about.ytdlpVersion', { version: toolManager.status?.ytdlpVersion || $t('about.notDetected') }) }}</p>
        <p>{{ $t('about.ffmpegVersion', { version: toolManager.status?.ffmpegVersion || $t('about.notDetected') }) }}</p>
        <p>{{ $t('about.ffprobeVersion', { version: toolManager.status?.ffprobeVersion || $t('about.notDetected') }) }}</p>
        <p>{{ $t('about.toolDirectory') }}<code>{{ toolManager.status?.binPath || $t('about.defaultBinPath') }}</code></p>
        <p v-if="toolManager.status?.missing.length">{{ $t('about.missingFiles', { files: toolManager.status.missing.join($t('about.listSeparator')) }) }}</p>
        <p>{{ $t('about.offlineNote') }}</p>
      </div>
      <div class="tool-actions">
        <button type="button" class="update-action" data-guide="install-tools" :disabled="toolManager.checking || toolManager.busy || updateBusy" @click="tools.open()">{{ toolManager.status?.installed ? $t('about.reinstallTools') : $t('about.installTools') }}</button>
        <button type="button" class="update-action" :disabled="toolManager.busy || toolManager.checking || updateBusy || toolManager.status?.profile === 'full'" @click="tools.open('full')">{{ toolManager.status?.profile === 'full' ? $t('about.fullInstalled') : $t('about.downloadFull') }}</button>
        <button type="button" class="link-btn" :disabled="toolManager.busy || toolManager.checking" @click="tools.refresh()">{{ $t('about.refreshStatus') }}</button>
        <button type="button" class="link-btn" @click="showLicenses">{{ $t('about.toolLicenses') }}</button>
      </div>
      <div class="tool-links"><button class="link-btn" @click="openLink(YTDLP_URL)">{{ $t('about.upstream.ytdlp') }}</button><button class="link-btn" @click="openLink(FFMPEG_URL)">{{ $t('about.upstream.ffmpeg') }}</button><button class="link-btn" @click="openLink(FFMPEG_BUILDS_URL)">{{ $t('about.upstream.builds') }}</button></div>
      <div v-if="toolManager.message" class="update-status" role="status" aria-live="polite"><p>{{ toolText(toolManager.message) }}</p><progress v-if="toolManager.busy" :value="toolManager.progress ?? undefined" max="100" :aria-label="$t('about.toolProgress')" /></div>
      <p v-if="toolManager.error" class="open-error" role="alert">{{ toolText(toolManager.error) }}</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ProxySettings from '@/components/ProxySettings.vue'
import { tools, toolManager, toolText, openToolLicenses, openGuiLicenses } from '@/services/tools'
import { appUpdater } from '@/services/updater'
import { IconLaunch } from '@arco-design/web-vue/es/icon'
import { APP_VERSION, COPYRIGHT_LINE, LICENSE_NAME, LICENSE_URL, RELEASES_URL, REPOSITORY_URL, YTDLP_URL, FFMPEG_URL, FFMPEG_BUILDS_URL } from '@/config/appInfo'
import { openExternalUrl } from '@/services/openExternal'
import { errorText } from '@/i18n/codes'

const { t } = useI18n()
const updateState = appUpdater.state
const updateBusy = computed(() => ['checking', 'waiting', 'downloading', 'installing'].includes(updateState.phase))
const toolProfileText = computed(() => {
  if (toolManager.checking) return t('about.toolProfile.checking')
  if (!toolManager.status?.installed) return t('about.toolProfile.none')
  if (toolManager.status.profile === 'full') return t('about.toolProfile.full')
  if (toolManager.status.profile === 'basic') return t('about.toolProfile.basic')
  return t('about.toolProfile.unlabeled')
})
const openError = ref('')
onMounted(() => { appUpdater.initializePreference(); void tools.refresh() })
async function showGuiLicenses() {
  openError.value = ''
  try { await openGuiLicenses() }
  catch (error) { openError.value = errorText(error) }
}
async function showLicenses() {
  try { await openToolLicenses() }
  catch (error) { openError.value = errorText(error) }
}

async function openLink(url: string) {
  openError.value = ''
  try {
    await openExternalUrl(url)
  } catch (error) {
    openError.value = error instanceof Error ? error.message : t('about.openFallbackError')
  }
}
</script>

<style scoped>
.about-page {
  max-width: 820px;
  margin: 0 auto;
  padding: 28px clamp(24px, 4vw, 48px) 34px;
  box-sizing: border-box;
}
.about-section + .about-section {
  margin-top: 34px;
  padding-top: 30px;
  border-top: 1px solid var(--ui-border);
}
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.section-heading h2 {
  margin: 8px 0 0;
  font-size: 21px;
  letter-spacing: -0.4px;
}
.section-mark {
  color: var(--ui-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.65;
}
.about-list {
  margin: 24px 0 0;
  border-top: 1px solid var(--ui-border);
}
.about-list > div {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 18px;
  padding: 17px 4px;
  border-bottom: 1px solid var(--ui-border);
  font-size: 13px;
  align-items: center;
  transition: background-color var(--motion-duration) ease;
}
.about-list > div:hover {
  background: #f8fbff;
}
dt {
  color: var(--ui-text-muted);
}
dd {
  margin: 0;
  text-align: right;
  min-width: 0;
}
.link-btn {
  border: 0;
  background: none;
  color: var(--ui-accent);
  padding: 0;
  font: inherit;
  text-align: right;
  cursor: pointer;
  line-height: 1.8;
}
.link-btn svg {
  vertical-align: -2px;
  margin-left: 4px;
}
.link-btn:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.repository-link {
  overflow-wrap: anywhere;
}
.open-error {
  padding: 12px;
  margin: 16px 0 0;
  background: #fff0ee;
  color: #b53a2d;
  border-radius: 8px;
  font-size: 12px;
}
.settings-list {
  margin-top: 24px;
  border: 1px solid var(--ui-border);
  border-radius: 14px;
  overflow: hidden;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 19px 18px;
  background: #fbfdff;
  transition:
    background-color var(--motion-duration) ease,
    opacity var(--motion-duration) ease;
}
.setting-row + .setting-row {
  border-top: 1px solid var(--ui-border);
}
.setting-row:hover {
  background: #f5f9ff;
}
.setting-copy {
  min-width: 0;
}
.setting-copy h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 650;
}
.setting-copy p {
  margin: 7px 0 0;
  color: var(--ui-text-muted);
  font-size: 12px;
  line-height: 1.7;
}
.switch-control {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  cursor: pointer;
}
.switch-control input {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.switch-track {
  display: inline-flex;
  align-items: center;
  width: 44px;
  height: 24px;
  padding: 3px;
  border-radius: 999px;
  background: #d6e0ec;
  box-sizing: border-box;
  transition: background-color var(--motion-duration) ease;
}
.switch-track span {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(35, 55, 85, 0.2);
  transition: transform var(--motion-duration) ease;
}
.switch-control input:checked + .switch-track {
  background: var(--ui-accent);
}
.switch-control input:checked + .switch-track span {
  transform: translateX(20px);
}
.switch-control input:focus-visible + .switch-track {
  outline: 3px solid #80b8f8;
  outline-offset: 3px;
}
.update-action {
  flex: 0 0 auto;
  padding: 9px 13px;
  border: 1px solid var(--ui-accent);
  border-radius: 9px;
  background: var(--ui-accent);
  color: #fff;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: opacity var(--motion-duration) ease, transform var(--motion-duration) ease;
}
.update-action:hover:not(:disabled) { transform: translateY(-1px); }
.update-action:disabled { opacity: 0.55; cursor: wait; }
.update-action:focus-visible { outline: 3px solid #80b8f8; outline-offset: 3px; }
.update-status { margin-top: 16px; padding: 12px 14px; border-radius: 10px; background: #edf5ff; color: var(--ui-accent); font-size: 12px; }
.update-status p { margin: 0 0 6px; line-height: 1.7; overflow-wrap: anywhere; }
.update-status progress { width: min(260px, 100%); accent-color: var(--ui-accent); margin-right: 10px; }
.update-status.is-error { background: #fff0ee; color: #b53a2d; }
.tool-info { margin-top: 20px; font-size: 12px; line-height: 1.7; color: var(--ui-text-muted); overflow-wrap: anywhere; }
.tool-info p { margin: 4px 0; }
.tool-info code { font: inherit; }
.tool-profile { font-weight: 650; color: var(--ui-accent); font-size: 14px; }
.tool-actions, .tool-links { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 16px; }
@media (max-width: 760px) {
  .about-page {
    padding: 24px 22px 28px;
  }
  .setting-row {
    align-items: flex-start;
  }
}
@media (max-width: 520px) {
  .about-list > div {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  dd,
  .link-btn {
    text-align: left;
  }
  .setting-row {
    display: block;
  }
  .switch-control,
  .update-action {
    margin-top: 14px;
  }
}
</style>
