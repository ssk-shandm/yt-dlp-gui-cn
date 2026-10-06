<template>
  <div class="container">
    <div class="top-container">
      <MControl />
      <VCaptions />
      <DDownload />
    </div>
    <div class="bottom-container">
      <VList />
    </div>
  </div>
</template>

<script lang="ts" setup>
import MControl from '@/pages/内容处理/components/MainControl.vue'
import VCaptions from '@/pages/内容处理/components/VideoCaptions.vue'
import DDownload from '@/pages/内容处理/components/DiyDownload.vue'
import VList from '@/pages/内容处理/components/VideoList.vue'
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  box-sizing: border-box;
  gap: 20px;
}
.top-container {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(220px, 1.45fr) minmax(220px, 1.3fr);
  gap: 16px;
  align-items: stretch;
}
.top-container > * {
  min-width: 0;
}
.bottom-container {
  display: flex;
  min-height: 340px;
  flex: 1;
}
@media (max-width: 1100px) {
  .top-container {
    grid-template-columns: 1fr 1fr;
  }
  .top-container > :last-child {
    grid-column: 1 / -1;
  }
}
@media (max-width: 760px) {
  .top-container {
    grid-template-columns: 1fr;
  }
}
</style>
