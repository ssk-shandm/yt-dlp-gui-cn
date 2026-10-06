<template>
  <section class="link-page surface-card">
    <div class="image-container">
      <div class="preview-heading">
        <span class="section-eyebrow">视频封面</span
        ><span class="preview-status">{{
          formatStore.isLoading ? '正在获取信息' : hasThumbnail ? '已获取封面' : '等待分析'
        }}</span>
      </div>
      <div
        class="image-viewer-wrapper"
        :class="{ 'is-loading': formatStore.isLoading }"
        :aria-busy="formatStore.isLoading"
      >
        <t-image-viewer
          v-if="hasThumbnail"
          :images="[{ mainImage: img, download: false }]"
        >
          <template #trigger="{ open }">
            <button
              class="image-display"
              type="button"
              aria-label="预览视频封面"
              @click="open"
            >
              <img
                alt="视频封面预览"
                :src="img"
                class="preview-img"
                referrerpolicy="no-referrer"
                :key="img"
                @error="imageFailed = true"
              />
              <span class="preview-overlay"><BrowseIcon size="1.4em" />放大预览</span>
            </button>
          </template>
        </t-image-viewer>
        <div
          v-else
          class="empty-preview"
          role="status"
          aria-live="polite"
        >
          <span
            class="empty-icon"
            :class="{ 'is-spinning': formatStore.isLoading }"
            ><component
              :is="formatStore.isLoading ? LoadingIcon : BrowseIcon"
              size="28px"
          /></span>
          <strong>{{
            formatStore.isLoading ? '正在分析视频…' : imageFailed ? '封面暂时无法加载' : '暂无视频封面'
          }}</strong>
          <p>
            {{
              formatStore.isLoading
                ? '正在读取封面、格式与字幕信息'
                : imageFailed
                  ? '视频信息仍可用于下载，请检查网络后重试'
                  : '粘贴链接并分析后，封面将在这里显示'
            }}
          </p>
        </div>
      </div>
    </div>
    <form
      class="url-form"
      @submit.prevent="HA"
    >
      <span class="form-label">视频链接</span>
      <div class="url-input-section">
        <label class="url-input"
          ><span class="sr-only">视频链接</span
          ><t-input
            id="video-url"
            v-model="urlStore.currentUrl"
            placeholder="粘贴视频链接，例如 https://…"
            type="url"
            size="large"
            clearable
        /></label>
        <BBB
          type="submit"
          class="analyze-btn"
          :disabled="!urlStore.currentUrl.trim() || formatStore.isLoading"
        >
          <LoadingIcon
            v-if="formatStore.isLoading"
            class="is-spinning"
          />{{ formatStore.isLoading ? '分析中…' : '分析链接' }}
        </BBB>
      </div>
      <p class="input-hint">按 Enter 即可分析 · 分析完成后可前往「内容处理」选择格式</p>
    </form>
    <div class="fast-download">
      <div>
        <strong>一键获取最佳质量</strong>
        <p>自动选择最佳视频与音频，无需手动配置。</p>
      </div>
      <BBB
        class="quick-btn"
        @click="HQD"
        :disabled="formatStore.isLoading || !urlStore.analyzedUrl || urlStore.currentUrl !== urlStore.analyzedUrl"
        ><DownloadIcon />快速下载</BBB
      >
    </div>
  </section>
</template>
<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useUrlStore } from '@/stores/urlStore'
import { BrowseIcon, LoadingIcon, DownloadIcon } from 'tdesign-icons-vue-next'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'
import BBB from '@/components/DiyButtom.vue'
import { analyzeVideo, startDownload } from '@/services/desktop'
import { useFormatStore } from '@/stores/formatStore'

const urlStore = useUrlStore()
const formatStore = useFormatStore()

const img = computed(() => urlStore.thumbnailUrl)
const imageFailed = ref(false)
const hasThumbnail = computed(() => Boolean(img.value) && !imageFailed.value)
watch(img, () => {
  imageFailed.value = false
})

const HA = async () => {
  if (!urlStore.currentUrl) {
    NotificationPlugin.warning({ title: '提示', content: '请先粘贴视频链接' })
    return
  }

  if (!isValidUrl(urlStore.currentUrl)) {
    NotificationPlugin.warning({ title: '提示', content: '请输入有效的URL地址' })
    return
  }

  if (formatStore.isLoading) return
  NotificationPlugin.info({ title: '分析中', content: '正在获取视频信息，请稍候...' })

  await analyzeVideo(urlStore.currentUrl)
}

