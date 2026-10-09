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
      <div class="tool-info">
        <p>MIT 仅适用于 GUI 自有代码；第三方原始版权通知、许可证及 MPL 组件源码随安装包保留。</p>
        <p>本应用使用 Microsoft WebView2 Evergreen：缺失时安装器从 Microsoft 下载，运行时由 Microsoft 独立维护和更新，卸载 GUI 不移除共享运行时。</p>
        <p>WebView2 使用 Microsoft Defender SmartScreen，可能收集并向 Microsoft 发送用户信息；Microsoft 独立条款和隐私说明见随包安装告知。</p>
        <button type="button" class="link-btn" @click="showGuiLicenses">GUI 版权通知、源码与 WebView2 条款</button>
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
          <span class="section-eyebrow">偏好设置</span>
          <h2>设置</h2>
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
          <button class="update-action" data-guide="check-updates" type="button" :disabled="updateBusy || toolManager.busy" @click="appUpdater.checkAndInstall()">
            {{ updateBusy ? '更新处理中…' : '检查并安装更新' }}
          </button>
        </div>
      </div>
      <div v-if="updateState.message" class="update-status" :class="{ 'is-error': updateState.phase === 'error' }" role="status" aria-live="polite">
        <p>{{ updateState.message }}</p>
        <progress v-if="updateState.phase === 'downloading'" :value="updateState.progress ?? undefined" max="100" aria-label="更新下载进度" />
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
      <div class="section-heading"><div><span class="section-eyebrow">第三方工具</span><h2>下载工具</h2></div><span class="section-mark" aria-hidden="true">03</span></div>
      <div class="tool-info">
        <p class="tool-profile">{{ toolManager.checking ? '正在检测工具…' : toolManager.status?.installed ? toolManager.status.profile === 'full' ? '已安装完整版 · FFmpeg GPL' : toolManager.status.profile === 'basic' ? '已安装基础版 · FFmpeg LGPL' : '已检测到现有工具 · 构建类型未标记' : '尚未安装可用工具' }}</p>
        <p>yt-dlp：{{ toolManager.status?.ytdlpVersion || '未检测到' }}</p>
        <p>FFmpeg：{{ toolManager.status?.ffmpegVersion || '未检测到' }}</p>
        <p>ffprobe：{{ toolManager.status?.ffprobeVersion || '未检测到' }}</p>
        <p>工具目录：<code>{{ toolManager.status?.binPath || '主程序所在目录 / bin' }}</code></p>
        <p v-if="toolManager.status?.missing.length">缺少文件：{{ toolManager.status.missing.join('、') }}</p>
        <p>安装后可离线调用工具；解析和视频下载仍需要访问对应网站。</p>
      </div>
      <div class="tool-actions">
        <button type="button" class="update-action" data-guide="install-tools" :disabled="toolManager.checking || toolManager.busy || updateBusy" @click="tools.open()">{{ toolManager.status?.installed ? '重新选择工具版本' : '安装工具' }}</button>
        <button type="button" class="update-action" :disabled="toolManager.busy || toolManager.checking || updateBusy || toolManager.status?.profile === 'full'" @click="tools.open('full')">{{ toolManager.status?.profile === 'full' ? '完整版已安装' : '下载完整版' }}</button>
        <button type="button" class="link-btn" :disabled="toolManager.busy || toolManager.checking" @click="tools.refresh()">刷新状态</button>
        <button type="button" class="link-btn" @click="showLicenses">第三方许可证与安装记录</button>
      </div>
      <div class="tool-links"><button class="link-btn" @click="openLink(YTDLP_URL)">yt-dlp 上游</button><button class="link-btn" @click="openLink(FFMPEG_URL)">FFmpeg 上游</button><button class="link-btn" @click="openLink(FFMPEG_BUILDS_URL)">Windows 构建供应方</button></div>
      <div v-if="toolManager.message" class="update-status" role="status" aria-live="polite"><p>{{ toolManager.message }}</p><progress v-if="toolManager.busy" :value="toolManager.progress ?? undefined" max="100" aria-label="工具安装进度" /></div>
      <p v-if="toolManager.error" class="open-error" role="alert">{{ toolManager.error }}</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ProxySettings from '@/components/ProxySettings.vue'
import { tools, toolManager, openToolLicenses, openGuiLicenses } from '@/services/tools'
import { appUpdater } from '@/services/updater'
import { IconLaunch } from '@arco-design/web-vue/es/icon'
import { APP_VERSION, COPYRIGHT_LINE, LICENSE_NAME, LICENSE_URL, RELEASES_URL, REPOSITORY_URL, YTDLP_URL, FFMPEG_URL, FFMPEG_BUILDS_URL } from '@/config/appInfo'
import { openExternalUrl } from '@/services/openExternal'

const updateState = appUpdater.state
const updateBusy = computed(() => ['checking', 'waiting', 'downloading', 'installing'].includes(updateState.phase))
const openError = ref('')
onMounted(() => { appUpdater.initializePreference(); void tools.refresh() })
async function showGuiLicenses() {
  openError.value = ''
  try { await openGuiLicenses() }
  catch (error) { openError.value = String(error) }
}
async function showLicenses() {
  try { await openToolLicenses() }
  catch (error) { openError.value = String(error) }
}

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
