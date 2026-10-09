<template>
  <BOX :title="t('content.captions.title')" class="box" data-guide="subtitles">
    <div class="box-inner">
      <BBB class="btn-sm" @click="download_video_introduction">
        {{ t('content.captions.downloadDescription') }}
      </BBB>
      <t-table
        bordered
        hover
        row-key="language"
        :data="subtitles"
        :columns="columns"
        :loading="isLoading"
        height="100%"
        size="small"
      />
    </div>
  </BOX>
</template>

<script lang="tsx" setup>
import { computed, h } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { type TableProps, Button as TButton } from 'tdesign-vue-next'
import BOX from '@/components/BoxStyle.vue'
import BBB from '@/components/DiyButtom.vue'
import { useUrlStore } from '@/stores/urlStore'
import { startDownload } from '@/services/desktop'
import { useSubtitleStore } from '@/stores/subtitleStore'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'

interface SubtitleItem {
  language: string
  formats: string
}

const { t } = useI18n()
const urlStore = useUrlStore()
const subtitleStore = useSubtitleStore()
const { subtitles, isLoading } = storeToRefs(subtitleStore)

const download_video_introduction = () => {
  if (urlStore.analyzedUrl) {
    NotificationPlugin.info({ title: t('content.titles.system'), content: t('content.captions.descriptionStarted') })
    void startDownload({ url: urlStore.analyzedUrl, kind: 'description' })
  }
}

const columns = computed<TableProps['columns']>(() => [
  { colKey: 'language', title: t('content.captions.language'), width: '25%' },
  { colKey: 'formats', title: t('content.captions.format'), width: '55%' },
  {
    colKey: 'Download',
    title: t('content.captions.action'),
    width: '20%',
    cell: (_, { row: file }) => {
      return h(
        TButton,
        {
          theme: 'primary',
          size: 'small',
          onClick: () => downloadSubtitle(file as SubtitleItem),
        },
        () => t('content.captions.download'),
      )
    },
  },
])

const downloadSubtitle = (row: SubtitleItem) => {
  if (urlStore.analyzedUrl) {
    subtitleStore.downloadSubtitle(urlStore.analyzedUrl, row.language)
  }
}
</script>

<style lang="scss" scoped>
.box-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 0.3rem;
}

.btn-sm {
  align-self: flex-start;
  padding: 0.25rem 0.5rem !important;
  font-size: 0.8rem !important;
  height: 1.8rem !important;
  min-width: 5rem;
}

.box-inner :deep(.t-table) {
  flex: 1;
  min-height: 0;
  border-radius: 0.4rem;
  overflow: hidden;
  border: 1px solid #ebeef5;
  font-size: 0.7rem;
}

.box-inner :deep(.t-table table) {
  table-layout: fixed;
}

.box-inner :deep(td) {
  padding: 0.25rem 0.2rem !important;
  font-size: 0.7rem;
}

.box-inner :deep(th) {
  padding: 0.25rem 0.2rem !important;
  font-weight: 600;
  font-size: 0.7rem;
}

.box-inner :deep(.t-button) {
  padding: 0.1rem 0.3rem !important;
  font-size: 0.7rem !important;
  height: 1.4rem !important;
}
</style>
