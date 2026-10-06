<template>
  <section class="about-page surface-card">
    <section class="about-section">
      <div class="section-heading">
        <div>
          <span class="section-eyebrow">项目详情</span>
          <h2>项目基本信息</h2>
        </div>
        <span
          class="section-mark"
          aria-hidden="true"
          >01</span
        >
      </div>
      <dl class="about-list">
        <div>
          <dt>版本号</dt>
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
          <dt>版权</dt>
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
          <dt>许可证</dt>
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
          <dt>项目仓库</dt>
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
          <span class="section-eyebrow">偏好设置</span>
          <h2>设置</h2>
        </div>
        <span
          class="section-mark"
          aria-hidden="true"
          >02</span
        >
      </div>
      <div class="settings-list">
        <div class="setting-row">
          <div class="setting-copy">
            <h3>自动检测更新</h3>
            <p>启动时检查项目的 GitHub Releases；发现新正式版后自动下载并安装，有任务运行时会延后安装。</p>
          </div>
          <label class="switch-control">
            <span class="sr-only">打开项目自动检测更新</span>
            <input
              v-model="updateState.autoCheck"
              type="checkbox"
              aria-label="打开项目自动检测更新"
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
            <h3>手动更新</h3>
            <p>无需打开自动更新，也可以手动检查并安装最新正式版。安装完成后会重新启动。</p>
          </div>
          <button class="update-action" type="button" :disabled="updateBusy" @click="appUpdater.checkAndInstall()">
            {{ updateBusy ? '更新处理中…' : '检查并安装更新' }}
          </button>
        </div>
        <div class="setting-row is-disabled">
          <div class="setting-copy">
            <h3>下载 FFmpeg 完整版</h3>
            <p>保留完整版下载入口，暂不执行下载。后续将 FFmpeg / FFprobe 配套存入主程序同级 bin 文件夹，不嵌入主 EXE。</p>
          </div>
          <button
            class="setting-action"
            type="button"
            disabled
          >
            暂未启用
          </button>
        </div>
      </div>
      <div v-if="updateState.message" class="update-status" :class="{ 'is-error': updateState.phase === 'error' }" role="status" aria-live="polite">
        <p>{{ updateState.message }}</p>
        <progress v-if="updateState.phase === 'downloading'" :value="updateState.progress ?? undefined" max="100" aria-label="更新下载进度" />
        <span v-if="updateState.phase === 'downloading' && updateState.progress !== null">{{ updateState.progress }}%</span>
      </div>
      <div class="tool-info">
        <p>{{ toolInfo?.ffmpegVersion || '在桌面端可查看本机 FFmpeg 构建信息。' }}</p>
        <p>工具目录：<code>{{ toolInfo?.binPath || '主程序所在目录 / bin' }}</code></p>
        <p v-if="toolError">{{ toolError }}</p>
      </div>
      <p
        v-if="updateState.preferenceError"
        class="open-error"
        role="alert"
      >
        {{ updateState.preferenceError }}
      </p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { appUpdater } from '@/services/updater'
import { IconLaunch } from '@arco-design/web-vue/es/icon'
import { APP_VERSION, COPYRIGHT_LINE, LICENSE_NAME, LICENSE_URL, RELEASES_URL, REPOSITORY_URL } from '@/config/appInfo'
import { openExternalUrl } from '@/services/openExternal'

const updateState = appUpdater.state
const updateBusy = computed(() => ['checking', 'waiting', 'downloading', 'installing'].includes(updateState.phase))
const openError = ref('')
const toolInfo = ref<{ binPath: string; ffmpegVersion: string }>()
const toolError = ref('')
onMounted(async () => {
  appUpdater.initializePreference()
  if (!isTauri()) return
  try { toolInfo.value = await invoke('get_tool_info') }
  catch (error) { toolError.value = String(error) }
})

async function openLink(url: string) {
  openError.value = ''
  try {
    await openExternalUrl(url)
  } catch (error) {
    openError.value = error instanceof Error ? error.message : '无法打开链接，请稍后重试。'
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
.setting-row:hover:not(.is-disabled) {
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
.setting-action {
  flex: 0 0 auto;
  border: 1px solid var(--ui-border);
  border-radius: 9px;
  padding: 8px 12px;
  color: var(--ui-text-muted);
  background: #f1f5fa;
  font-size: 12px;
  cursor: not-allowed;
}
.setting-row.is-disabled {
  opacity: 0.72;
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
.tool-info { margin-top: 14px; font-size: 11px; line-height: 1.7; color: var(--ui-text-muted); overflow-wrap: anywhere; }
.tool-info p { margin: 4px 0; }
.tool-info code { font: inherit; }
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
  .setting-action,
  .update-action {
    margin-top: 14px;
  }
}
</style>
