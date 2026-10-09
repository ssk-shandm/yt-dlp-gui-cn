<template>
  <aside class="leftbar">
    <span class="nav-caption">{{ $t('common.workspace') }}</span>
    <nav
      class="navigation"
      :aria-label="$t('common.mainNav')"
    >
      <RouterLink
        v-for="page in workspacePages"
        :key="page.path"
        :to="page.path"
        class="nav-item"
        :title="$t(page.titleKey)"
        active-class=""
        exact-active-class="is-active"
      >
        <component
          :is="icons[page.icon]"
          class="nav-icon"
          aria-hidden="true"
        />
        <span>{{ $t(page.titleKey) }}</span>
        <span
          v-if="page.path === '/page-three' && runningCount"
          class="task-count"
          >{{ runningCount }}</span
        >
      </RouterLink>
    </nav>
    <div class="sidebar-footer">
      <button type="button" class="nav-item guide-button" :title="$t('common.beginnerGuide')" @click="openGuide">
        <IconQuestionCircle class="nav-icon" aria-hidden="true" /><span>{{ $t('common.beginnerGuide') }}</span>
      </button>
      <RouterLink
        to="/about"
        class="nav-item"
        :title="$t('common.pages.about.title')"
        active-class=""
        exact-active-class="is-active"
      >
        <IconInfoCircle
          class="nav-icon"
          aria-hidden="true"
        /><span>{{ $t('common.pages.about.title') }}</span>
      </RouterLink>
      <button
        type="button"
        class="nav-item language-button"
        :title="$t('common.switchLanguageTitle')"
        @click="toggleLocale"
      >
        <IconLanguage class="nav-icon" aria-hidden="true" /><span>{{ $t('common.switchLanguageLabel') }}</span>
      </button>
    </div>
  </aside>
</template>
<script lang="ts" setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { IconImage, IconVideoCamera, IconDownload, IconCode, IconInfoCircle, IconQuestionCircle, IconLanguage } from '@arco-design/web-vue/es/icon'
import { APP_PAGES } from '@/config/appInfo'
import { i18n, setLocale } from '@/i18n'
import { useTaskStore } from '@/stores/taskStore'
const icons = {
  image: IconImage,
  video: IconVideoCamera,
  download: IconDownload,
  terminal: IconCode,
  info: IconInfoCircle,
}
const workspacePages = APP_PAGES.filter((page) => page.path !== '/about')
const tasks = useTaskStore()
const runningCount = computed(() => tasks.tasks.filter((task) => task.status === 'running').length)
function openGuide() {
  window.dispatchEvent(new Event('start-beginner-guide'))
}
function toggleLocale() {
  setLocale(i18n.global.locale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
}
</script>
<style scoped>
.leftbar {
  display: flex;
  flex-direction: column;
  padding: 16px 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: var(--ui-shadow);
  box-sizing: border-box;
}
.nav-caption {
  padding: 4px 14px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ui-text-muted);
  letter-spacing: 1px;
}
.navigation {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--ui-text-muted);
  font-size: 14px;
  font-weight: 500;
  transition:
    color var(--motion-duration) ease,
    background var(--motion-duration) ease,
    transform var(--motion-duration) ease;
}
.nav-item:hover {
  background: #f1f6fd;
  color: var(--ui-accent);
  transform: translateX(2px);
}
.nav-item.is-active {
  background: var(--ui-accent-soft);
  color: var(--ui-accent);
  font-weight: 650;
}
.nav-item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  width: 3px;
  height: 18px;
  border-radius: 4px;
  background: var(--ui-accent);
}
.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  transition: transform var(--motion-duration) ease;
}
.nav-item:hover .nav-icon {
  transform: scale(1.08);
}
.task-count {
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 6px;
  background: #dceafa;
  font-size: 11px;
}
.sidebar-footer {
  margin-top: auto;
  padding-top: 20px;
}
.guide-button, .language-button { width: 100%; border: 0; background: transparent; font: inherit; text-align: left; cursor: pointer; }
.language-button { margin-top: 8px; }
@media (max-width: 1100px) {
  .nav-item {
    padding: 0 10px;
  }
}
@media (max-width: 760px) {
  .leftbar {
    padding: 18px 8px 12px;
    border-radius: 16px;
  }
  .nav-caption,
  .nav-item > span {
    display: none;
  }
  .navigation {
    margin-top: 4px;
  }
  .nav-item {
    justify-content: center;
    padding: 0;
  }
}
</style>
