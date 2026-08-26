<template>
  <div class="container">
    <div class="image-container">
      <p class="tip-text">开始使用：粘贴视频链接，然后点击「分析」按钮获取详细信息</p>
      <div class="image-viewer-wrapper">
        <t-image-viewer :images="[{ mainImage: img, download: false }]">
          <template #trigger="{ open }">
            <div class="image-display">
              <img
                alt="视频封面预览"
                :src="img"
                class="preview-img"
                referrerpolicy="no-referrer"
                :key="img"
              />
              <div
                class="preview-overlay"
                @click="open"
              >
                <span><BrowseIcon size="1.4em" />预览</span>
              </div>
            </div>
          </template>
        </t-image-viewer>
      </div>
    </div>
    <div class="url-input-section">
      <BBB
        @click="HA"
        class="analyze-btn"
        :disabled="!urlStore.currentUrl"
      >
        {{ formatStore.isLoading ? '分析中...' : '分析' }}
      </BBB>
      <t-input
        v-model="urlStore.currentUrl"
        autofocus
        placeholder="粘贴视频链接"
        type="url"
        size="large"
        clearable
        class="url-input"
      />
    </div>
    <div class="fast-download">
      <BBB
        @click="HQD"
        :disabled="!urlStore.analyzedUrl || urlStore.currentUrl !== urlStore.analyzedUrl"
      >
        快速下载
      </BBB>
      <p>默认下载视频和音频质量最好的版本</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useUrlStore } from '@/stores/urlStore'
import { BrowseIcon } from 'tdesign-icons-vue-next'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'
import BBB from '@/components/DiyButtom.vue'
import { useSettingsStore } from '@/stores/settingsStore'
import { useSubtitleStore } from '@/stores/subtitleStore'
import { useFormatStore } from '@/stores/formatStore'

const settingsStore = useSettingsStore()
const urlStore = useUrlStore()
const subtitleStore = useSubtitleStore()
const formatStore = useFormatStore()

const img = computed(() => urlStore.thumbnailUrl)

const HA = async () => {
  if (!urlStore.currentUrl) {
    NotificationPlugin.warning({ title: '提示', content: '请先粘贴视频链接' })
    return
  }

  if (!isValidUrl(urlStore.currentUrl)) {
    NotificationPlugin.warning({ title: '提示', content: '请输入有效的URL地址' })
    return
  }

  NotificationPlugin.info({ title: '分析中', content: '正在获取视频信息，请稍候...' })

  subtitleStore.startLoading()
  formatStore.startLoading()
  urlStore.analyzedUrl = urlStore.currentUrl

  window.eel.analyze_url(urlStore.currentUrl)
}

const HQD = () => {
  if (!urlStore.currentUrl || !urlStore.analyzedUrl || urlStore.currentUrl !== urlStore.analyzedUrl) {
    NotificationPlugin.warning({ title: '提示', content: '请先分析链接后再下载' })
    return
  }

  NotificationPlugin.info({ title: '下载开始', content: '下载任务已启动，请关注终端输出', duration: 5000 })
  window.eel.run_ytdlp(urlStore.currentUrl, settingsStore.retryTimes)
}

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
</script>

<style lang="scss" scoped>
.container {
  box-sizing: border-box;
  height: 90vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  justify-content: flex-start;
  padding: 3rem 1rem 1rem 1rem;
}

.image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.tip-text {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
  text-align: center;
}

.image-viewer-wrapper {
  width: 100%;
  max-width: 20rem;
  aspect-ratio: 16 / 9;
  border: 2px solid var(--td-bg-color-secondarycontainer);
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
  overflow: hidden;
}

.image-viewer-wrapper:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.image-display {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  justify-content: center;
  align-items: center;
  border-radius: 0.75rem;
  overflow: hidden;
}

.preview-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  transition: opacity 0.2s ease;
  cursor: pointer;
}

.image-display:hover .preview-overlay {
  opacity: 1;
}

.preview-img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  position: absolute;
}

.url-input-section {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.analyze-btn {
  flex-shrink: 0;
  min-width: 5rem;
}

.url-input {
  flex: 1;
  min-width: 15rem;
  max-width: 50rem;
}

.fast-download {
  display: flex;
  gap: 0.75rem;
  flex-direction: column;
  align-items: center;
}

.fast-download p {
  margin: 0;
  text-align: center;
  font-size: 0.8rem;
  color: #999;
}

@media (max-width: 768px) {
  .container {
    padding: 2rem 0.5rem 0.5rem 0.5rem;
  }

  .url-input-section {
    flex-direction: column;
  }

  .url-input {
    width: 100%;
    min-width: auto;
  }

  .image-viewer-wrapper {
    max-width: 100%;
  }
}
</style>
