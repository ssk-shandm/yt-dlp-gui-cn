<template>
  <p>仅显示本次运行已结束的任务，重启应用后清空；下载文件不会删除。</p>
  <t-table row-key="taskId" :data="tasks" :columns="columns" max-height="65vh" empty="暂无已结束的任务" />
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import type { TableProps } from 'tdesign-vue-next'
import { useTaskStore } from '@/stores/taskStore'
const store = useTaskStore()
const statusText = { success: '已完成', error: '失败', cancelled: '已取消', running: '运行中' }
const tasks = computed(() => store.tasks.filter((task) => task.status !== 'running').map((task) => ({ ...task, statusText: statusText[task.status] })))
const columns: TableProps['columns'] = [
  { colKey: 'taskId', title: 'ID', width: 70 },
  { colKey: 'title', title: '任务' },
  { colKey: 'statusText', title: '结果', width: 90 },
  { colKey: 'message', title: '说明' },
]
</script>
