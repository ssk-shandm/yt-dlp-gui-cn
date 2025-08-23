<template>
  <BOX
    title="可用格式"
    width="100%"
    class="box-container"
  >
    <div class="table-container">
      <t-table
        bordered
        hover
        row-key="id"
        :data="formats"
        :columns="columns"
        :loading="isLoading"
        height="40vh"
        resizable
      >
      </t-table>
    </div>
  </BOX>
</template>

<script lang="ts" setup>
import { h } from 'vue'
import { storeToRefs } from 'pinia'
import { type BaseTableProps, Button as TButton } from 'tdesign-vue-next'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'
import BOX from '@/components/BoxStyle.vue'
import { useUrlStore } from '@/stores/urlStore'
import { useFormatStore } from '@/stores/formatStore'

const urlStore = useUrlStore()
const formatStore = useFormatStore()
const { formats, isLoading } = storeToRefs(formatStore)

// 定义表头
const columns: BaseTableProps['columns'] = [
  { colKey: 'id', title: 'ID', width: '7vw' },
  { colKey: 'ext', title: 'EXT', width: '6vw' },
  { colKey: 'resolution', title: '分辨率' },
  { colKey: 'fps', title: 'FPS' },
  { colKey: 'vcodec', title: '视频编码', ellipsis: true },
  { colKey: 'vbr', title: '视频码率' },
  { colKey: 'acodec', title: '音频编码', ellipsis: true },
  { colKey: 'abr', title: '音频码率' },
  { colKey: 'filesize', title: '大小' },
  { colKey: 'tbr', title: '总码率' },
  {
    colKey: 'download',
    title: '操作',
    width: '5vw',
    fixed: 'right',
    cell: (_, { row }) => {
      return h(
        TButton,
        {
          theme: 'primary',
          size: 'medium',
          onClick: () => downloadFormat(row.id),
        },
        () => '下载',
      )
    },
  },
]

// 下载逻辑
const downloadFormat = (formatId: string) => {
  if (!urlStore.analyzedUrl) {
    NotificationPlugin.warning({ title: '操作提示', content: '链接未分析！' })
    return
  }
  // 更新防御
  if (!formatId) {
    NotificationPlugin.error({ title: '操作失败', content: '无效的格式ID！' })
    return
  }

  NotificationPlugin.info({ title: '系统提示', content: `ID: ${formatId} 的下载任务已开始...`, duration: 5000 })
  window.eel.download_specific_format(urlStore.analyzedUrl, formatId)
}

// // 下载逻辑
// const downloadFormat = async (formatId: string) => {
//   if (!urlStore.analyzedUrl) {
//     NotificationPlugin.warning({ title: '操作提示', content: '链接未分析！' })
//     return
//   }
//   // 更新防御
//   if (!formatId) {
//     NotificationPlugin.error({ title: '操作失败', content: '无效的格式ID！' })
//     return
//   }

//   // 下载
//   let loadingMsg = null
//   try {
//     loadingMsg = NotificationPlugin.info({ title: '系统提示', content: `下载中...`, duration: 0 })
//     const result = await window.eel.download_specific_format(urlStore.analyzedUrl, formatId)
//     NotificationPlugin.close(loadingMsg)
//     if (result.status === 'success') {
//       NotificationPlugin.success({ title: '下载成功', content: result.message || '下载成功。'})
//     } else {
//       NotificationPlugin.error({ title: '下载失败', content: result.message || '下载失败，后端错误。'})
//     }
//   } catch (e) {
//     if (loadingMsg) {
//       NotificationPlugin.close(loadingMsg)
//     }
//     NotificationPlugin.error({ title: '严重错误', content: 'error' })
//     console.error(e)
//   }
// }
</script>

<style lang="scss" scoped>
.box-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.table-container {
  box-sizing: border-box;
  flex-grow: 1;
}
.table-container :deep(.t-table) {
  table-layout: fixed;
  width: 100% !important;
}
.table-container :deep(td),
.table-container :deep(th) {
  padding: 0.125rem 0.25rem !important;
}
.container :deep(.t-table) {
  font-size: 1rem;
}
// 圆角设计
.container :deep(.t-table) {
  flex-grow: 1;
  border-radius: 0.8125rem;
  overflow: hidden;
  border: 1px solid #ebeef5;
}
.container :deep(.t-button) {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  padding: 0rem 0.4rem;
}
</style>
