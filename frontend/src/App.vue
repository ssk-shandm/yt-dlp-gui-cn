<template>
  <div class="page-container">
    <Tabs class="sidebar" />

    <main class="main-content">
      <router-view v-slot="{ Component }">
        <keep-alive include="TabsAndURL,page-two,page-three,page-four">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import Tabs from './components/PageTabs.vue'
</script>

<style scoped>
.page-container {
  display: flex;
  height: 100vh;
  background-color: #f0f2f5;
  width: 100vw;
  gap: 1rem;
}

/* 侧边栏样式 */
.sidebar {
  flex-shrink: 0;
  max-width: 12.5rem;
  transition: width 0.2s ease-in-out;
}

/* 主内容区域样式 */
.main-content {
  box-sizing: border-box;
  flex-grow: 1;
  overflow-y: auto;
  padding-top: 1rem;
  padding-right: 0.5rem;
}
</style>
