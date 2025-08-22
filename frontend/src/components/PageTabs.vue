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
.container :deep(.arco-tabs) {
  transform: translateX(14%);
}
.container :deep(.arco-tabs-tab) {
  display: flex;
  width: 100%;
  justify-content: center;
  margin-top: 2.5rem;
  margin-bottom: 1.25rem;
  padding: 0 0.5rem;
  box-sizing: border-box;
}

.container :deep(.arco-tabs-nav-vertical) {
  margin-top: 2.5rem;
  height: calc(100vh - 5rem);
}

.container :deep(.arco-tabs-tab-title) {
  font-size: 1.3rem;
  white-space: nowrap;
}
.container :deep(.arco-tabs-tab:focus) {
  outline: none;
}
</style>
