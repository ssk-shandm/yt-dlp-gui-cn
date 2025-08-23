<template>
  <div class="container">
    <div class="image-container">
      <p>所有链接都要先分析！</p>
      <div class="tdesign-demo-image-viewer__base">
        <t-image-viewer :images="[{ mainImage: img, download: false }]">
          <template #trigger="{ open }">
            <div class="tdesign-demo-image-viewer__ui-image">
              <img
                alt="test"
                :src="img"
                class="tdesign-demo-image-viewer__ui-image--img"
                referrerpolicy="no-referrer"
                :key="img"
              />
              <div
                class="tdesign-demo-image-viewer__ui-image--hover"
                @click="open"
              >
                <span> <BrowseIcon size="1.4em" /> 预览 </span>
              </div>
            </div>
          </template>
        </t-image-viewer>
      </div>
    </div>
    <div class="URL-input">
      <BBB
        @click="HA"
        style="width: 5rem"
        >分析</BBB
      >
      <t-input
        v-model="urlStore.currentUrl"
        autofocus
        placeholder="粘贴视频链接"
        type="url"
        size="large"
      />
    </div>
    <div class="fast-download">
      <BBB @click="HQD">快速下载</BBB>
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

// 实例
const settingsStore = useSettingsStore()
const urlStore = useUrlStore()
const subtitleStore = useSubtitleStore()
const formatStore = useFormatStore()

// 获取图片
const img = computed(() => urlStore.thumbnailUrl)

// 分析链接
const HA = async () => {
  if (!urlStore.currentUrl) {
    NotificationPlugin.warning({ title: '操作提示', content: '叫你先填地址后再分析就是不听！' })
    return
  }
  NotificationPlugin.info({ title: '系统提示', content: '分析中，请稍候...' })

  // 设置加载状态
  subtitleStore.startLoading()
  formatStore.startLoading()

  // 存储 url
  urlStore.analyzedUrl = urlStore.currentUrl

  window.eel.analyze_url(urlStore.currentUrl)
}

// 快速下载
const HQD = async () => {
  if (!urlStore.currentUrl || !urlStore.analyzedUrl || urlStore.currentUrl !== urlStore.analyzedUrl) {
    NotificationPlugin.warning({ title: '操作提示', content: '叫你链接进行分析就是不听！' })
    return
  }

  let loadingNotify = null
  try {
    loadingNotify = NotificationPlugin.info({ title: '系统提示', content: '下载中，请稍候...', duration: 0 })
    const result = await window.eel.run_ytdlp(urlStore.currentUrl, settingsStore.retryTimes)
    NotificationPlugin.close(loadingNotify)
    if (result && result.status === 'success') {
      NotificationPlugin.success({ title: '下载成功', content: result.message || '下载完成！' })
    } else {
      NotificationPlugin.error({ title: '下载失败', content: result.message || '下载失败，请检查终端输出。' })
    }
  } catch (e) {
    if (loadingNotify) {
      NotificationPlugin.close(loadingNotify)
    }
    NotificationPlugin.error({ title: '严重错误', content: '通信错误。' })
    console.error('出现错误:', e)
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
  padding-top: 8vh;
}

.URL-input {
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  position: relative;
}
p {
  font-size: 0.8rem;
  color: #888;
}
.URL-input p {
  top: 100%;
  margin-top: 0.5rem;
}

.fast-download {
  display: flex;
  gap: 0.75rem;
  flex-direction: column;
  align-items: center;
  margin-top: 1.25rem;
}

.fast-download p {
  margin: 0;
  text-align: center;
}

.container :deep(.t-input__wrap) {
  width: 100%;
  max-width: 50rem;
}

.container :deep(.t-input) {
  width: auto;
}

.image-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tdesign-demo-image-viewer__base {
  width: 90%;
  max-width: 20rem;
  height: calc((320px * 9) / 16);
  margin: 0.625rem;
  border: 4px solid var(--td-bg-color-secondarycontainer);
  border-radius: 1.25rem;
}

.tdesign-demo-image-viewer__ui-image {
  width: 100%;
  height: 100%;
  display: inline-flex;
  position: relative;
  justify-content: center;
  align-items: center;
  border-radius: var(--td-radius-small);
  overflow: hidden;
}

.tdesign-demo-image-viewer__ui-image--hover {
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
  color: var(--td-text-color-anti);
  line-height: 1.375rem;
  transition: 0.2s;
}

.tdesign-demo-image-viewer__ui-image:hover .tdesign-demo-image-viewer__ui-image--hover {
  opacity: 1;
  cursor: pointer;
}

.tdesign-demo-image-viewer__ui-image--img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: 100%;
  cursor: pointer;
  position: absolute;
}
</style>
