<template>
  <div class="my-tabs-container">
    <t-tabs
      size="large"
      theme="card"
      :default-value="1"
    >
      <t-tab-panel
        :value="1"
        label="下载中"
      >
        <div style="margin: 20px">
        <DownloadFile />
        </div>
    </t-tab-panel>
      <t-tab-panel
        :value="2"
        label="已完成"
      >
        <div style="margin: 20px">
<FinishedFile />
        </div>
    </t-tab-panel>
  </t-tabs>
  </div>
</template>

<script lang="ts" setup>
import DownloadFile from '@/pages/下载列表/components/DownloadFile.vue'
import FinishedFile from '@/pages/下载列表/components/FinishedFile.vue'
</script>

<style scoped lang="scss">
.my-tabs-container {
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.my-tabs-container :deep(.t-tabs) {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.my-tabs-container :deep(.t-tabs__content) {
  flex-grow: 1;
}

.my-tabs-container :deep(.t-tabs__panel) {
  padding: 0 !important;
}

.my-tabs-container :deep(.t-tabs__panel > div) {
  margin: 0 !important;
}
</style>
