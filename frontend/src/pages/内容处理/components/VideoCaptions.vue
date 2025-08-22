<template>
  <BOX title="字幕下载">
    <div class="container">
      <BBB
        style="width: 9rem"
        @click="download_video_introduction"
        >下载视频描述</BBB
      >
      <t-table
        bordered
        hover
        row-key="language"
        :data="subtitles"
        :columns="columns"
        :loading="isLoading"
        maxHeight="9rem"
      ></t-table>
    </div>
  </BOX>
</template>

<script lang="tsx" setup>
import { h } from 'vue'
import { storeToRefs } from 'pinia'
import { type TableProps } from 'tdesign-vue-next'
import { Button as TButton } from 'tdesign-vue-next'
import BOX from '@/components/BoxStyle.vue'
import BBB from '@/components/DiyButtom.vue'
import { useUrlStore } from '@/stores/urlStore'
import { useSubtitleStore } from '@/stores/subtitleStore'

interface SubtitleItem {
  language: string
  formats: string
}

// 实例
const urlStore = useUrlStore()
const subtitleStore = useSubtitleStore()
const { subtitles, isLoading } = storeToRefs(subtitleStore)

// 下载视频描述或简介
const download_video_introduction = () => {
  if (urlStore.analyzedUrl) {
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
    // ts 组件 cell 函数参数
    cell: (_, { row: file }) => {
      return h(
        TButton,
  {
          theme: 'primary',
          size: 'small',
          onClick: () => HD(file as SubtitleItem),
        },
        () => '下载',
      )
    },
  },
]

// 下载
const HD = (row: SubtitleItem) => {
  if (urlStore.analyzedUrl) {
    subtitleStore.downloadSubtitle(urlStore.analyzedUrl, row.language)
  }
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 10.75rem;
  gap: 0.625rem;
}
// 圆角设计
.container :deep(.t-table) {
  flex-grow: 1;
  border-radius: 0.8125rem;
  overflow: hidden;
  border: 1px solid #ebeef5;
}
.container :deep(.t-table table) {
  table-layout: fixed;
}
.container :deep(.t-table) {
  font-size: 1rem;
}
.container :deep(td) {
  padding: 0rem 0.25rem !important;
}
/**表头样式 */
.container :deep(th) {
  padding: 0.125rem 0.25rem !important;
}

.mt-2 {
  width: 6.125rem;
}
</style>