const HQD = () => {
  if (!urlStore.currentUrl || !urlStore.analyzedUrl || urlStore.currentUrl !== urlStore.analyzedUrl) {
    NotificationPlugin.warning({ title: '提示', content: '请先分析链接后再下载' })
    return
  }

  NotificationPlugin.info({ title: '下载开始', content: '下载任务已启动，请关注终端输出', duration: 5000 })
  void startDownload({ url: urlStore.currentUrl, kind: 'quick' })
}

const isValidUrl = (url: string): boolean => {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol)
  } catch {
    return false
  }
}
</script>
<style scoped>
.link-page {
  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding: clamp(24px, 4vw, 48px);
}
.image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  justify-content: center;
  gap: 14px;
}
.preview-heading {
  width: min(100%, 520px);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.preview-status {
  font-size: 11px;
  color: var(--ui-text-muted);
}
.image-viewer-wrapper {
  width: min(100%, 520px);
  aspect-ratio: 16 / 9;
  border: 1px dashed #cfdeee;
  border-radius: 16px;
  background: linear-gradient(135deg, #f6f9fe, #edf4fc);
  overflow: hidden;
  position: relative;
  transition:
    box-shadow var(--motion-duration) ease,
    border-color var(--motion-duration) ease;
}
.image-viewer-wrapper:hover {
  border-color: #91b9e9;
  box-shadow: 0 8px 28px rgba(23, 107, 204, 0.08);
}
.empty-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  padding: 20px;
  box-sizing: border-box;
}
.empty-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  color: var(--ui-accent);
  border-radius: 18px;
  background: #e3eefe;
  transition: transform var(--motion-duration) ease;
}
.image-viewer-wrapper:hover .empty-icon:not(.is-spinning) {
  transform: translateY(-3px);
}
.empty-preview strong {
  font-size: 15px;
  font-weight: 600;
}
.empty-preview p {
  color: var(--ui-text-muted);
  font-size: 12px;
  margin: 0;
  line-height: 1.7;
}
.is-loading::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 20%, rgba(255, 255, 255, 0.5) 50%, transparent 80%);
  animation: shimmer 1.6s ease-in-out infinite;
  pointer-events: none;
}
.image-viewer-wrapper :deep(.t-image-viewer__trigger) {
  display: block;
  height: 100%;
  width: 100%;
}
.image-display {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  padding: 0;
  background: #eef3f9;
  cursor: zoom-in;
}
.preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  animation: reveal 240ms ease;
}
.preview-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: white;
  background: rgba(20, 35, 55, 0.45);
  opacity: 0;
  transition: opacity var(--motion-duration) ease;
}
.image-display:hover .preview-overlay,
.image-display:focus-visible .preview-overlay {
  opacity: 1;
}
.url-form {
  width: min(100%, 760px);
  margin: 0 auto;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}
.url-input-section {
  display: flex;
  gap: 12px;
  align-items: center;
}
.url-input {
  flex: 1;
  min-width: 0;
}
.url-input :deep(.t-input) {
  height: 46px;
  border-radius: 10px;
}
.analyze-btn {
  min-height: 46px;
  flex-shrink: 0;
  background: var(--ui-accent);
  color: white;
  border-color: var(--ui-accent);
}
.analyze-btn:not(:disabled):hover {
  background: #125cae;
  color: white;
}
.input-hint {
  font-size: 11px;
  color: var(--ui-text-muted);
  margin: 10px 0 0;
  line-height: 1.7;
}
.fast-download {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  width: min(100%, 760px);
  margin: 0 auto;
  padding-top: 24px;
  border-top: 1px solid var(--ui-border);
}
.fast-download strong {
  font-size: 13px;
  font-weight: 600;
}
.fast-download p {
  font-size: 12px;
  color: var(--ui-text-muted);
  margin: 8px 0 0;
  line-height: 1.6;
}
.quick-btn {
  flex-shrink: 0;
  min-height: 40px;
}
.is-spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@keyframes shimmer {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
}
@keyframes reveal {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@media (max-width: 760px) {
  .link-page {
    padding: 22px;
    gap: 24px;
  }
  .fast-download {
    flex-wrap: wrap;
  }
}
@media (max-width: 520px) {
  .url-input-section {
    flex-wrap: wrap;
  }
  .url-input {
    flex-basis: 100%;
  }
  .analyze-btn {
    width: 100%;
  }
  .empty-icon {
    width: 42px;
    height: 42px;
  }
  .empty-preview {
    gap: 8px;
  }
}
</style>
