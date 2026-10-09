<template>
  <BOX :title="t('content.diy.title')" class="box">
    <div class="box-inner">
      <div class="select-row" data-guide="video-audio-quality">
        <div class="select-item">
          <label class="label-sm">{{ t('content.diy.video') }}</label>
          <DiySelect
            v-model="selectedVideoId"
            :options="videoQualityOptions"
            class="select-sm"
          />
        </div>
        <div class="select-item">
          <label class="label-sm">{{ t('content.diy.audio') }}</label>
          <DiySelect
            v-model="selectedAudioId"
            :options="audioQualityOptions"
            class="select-sm"
          />
        </div>
      </div>
      <div class="select-row">
        <div class="select-item">
          <label class="label-sm">{{ t('content.diy.format') }}</label>
          <DiySelect
            v-model="selectedContainerFormat"
            data-guide="container-format"
            :options="containerFormatOptions"
            class="select-sm"
          />
        </div>
        <BBB class="btn-download" data-guide="custom-download" @click="handleDownload">{{ t('content.diy.download') }}</BBB>
      </div>
      <p class="warning-text">{{ t('content.diy.cpuWarning') }}</p>
    </div>
  </BOX>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import DiySelect from '@/components/TxSelect.vue'
import BOX from '@/components/BoxStyle.vue'
import BBB from '@/components/DiyButtom.vue'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'
import { useUrlStore } from '@/stores/urlStore'
import { startDownload } from '@/services/desktop'
import { useFormatStore } from '@/stores/formatStore'

const { t } = useI18n()
const urlStore = useUrlStore()
const formatStore = useFormatStore()
const { formats } = storeToRefs(formatStore)

const videoQualityOptions = computed(() => {
  return formats.value
    .filter((file) => file.vcodec !== 'none' && file.acodec === 'none')
    .map((file) => ({
      label: `${file.resolution || 'N/A'} (${file.ext})`,
      value: file.id,
    }))
})

const audioQualityOptions = computed(() => {
  return formats.value
    .filter((file) => file.acodec !== 'none' && file.vcodec === 'none')
    .map((file) => ({
      label: `${file.acodec} (${file.ext})`,
      value: file.id,
    }))
})

const containerFormatOptions = ref([
  { label: 'MP4', value: 'mp4' },
  { label: 'MKV', value: 'mkv' },
  { label: 'WebM', value: 'webm' },
])

const selectedVideoId = ref<string | undefined>(undefined)
const selectedAudioId = ref<string | undefined>(undefined)
const selectedContainerFormat = ref('mp4')

watch(videoQualityOptions, (newOptions) => {
  selectedVideoId.value = newOptions.length > 0 ? newOptions[0].value : undefined
})

watch(audioQualityOptions, (newOptions) => {
  selectedAudioId.value = newOptions.length > 0 ? newOptions[0].value : undefined
})

const handleDownload = () => {
  if (!urlStore.currentUrl) {
    NotificationPlugin.warning({ title: t('content.titles.operation'), content: t('content.diy.analyzeFirst') })
    return
  }
  if (!selectedVideoId.value || !selectedAudioId.value) {
    NotificationPlugin.warning({ title: t('content.titles.operation'), content: t('content.diy.chooseVideoAudio') })
    return
  }

  NotificationPlugin.info({ title: t('content.titles.system'), content: t('content.diy.started'), duration: 5000 })
  void startDownload({ url: urlStore.analyzedUrl, kind: 'combined', videoId: selectedVideoId.value, audioId: selectedAudioId.value, containerFormat: selectedContainerFormat.value })
}
</script>

<style lang="scss" scoped>
.box-inner {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  width: 100%;
}

.select-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem;
  align-items: end;
}

.select-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.label-sm {
  font-size: 0.65rem;
  font-weight: 600;
  color: #333;
}

.select-sm {
  height: 1.8rem;
}

.select-sm :deep(.t-select) {
  height: 1.8rem;
  font-size: 0.75rem;
}

.btn-download {
  min-width: 4rem;
  padding: 0.25rem 0.5rem !important;
  font-size: 0.8rem !important;
  height: 1.8rem !important;
  justify-self: start;
}

.warning-text {
  font-size: 0.6rem;
  color: #888;
  margin: 0;
  text-align: center;
}
</style>
