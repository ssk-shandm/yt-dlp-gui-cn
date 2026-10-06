<template>
  <div class="page-container">
    <Tabs class="sidebar" />
    <main
      class="main-content"
      aria-label="页面内容"
    >
      <header class="page-heading">
        <div>
          <span class="section-eyebrow">{{ currentPage.eyebrow }}</span>
          <h1>{{ currentPage.title }}</h1>
          <p>{{ currentPage.description }}</p>
        </div>
      </header>
      <aside v-if="updater.message && route.path !== '/about'" class="update-notice" role="status" aria-live="polite">
        <span>{{ updater.message }}<template v-if="updater.phase === 'downloading' && updater.progress !== null"> {{ updater.progress }}%</template></span>
        <router-link to="/about">更新设置</router-link>
      </aside>
      <div class="page-body">
        <router-view v-slot="{ Component }">
          <Transition
            name="page"
            mode="out-in"
          >
            <KeepAlive>
              <component
                :is="Component"
                :key="route.path"
              />
            </KeepAlive>
          </Transition>
        </router-view>
      </div>
    </main>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Tabs from './components/PageTabs.vue'
import { appUpdater } from './services/updater'
const updater = appUpdater.state
import { APP_PAGES } from './config/appInfo'
const route = useRoute()
const currentPage = computed(() => APP_PAGES.find((page) => page.path === route.path) ?? APP_PAGES[0]!)
</script>
<style scoped>
.page-container {
  display: flex;
  height: 100dvh;
  width: 100%;
  gap: var(--layout-gap);
  padding: var(--layout-padding);
  box-sizing: border-box;
  overflow: hidden;
}
.sidebar {
  flex: 0 0 208px;
  min-width: 0;
}
.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.page-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 6px 4px 22px;
}
.page-heading h1 {
  margin: 5px 0 8px;
  font-size: 26px;
  letter-spacing: -0.6px;
  font-weight: 700;
}
.page-heading p {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 13px;
  line-height: 1.6;
}
.update-notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 4px 12px; padding: 10px 14px; background: #edf5ff; border: 1px solid var(--ui-border); border-radius: 10px; color: var(--ui-accent); font-size: 12px; line-height: 1.6; }
.update-notice span { overflow-wrap: anywhere; }
.update-notice a { flex-shrink: 0; color: inherit; }
.page-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 2px 4px 4px;
}
.page-enter-active,
.page-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@media (max-width: 1100px) {
  .sidebar {
    flex-basis: 184px;
  }
}
@media (max-width: 760px) {
  .sidebar {
    flex-basis: 76px;
  }
  .page-heading {
    padding-bottom: 16px;
  }
  .page-heading h1 {
    font-size: 22px;
  }
}
</style>
