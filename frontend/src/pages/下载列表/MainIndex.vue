<template>
  <div class="container">
    <h3>下载进度:</h3>
    <div style="width:200px">
      <t-progress :percentage="50" theme="plump" label strokeWidth="20px" />
    </div>
  </div>
  <div>
    <div>
      <DownloadAndFinishedTabs />
    </div>
  </div>
</template>

<script lang="ts" setup>

import DownloadAndFinishedTabs from '@/pages/下载列表/components/DAFTabs.vue';


</script>

<style lang="scss" scoped>
.container {
  display: flex;
  gap: 2.5rem;
  align-items: center;
  margin-top: 1.875rem;
  padding-left: 2.5rem;
  border-bottom: 1px solid #ccc;
}

.container :deep(.t-progress__bar) {
  width: 65vw;
}
</style>
