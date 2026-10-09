<template>
  <BOX
    :title="t('content.list.title')"
    width="100%"
    class="box-container"
  >
    <div class="controls-bar">
      <div class="filter-group">
        <span class="filter-label">{{ t('content.list.typeFilter') }}</span>
        <a-select
          v-model="filterType"
          data-guide="format-filter"
          :options="typeOptions"
          class="filter-select"
          @change="handleFilterChange"
        />
      </div>
      <div class="sort-group">
        <span class="sort-label">{{ t('content.list.sort') }}</span>
        <a-select
          v-model="sortBy"
          :options="sortOptions"
          class="sort-select"
          @change="handleSortChange"
        />
      </div>
    </div>
    <div class="table-container">
      <t-table
        bordered
        hover
        row-key="id"
        :data="filteredAndSortedFormats"
        :columns="columns"
        :loading="isLoading"
        height="100%"
        resizable
      >
      </t-table>
    </div>
  </BOX>
</template>

<script lang="ts" setup>
import { h, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { type BaseTableProps, Button as TButton } from 'tdesign-vue-next'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'
import BOX from '@/components/BoxStyle.vue'
import { useUrlStore } from '@/stores/urlStore'
import { startDownload } from '@/services/desktop'
import { useFormatStore } from '@/stores/formatStore'

const { t } = useI18n()
const urlStore = useUrlStore()
const formatStore = useFormatStore()
const { formats, isLoading } = storeToRefs(formatStore)

// 筛选和排序状态
const filterType = ref('all')
const sortBy = ref('resolution')

const typeOptions = computed(() => [
  { label: t('content.list.filter.all'), value: 'all' },
  { label: t('content.list.filter.video'), value: 'video' },
  { label: t('content.list.filter.audio'), value: 'audio' },
  { label: t('content.list.filter.both'), value: 'both' },
])

const sortOptions = computed(() => [
  { label: t('content.list.sortBy.resolution'), value: 'resolution' },
  { label: t('content.list.sortBy.filesize'), value: 'filesize' },
  { label: t('content.list.sortBy.bitrate'), value: 'bitrate' },
  { label: t('content.list.sortBy.id'), value: 'id' },
])

// 计算筛选和排序后的数据
const filteredAndSortedFormats = computed(() => {
  let result = formats.value

  // 按类型筛选
  if (filterType.value !== 'all') {
    result = result.filter((f) => {
      const hasVideo = f.vcodec && f.vcodec !== 'none'
      const hasAudio = f.acodec && f.acodec !== 'none'

      if (filterType.value === 'video') return hasVideo && !hasAudio
      if (filterType.value === 'audio') return !hasVideo && hasAudio
      if (filterType.value === 'both') return hasVideo && hasAudio
      return true
    })
  }

  // 排序
  result = [...result].sort((a, b) => {
    switch (sortBy.value) {
      case 'resolution': {
        const resA = parseResolution(a.resolution || '0')
        const resB = parseResolution(b.resolution || '0')
        return resB - resA
      }
      case 'filesize': {
        const sizeA = parseFilesize(a.filesize || '0B')
        const sizeB = parseFilesize(b.filesize || '0B')
        return sizeB - sizeA
      }
      case 'bitrate': {
        const bitrateA = parseBitrate(a.tbr || '0kbps')
        const bitrateB = parseBitrate(b.tbr || '0kbps')
        return bitrateB - bitrateA
      }
      case 'id':
        return String(a.id).localeCompare(String(b.id))
      default:
        return 0
    }
  })

  return result
})

// 辅助函数：解析分辨率
const parseResolution = (res: string): number => {
  if (!res || res === 'N/A') return 0
  const match = res.match(/(\d+)p/)
  return match ? parseInt(match[1]) : 0
}

// 辅助函数：解析文件大小
const parseFilesize = (size: string): number => {
  const units: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
  const match = size.match(/^([\d.]+)\s*([A-Z]+)?/)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = (match[2] || 'B').toUpperCase()
  return value * (units[unit] || 1)
}

// 辅助函数：解析码率
const parseBitrate = (br: string): number => {
  const match = br.match(/~?(\d+)/)
  return match ? parseInt(match[1]) : 0
}

// 处理筛选变化
const handleFilterChange = () => {
  console.log(`已切换到${filterType.value}类型的格式`)
}

// 处理排序变化
const handleSortChange = () => {
  console.log(`已按${sortBy.value}排序`)
}

// 定义表头
const columns = computed<BaseTableProps['columns']>(() => [
  { colKey: 'id', title: t('content.list.columns.id'), width: '70px', ellipsis: true },
  { colKey: 'ext', title: t('content.list.columns.format'), width: '60px' },
  { colKey: 'resolution', title: t('content.list.columns.resolution'), width: '80px' },
  { colKey: 'fps', title: t('content.list.columns.fps'), width: '60px' },
  { colKey: 'vcodec', title: t('content.list.columns.videoCodec'), width: '100px', ellipsis: true },
  { colKey: 'vbr', title: t('content.list.columns.videoBitrate'), width: '80px' },
  { colKey: 'acodec', title: t('content.list.columns.audioCodec'), width: '100px', ellipsis: true },
  { colKey: 'abr', title: t('content.list.columns.audioBitrate'), width: '80px' },
  { colKey: 'filesize', title: t('content.list.columns.size'), width: '70px' },
  { colKey: 'tbr', title: t('content.list.columns.totalBitrate'), width: '80px' },
  {
    colKey: 'download',
    title: t('content.list.columns.action'),
    width: '70px',
    fixed: 'right',
    cell: (_, { row }) => {
      return h(
        TButton,
        {
          theme: 'primary',
          size: 'small',
          onClick: () => downloadFormat(row.id),
        },
        () => t('content.list.columns.download'),
      )
    },
  },
])

// 下载逻辑
const downloadFormat = (formatId: string) => {
  if (!urlStore.analyzedUrl) {
    NotificationPlugin.warning({ title: t('content.titles.operation'), content: t('content.list.notAnalyzed') })
    return
  }

  if (!formatId) {
    NotificationPlugin.error({ title: t('content.titles.failed'), content: t('content.list.invalidFormatId') })
    return
  }

  NotificationPlugin.info({ title: t('content.titles.system'), content: t('content.list.downloadingFormat', { formatId }), duration: 5000 })
  void startDownload({ url: urlStore.analyzedUrl, kind: 'format', formatId })
}
</script>

<style lang="scss" scoped>
.box-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  gap: 0.75rem;
}

