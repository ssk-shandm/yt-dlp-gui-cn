<template>
  <div
    class="container"
    :style="{ height: props.height }"
  >
    <div
      v-if="title"
      class="title-wrapper"
    >
      <span class="title-tag">{{ title }}</span>
      <div class="title-divider"></div>
    </div>

    <slot />
  </div>
</template>

<script lang="ts" setup>
// 接收标题文字
const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  height: {
    type: String,
    default: 'auto',
  },
})
</script>

<style lang="scss" scoped>
.container {
  --container-bg-color: #e0e2e5;
  --shadow-color-dark: #a3b1c6;
  --shadow-color-light: #ffffff;
  --win11-blue: #0078d4;

  position: relative;
  display: inline-flex;

  display: flex;
  flex-direction: column;

  padding: 0.8rem;
  padding-top: 1.875rem;
  padding-bottom: 0.5rem;

  background-color: var(--container-bg-color);
  border-radius: 1.25rem;

  box-shadow:
    inset 0.0625rem 0.0625rem 0.1875rem rgba(163, 177, 198, 0.6),
    inset -0.0625rem -0.0625rem 0.1875rem rgba(255, 255, 255, 1),
}

// 标题
.title-wrapper {
  position: absolute;
  top: 0;
  left: 1.25rem;
  transform: translateY(-30%);
  right: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.title-tag {
  background-color: var(--win11-blue);
  color: white;
  /* 大标题 */
  font-size: 1rem;
  font-weight: bold;
  padding: 0.125rem 0.75rem;
  border-radius: 0.5rem;
  box-shadow: 0 0.125rem 0.3125rem rgba(0, 0, 0, 0.2);
}

.title-divider {
  background-color: var(--win11-blue);
  height: 0.8px;
  width: 100%;
  border-radius: 2px;
  margin-top: 0.5625rem;
}
</style>
