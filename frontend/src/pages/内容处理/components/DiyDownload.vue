<template>
  <BOX title="DIY下载">
    <div class="container">
      <div class="command-preview">
        <div class="select-group">
          <div class="select-item">
            <label class="select-label">视频质量</label>
            <DiySelect
              v-model="selectedVideoId"
              :options="videoQualityOptions"
              class="select-input"
            />
          </div>
          <div class="select-item">
            <label class="select-label">音频质量</label>
            <DiySelect
              v-model="selectedAudioId"
              :options="audioQualityOptions"
              class="select-input"
            />
          </div>
          <div class="select-item">
            <label class="select-label">输出格式</label>
            <DiySelect
              v-model="selectedContainerFormat"
              :options="containerFormatOptions"
              class="select-input"
            />
          </div>
        </div>
        <BBB
          class="download-btn"
          @click="handleDownload"
        >
          下载
        </BBB>
      </div>

      <p class="cpu-warning">此下载方式可能会占用极高的cpu</p>
    </div>
  </BOX>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import DiySelect from '@/components/TxSelect.vue'
import BOX from '@/components/BoxStyle.vue'
import BBB from '@/components/DiyButtom.vue'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'
import { useUrlStore } from '@/stores/urlStore'
import { useFormatStore } from '@/stores/formatStore'

const urlStore = useUrlStore()
const formatStore = useFormatStore()
const { formats } = storeToRefs(formatStore)

const videoQualityOptions = computed(() => {
  return formats.value
    .filter((file) => file.vcodec !== 'none' && file.acodec === 'none')
    .map((file) => ({
      label: `${file.resolution || ''} (${file.ext}) @ ${file.vbr || file.tbr || 'N/A'}`,
      value: file.id,
    }))
})

const audioQualityOptions = computed(() => {
  return formats.value
    .filter((file) => file.acodec !== 'none' && file.vcodec === 'none')
    .map((file) => ({
      label: `${file.acodec} (${file.ext}) @ ${file.abr || 'N/A'}`,
      value: file.id,
    }))
})

const containerFormatOptions = ref([
  { label: 'MP4 (兼容性好)', value: 'mp4' },
  { label: 'MKV (功能强大)', value: 'mkv' },
  { label: 'WebM (网页格式)', value: 'webm' },
])

const selectedVideoId = ref<string | undefined>(undefined)
const selectedAudioId = ref<string | undefined>(undefined)
const selectedContainerFormat = ref('mp4')

watch(videoQualityOptions, (newOptions) => {
  if (newOptions.length > 0) {
    selectedVideoId.value = newOptions[0].value
  } else {
    selectedVideoId.value = undefined
  }
})

watch(audioQualityOptions, (newOptions) => {
  if (newOptions.length > 0) {
    selectedAudioId.value = newOptions[0].value
  } else {
    selectedAudioId.value = undefined
  }
})

const handleDownload = () => {
  if (!urlStore.currentUrl) {
    NotificationPlugin.warning({ title: '操作提示', content: '你小子,又忘了分析了吧' })
    return
  }
  if (!selectedVideoId.value || !selectedAudioId.value) {
    NotificationPlugin.warning({ title: '操作提示', content: '选好规格!' })
    return
  }

  NotificationPlugin.info({ title: '系统提示', content: 'DIY 合成下载任务已开始...', duration: 5000 })
  window.eel.download_diy_format(
    urlStore.currentUrl,
    selectedVideoId.value,
    selectedAudioId.value,
    selectedContainerFormat.value,
  )
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: stretch;
  padding: 0.4rem;
}

.command-preview {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.4rem;
  width: 100%;
}

.select-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
}

.select-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  width: 100%;
}

.select-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #333;
}

.select-input {
  width: 100%;
  min-width: 6rem;
}

.download-btn {
  min-width: 5rem;
  align-self: flex-start;
}

.cpu-warning {
  font-size: 0.65rem;
  color: #888;
  margin: 0;
  text-align: center;
}

@media (max-width: 1200px) {
  .select-input {
    width: 100%;
  }
}
</style>
