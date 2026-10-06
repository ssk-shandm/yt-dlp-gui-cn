<template>
  <section
    class="box-surface"
    :style="{ height: props.height }"
  >
    <header
      v-if="title"
      class="box-heading"
    >
      <span
        class="title-dot"
        aria-hidden="true"
      ></span
      >{{ title }}
    </header>
    <div class="content-wrapper"><slot /></div>
  </section>
</template>
<script lang="ts" setup>
const props = defineProps({ title: { type: String, default: '' }, height: { type: String, default: 'auto' } })
</script>
<style scoped>
.box-surface {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  border: 1px solid var(--ui-border);
  border-radius: 16px;
  background: var(--ui-surface);
  box-shadow: var(--ui-shadow);
  overflow: hidden;
  transition:
    box-shadow var(--motion-duration) ease,
    border-color var(--motion-duration) ease;
}
.box-surface:hover {
  border-color: #cbdcf1;
  box-shadow: 0 8px 24px rgba(40, 65, 100, 0.08);
}
.box-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 18px 12px;
  font-size: 13px;
  font-weight: 650;
}
.title-dot {
  width: 5px;
  height: 14px;
  background: var(--ui-accent);
  border-radius: 3px;
}
.content-wrapper {
  flex: 1;
  min-height: 0;
  padding: 4px 16px 16px;
  overflow: auto;
}
</style>
