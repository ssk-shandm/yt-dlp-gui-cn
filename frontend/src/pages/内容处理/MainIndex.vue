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
  gap: 0.75rem;
  align-items: stretch;
  flex: 3 1 0;
  min-height: 0;
  padding-top: 2px;
}

.top-container > * {
  min-width: 10rem;
}

.top-container > *:nth-child(1) {
  flex: 2;
}

.top-container > *:nth-child(2) {
  flex: 5;
  min-width: 16rem;
}

.top-container > *:nth-child(3) {
  flex: 3;
}

.bottom-container {
  flex: 7 1 0;
  display: flex;
  overflow: visible;
  min-height: 0;
}

@media (max-width: 1600px) {
  .top-container > * {
    min-width: 8rem;
  }

  .top-container > *:nth-child(2) {
    min-width: 12rem;
  }
}
</style>
