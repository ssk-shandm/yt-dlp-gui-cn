<template>
  <div class="container">
    <a-space
      direction="vertical"
      size="large"
      justify="true"
      class="container"
    >
      <a-tabs
        :position="position"
        :active-key="activekey"
        @change="pushway"
      >
        <a-tab-pane
          key="/"
          title="图片链接"
        >
        </a-tab-pane>
        <a-tab-pane
          key="/page-two"
          title="内容处理"
        >
        </a-tab-pane>
        <!-- <a-tab-pane
          key="/page-three"
          title="下载列表"
        >
        </a-tab-pane> -->
        <a-tab-pane
          key="/page-four"
          title="终端显示"
        >
        </a-tab-pane>
      </a-tabs>
    </a-space>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const position = ref('left')

// 当前激活的路由地址
const activekey = ref(route.path)

// 监听路由地址变化
watch(
  () => route.path,
  (newval) => {
    activekey.value = newval
  },
)

function pushway(key: string) {
  router.push(key)
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.container :deep(.arco-tabs) {
  transform: translateX(14%);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.container :deep(.arco-tabs-tab) {
  display: flex;
  width: 100%;
  justify-content: center;
  margin-top: 2.5rem;
  margin-bottom: 1.25rem;
  padding: 0 0.5rem;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.container :deep(.arco-tabs-tab:hover) {
  background-color: rgba(24, 144, 255, 0.08);
  border-radius: 0.5rem;
}

.container :deep(.arco-tabs-nav-vertical) {
  margin-top: 2.5rem;
  height: calc(100vh - 5rem);
}

.container :deep(.arco-tabs-tab-title) {
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.container :deep(.arco-tabs-tab[aria-selected='true'] .arco-tabs-tab-title) {
  font-size: 1.05rem;
  font-weight: 600;
  color: #1890ff;
}

.container :deep(.arco-tabs-tab:focus) {
  outline: none;
}

.container :deep(.arco-tabs-ink) {
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(180deg, #1890ff 0%, #0050b3 100%);
}
</style>
