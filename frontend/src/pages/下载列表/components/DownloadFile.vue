<template>
  <p>运行中的任务最多 4 个；关闭应用会终止未完成任务。</p>
  <t-table row-key="taskId" :data="tasks" :columns="columns" max-height="65vh" empty="暂无运行中的任务" />
</template>
<script lang="ts" setup>
import { computed, h } from 'vue'
import { Button, type TableProps } from 'tdesign-vue-next'
import { useTaskStore } from '@/stores/taskStore'
import { cancelTask } from '@/services/desktop'
const store = useTaskStore()
const tasks = computed(() => store.tasks.filter((task) => task.status === 'running'))
const columns: TableProps['columns'] = [
  { colKey: 'taskId', title: 'ID', width: 70 },
  { colKey: 'title', title: '任务' },
  { colKey: 'message', title: '状态' },
  { colKey: 'cancel', title: '操作', width: 90, cell: (_, { row }) => h(Button, { theme: 'danger', size: 'small', onClick: () => void cancelTask(row.taskId) }, () => '取消') },
]
</script>
