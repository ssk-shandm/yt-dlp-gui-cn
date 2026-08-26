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

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  gap: 1rem;
  padding: 0 0.5rem 0.5rem 0.5rem;
}

.top-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

.bottom-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

@media (max-width: 1200px) {
  .top-container {
    flex-direction: column;
  }

  .top-container > * {
    width: 100%;
  }
}
</style>
