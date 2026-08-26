<template>
  <BOX title="字幕下载">
    <div class="container">
      <BBB
        class="btn-download"
        @click="download_video_introduction"
      >
        下载视频描述
      </BBB>
      <t-table
        bordered
        hover
        row-key="language"
        :data="subtitles"
        :columns="columns"
        :loading="isLoading"
        max-height="9rem"
      />
    </div>
  </BOX>
</template>

<script lang="tsx" setup>
import { h } from 'vue'
import { storeToRefs } from 'pinia'
import { type TableProps, Button as TButton } from 'tdesign-vue-next'
import BOX from '@/components/BoxStyle.vue'
import BBB from '@/components/DiyButtom.vue'
import { useUrlStore } from '@/stores/urlStore'
import { useSubtitleStore } from '@/stores/subtitleStore'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'

interface SubtitleItem {
  language: string
  formats: string
}

const urlStore = useUrlStore()
const subtitleStore = useSubtitleStore()
const { subtitles, isLoading } = storeToRefs(subtitleStore)

const download_video_introduction = () => {
  if (urlStore.analyzedUrl) {
    NotificationPlugin.info({ title: '系统提示', content: '正在下载视频描述...' })
    window.eel.download_video_introduction(urlStore.analyzedUrl)
  }
}

const columns: TableProps['columns'] = [
  { colKey: 'language', title: '语言', width: '20%' },
  { colKey: 'formats', title: '格式', width: '62%' },
  {
    colKey: 'Download',
    title: '下载',
    width: '18%',
    cell: (_, { row: file }) => {
      return h(
        TButton,
        {
          theme: 'primary',
          size: 'small',
          onClick: () => downloadSubtitle(file as SubtitleItem),
        },
        () => '下载',
      )
    },
  },
]

const downloadSubtitle = (row: SubtitleItem) => {
  if (urlStore.analyzedUrl) {
    subtitleStore.downloadSubtitle(urlStore.analyzedUrl, row.language)
  }
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: auto;
  min-height: 8rem;
  gap: 0.4rem;
}

.btn-download {
  align-self: flex-start;
  min-width: 6rem;
}

.container :deep(.t-table) {
  flex-grow: 1;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #ebeef5;
  font-size: 0.8rem;
}

.container :deep(.t-table table) {
  table-layout: fixed;
}

.container :deep(td) {
  padding: 0.35rem 0.25rem !important;
  font-size: 0.75rem;
}

.container :deep(th) {
  padding: 0.35rem 0.25rem !important;
  font-weight: 600;
  font-size: 0.75rem;
}
</style>
