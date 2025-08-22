<template>
  <t-table
    hover
    row-key="index"
    :data="data"
    :columns="columns"
    maxHeight="71vh"
    class="tabs-container"
  />
</template>
<script lang="tsx" setup>
import { ref } from 'vue'
import { type TableProps } from 'tdesign-vue-next'


const columns: TableProps['columns'] = [
  { colKey: 'applicant', title: '文件', width: '80%' },
  { colKey: 'channel', title: '大小', width: '10%' },
  {
    colKey: 'progress',
    title: '状态',
    width: '10%',
  },
]

const data = ref([
  {
    index: 1,
    applicant: '我在岛上呆了100小时！',
    channel: '460mb',
  },
  {
    index: 2,
    applicant: '不行，太饿了我先干了',
    channel: '线下',
  },
  {
    index: 3,
    applicant: '⚡两面包夹芝士⚡',
    channel: '679mb',
  },
])
</script>

<style lang="scss" scoped></style>
