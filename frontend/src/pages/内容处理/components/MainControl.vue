<template>
  <BOX :title="t('content.control.title')" class="box">
    <div class="box-inner">
      <div class="row-group">
        <BBB @click="selectPath" class="btn-sm" data-guide="download-directory">{{ t('content.control.downloadDirectory') }}</BBB>
        <DiySelect
          v-model="settingsStore.retryTimes"
          data-guide="retry-limit"
          :options="timeOptions"
          class="select-sm"
        />
      </div>
      <t-input
        disabled
        v-model="settingsStore.downloadPath"
        :placeholder="t('content.control.defaultDirectory')"
        size="small"
      />
      <div class="row-group">
        <BBB @click="get_cover_image" class="btn-sm">{{ t('content.control.fetchCover') }}</BBB>
        <BBB @click="get_all_supported_sites" class="btn-sm">{{ t('content.control.supportedSites') }}</BBB>
      </div>
      <label class="fragment-setting">
        <span>{{ t('content.control.concurrentFragments') }}</span>
        <select v-model.number="settingsStore.concurrentFragments" :aria-label="t('content.control.concurrentFragmentsAria')">
          <option v-for="count in [1, 4, 8, 16]" :key="count" :value="count">{{ fragmentLabel(count) }}</option>
        </select>
      </label>
      <p class="tip-text">{{ t('content.control.fragmentTip') }}</p>
      <p class="tip-text">{{ t('content.control.overseasTip') }}</p>
    </div>
  </BOX>
</template>

<script lang="ts" setup>
import { useUrlStore } from '@/stores/urlStore'
import { selectDownloadDirectory, startDownload, listSupportedSites, saveRetryTimes, saveConcurrentFragments } from '@/services/desktop'
import { useSettingsStore } from '@/stores/settingsStore'
import { computed, watch } from 'vue'
import BBB from '@/components/DiyButtom.vue'
import BOX from '@/components/BoxStyle.vue'
import DiySelect from '@/components/TxSelect.vue'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const urlStore = useUrlStore()
const router = useRouter()

const selectPath = () => {
  void selectDownloadDirectory()
}

const fragmentLabel = (count: number) =>
  count === 8 ? t('content.control.fragmentRecommended', { count }) : t('content.control.fragment', { count })

const get_cover_image = () => {
  if (!urlStore.analyzedUrl) {
    NotificationPlugin.warning({ title: t('content.titles.operation'), content: t('content.control.analyzeFirst') })
    return
  }
  NotificationPlugin.info({ title: t('content.titles.system'), content: t('content.control.coverRequested') })
  void startDownload({ url: urlStore.analyzedUrl, kind: 'thumbnail' })
}

const get_all_supported_sites = async () => {
  NotificationPlugin.info({ title: t('content.titles.system'), content: t('content.control.fetchingSites') })
  await listSupportedSites()
  await router.push('/page-four')
}

const timeOptions = computed(() => [
  { label: t('content.control.retryOptions.three'), value: '3' },
  { label: t('content.control.retryOptions.five'), value: '5' },
  { label: t('content.control.retryOptions.ten'), value: '10' },
  { label: t('content.control.retryOptions.infinite'), value: 'infinite' },
])

watch(
  () => settingsStore.retryTimes,
  (newValue) => {
    if (settingsStore.initialized) void saveRetryTimes(newValue)
  },
)
watch(
  () => settingsStore.concurrentFragments,
  (newValue) => {
    if (settingsStore.initialized) void saveConcurrentFragments(newValue)
  },
)
</script>

<style scoped>
.box-inner {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
}

.row-group {
  display: flex;
  gap: 0.3rem;
  align-items: center;
  flex-wrap: wrap;
}

.btn-sm {
  flex: 1;
  min-width: 5rem;
  padding: 0.25rem 0.5rem !important;
  font-size: 0.8rem !important;
  height: 1.8rem !important;
}

.select-sm {
  flex: 1;
  min-width: 6rem;
}

.select-sm :deep(.t-select) {
  height: 1.8rem;
  font-size: 0.8rem;
}

:deep(.t-input) {
  font-size: 0.8rem;
  height: 1.8rem;
}

:deep(.t-input__input) {
  padding: 0.25rem 0.5rem;
}

.fragment-setting {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}
.fragment-setting select {
  flex: 1;
  min-width: 0;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.4rem;
  color: var(--ui-text);
  background: #fff;
}
.fragment-setting select:focus-visible {
  outline: 2px solid var(--ui-accent);
  outline-offset: 2px;
}
.tip-text {
  font-size: 0.65rem;
  color: #666;
  margin: 0;
  text-align: center;
}
</style>
