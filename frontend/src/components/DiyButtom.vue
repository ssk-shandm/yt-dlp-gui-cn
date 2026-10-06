<template>
  <button
    class="solid-button"
    type="button"
  >
    <slot>Download</slot>
  </button>
</template>
<style scoped>
.solid-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  padding: 8px 16px;
  border: 1px solid #c9d9ee;
  border-radius: 9px;
  background: #f7faff;
  color: var(--ui-accent);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform var(--motion-duration) ease,
    box-shadow var(--motion-duration) ease,
    background var(--motion-duration) ease;
}
.solid-button:not(:disabled):hover {
  background: #edf5ff;
  border-color: #8eb5e8;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(23, 107, 204, 0.12);
}
.solid-button:not(:disabled):active {
  transform: translateY(0);
  box-shadow: none;
}
.solid-button:disabled {
  background: #f3f5f8;
  border-color: #e3e8ef;
  color: #8694a6;
  cursor: not-allowed;
}
</style>
