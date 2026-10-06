<template>
  <section class="downloads-page">
    <div class="download-summary surface-card">
      <div><span class="summary-label">本次运行</span><strong>下载任务</strong></div>
      <div class="summary-stats">
        <span
          ><b>{{ runningCount }}</b> 运行中</span
        ><span
          ><b>{{ completedCount }}</b> 已结束</span
        >
      </div>
    </div>
    <div class="download-list surface-card"><DownloadAndFinishedTabs /></div>
  </section>
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import DownloadAndFinishedTabs from '@/pages/下载列表/components/DAFTabs.vue'
import { useTaskStore } from '@/stores/taskStore'
const store = useTaskStore()
const runningCount = computed(() => store.tasks.filter((task) => task.status === 'running').length)
const completedCount = computed(() => store.tasks.length - runningCount.value)
</script>
<style scoped>
.downloads-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100%;
}
.download-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 22px 26px;
}
.summary-label {
  display: block;
  font-size: 11px;
  color: var(--ui-text-muted);
  margin-bottom: 8px;
}
.download-summary strong {
  font-size: 17px;
}
.summary-stats {
  display: flex;
  gap: 30px;
  font-size: 12px;
  color: var(--ui-text-muted);
}
.summary-stats b {
  font-size: 25px;
  color: var(--ui-accent);
  font-weight: 650;
  margin-right: 6px;
}
.download-list {
  flex: 1;
  overflow: hidden;
  min-height: 350px;
  padding: 16px;
}
@media (max-width: 520px) {
  .download-summary {
    flex-wrap: wrap;
    padding: 20px;
  }
  .summary-stats {
    gap: 20px;
  }
}
</style>
