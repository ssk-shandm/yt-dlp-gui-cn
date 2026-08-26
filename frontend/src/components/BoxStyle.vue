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
    </div>

    <div class="card">
      <div class="content-wrapper">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
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
  --win11-blue: #0078d4;

  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: v-bind('props.height');
}

.title-wrapper {
  position: absolute;
  top: 0;
  left: 1.25rem;
  transform: translateY(-40%);
  z-index: 1;
}

.title-tag {
  display: inline-block;
  background-color: var(--win11-blue);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  box-shadow: 0 0.125rem 0.3125rem rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: var(--container-bg-color);
  border-radius: 1.25rem;
  box-shadow:
    inset 0.0625rem 0.0625rem 0.1875rem rgba(163, 177, 198, 0.6),
    inset -0.0625rem -0.0625rem 0.1875rem rgba(255, 255, 255, 1);
  overflow: hidden;
}

.content-wrapper {
  flex: 1;
  padding: 1.375rem 0.8rem 0.8rem 0.8rem;
  overflow: auto;
  min-height: 0;
}
</style>
