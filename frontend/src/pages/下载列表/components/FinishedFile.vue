<template>
  <p>{{ $t('downloads.finished.hint') }}</p>
  <t-table row-key="taskId" :data="tasks" :columns="columns" max-height="65vh" :empty="$t('downloads.finished.empty')" />
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import type { TableProps } from 'tdesign-vue-next'
import { useI18n } from 'vue-i18n'
import { useTaskStore } from '@/stores/taskStore'
import { errorText, kindName } from '@/i18n/codes'
const { t } = useI18n()
const store = useTaskStore()
const statusText = computed(() => ({ success: t('downloads.status.success'), error: t('downloads.status.error'), cancelled: t('downloads.status.cancelled'), running: t('downloads.status.running') }))
const tasks = computed(() => store.tasks.filter((task) => task.status !== 'running').map((task) => ({ ...task, title: kindName(task.kind), message: errorText(task.message), statusText: statusText.value[task.status] })))
const columns = computed<TableProps['columns']>(() => [
  { colKey: 'taskId', title: t('downloads.columns.id'), width: 70 },
  { colKey: 'title', title: t('downloads.columns.task') },
  { colKey: 'statusText', title: t('downloads.columns.result'), width: 90 },
  { colKey: 'message', title: t('downloads.columns.details') },
])
</script>
