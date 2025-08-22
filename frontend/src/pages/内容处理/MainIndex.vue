<template>
  <div class="container">
    <div class="top-contianer">
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
}

.top-contianer {
  display: flex;
flex-direction: row;
  justify-content: space-between;
  gap: 0.5rem;
  padding-top: 0.5rem;
}
.bottom-container {
  padding-top: 1rem;
  display: flex;
  overflow: hidden;

}
</style>