.controls-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #f9fafb 100%);
  border-radius: 0.5rem;
  border: 1px solid #f0f2f5;
}

.filter-group,
.sort-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.filter-label,
.sort-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.filter-select,
.sort-select {
  min-width: 10rem;
  flex: 1;
  max-width: 15rem;
}

.table-container {
  box-sizing: border-box;
  flex-grow: 1;
  min-height: 0;
  border-radius: 0.625rem;
  overflow: hidden;
  border: 1px solid #e8ebf0;
}

.table-container :deep(.t-table) {
  table-layout: fixed;
  width: 100% !important;
  font-size: 0.875rem;
}

.table-container :deep(thead) {
  background: linear-gradient(135deg, #f5f7fa 0%, #f9fafb 100%);
}

.table-container :deep(th) {
  padding: 0.625rem 0.5rem !important;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 2px solid #e8ebf0;
}

.table-container :deep(td) {
  padding: 0.5rem 0.5rem !important;
  color: #4b5563;
}

.table-container :deep(tr:hover) {
  background-color: #f9fafb;
}

.table-container :deep(.t-button) {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem !important;
  height: auto;
}

.table-container :deep(.t-button--primary) {
  background: linear-gradient(135deg, #1890ff 0%, #0050b3 100%);
  border: none;
}

.table-container :deep(.t-button--primary:hover) {
  opacity: 0.9;
}
</style>
