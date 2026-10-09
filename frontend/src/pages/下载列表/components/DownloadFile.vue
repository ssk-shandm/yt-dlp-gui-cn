<template>
  <p>{{ $t('downloads.running.hint') }}</p>
  <t-table row-key="taskId" :data="tasks" :columns="columns" max-height="65vh" :empty="$t('downloads.running.empty')" />
</template>
<script lang="ts" setup>
import { computed, h } from 'vue'
import { Button, type TableProps } from 'tdesign-vue-next'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '@/stores/taskStore'
import { cancelTask } from '@/services/desktop'
import { errorText, kindName } from '@/i18n/codes'
const { t } = useI18n()
const store = useTaskStore()
const tasks = computed(() => store.tasks.filter((task) => task.status === 'running').map((task) => ({ ...task, title: kindName(task.kind), message: errorText(task.message) })))
const columns = computed<TableProps['columns']>(() => [
  { colKey: 'taskId', title: t('downloads.columns.id'), width: 70 },
  { colKey: 'title', title: t('downloads.columns.task') },
  { colKey: 'message', title: t('downloads.columns.status') },
  { colKey: 'cancel', title: t('downloads.columns.action'), width: 90, cell: (_, { row }) => h(Button, { theme: 'danger', size: 'small', onClick: () => void cancelTask(row.taskId) }, () => t('downloads.cancel')) },
])
</script>
