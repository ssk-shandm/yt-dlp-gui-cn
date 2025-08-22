<template>
  <t-table
    hover
    row-key="index"
    :data="data"
    :columns="columns"
    :selected-row-keys="selectedRowKeys"
    @select-change="handleSelectChange"
    maxHeight="71vh"
    class="tabs-container"
  />
</template>

<script lang="tsx" setup>
import { ref } from 'vue'
import { type TableProps } from 'tdesign-vue-next'

// 组件交互
const selectedRowKeys = ref<TableProps['selectedRowKeys']>([])
const handleSelectChange = (value: TableProps['selectedRowKeys']) => {
  selectedRowKeys.value = value
}

const columns: TableProps['columns'] = [
  { colKey: 'row-select', type: 'multiple', width: '5%' },
  { colKey: 'applicant', title: '文件', width: '75%' },
  { colKey: 'channel', title: '大小', width: '10%' },
  { colKey: 'status', title: '状态', width: '10%' },
]

const data = ref([
  {
    index: 1,
    applicant: '我在岛上呆了100小时！',
    channel: '460mb',
    status: '待下载',
  },
  {
    index: 2,
    applicant: '不行，太饿了我先干了',
    channel: '线下',
    status: '待下载',
  },
  {
    index: 3,
    applicant: '⚡两面包夹芝士⚡',
    channel: '679mb',
    status: '待下载',
  },
])
</script>

<style lang="scss" scoped></style>
