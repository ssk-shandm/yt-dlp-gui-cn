<template>
  <button class="solid-button" v-bind="$attrs">
    <slot>Download</slot>
  </button>
</template>

<style scoped>
.solid-button {
  --btn-default-bg: #f5f5f5;
  --btn-default-border: #0078d4;
  --btn-default-text: #333333;
  --btn-hover-bg: #ffffff;
  --btn-hover-border: #c0c0c0;
  --btn-hover-text: #000000;
  --btn-active-bg: #e9e9e9;

  font-size: 1rem;
  font-weight: 600;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;

  background-color: var(--btn-default-bg);
  border: 1.5px solid var(--btn-default-border);
  color: var(--btn-default-text);

  transition: all 0.2s ease-in-out;
}

.solid-button:hover {
  background-color: var(--btn-hover-bg);
  border-color: var(--btn-hover-border);
  color: var(--btn-hover-text);
  transform: translateY(-2px);
  box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1);
}

.solid-button:active {
  background-color: var(--btn-active-bg);
  transform: translateY(1px);
  box-shadow: 0 0.0625rem 0.25rem rgba(0, 0, 0, 0.1);
  transition: all 0.05s ease;
}
</style>
