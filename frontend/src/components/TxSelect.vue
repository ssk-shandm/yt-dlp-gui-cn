<template>
  <!-- v-model 绑定一个响应式变量来接收选中的值，并通过 :options 传入一个选项数组。
   width 属性，可以强制指定组件的宽度
   auto-width="true" 自适应宽度 -->
  <div
    class="diy-select-container"
    :style="{ width: props.width }"
  >
    <t-select
      v-model="model"
      :auto-width="props.autoWidth"
    >
      <t-option
        v-for="option in props.options"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </t-select>
  </div>
</template>

<script lang="ts" setup>
import { type PropType } from 'vue'

const props = defineProps({
  // 用于 v-model 的值
  // modelValue: {
  //   type: String,
  //   required: true,
  // },
  // 选项数组
  options: {
    type: Array as PropType<{ label: string; value: any }[]>,
    required: true,
  },
  // select 组件的宽度
  width: {
    type: String,
    default: '9rem',
  },
  // 是否自动计算宽度
  autoWidth: {
    type: Boolean,
    default: false,
  },
})

const model = defineModel<string>()
</script>

<style scoped>
.diy-select-container :deep(.t-input) {
  border: 1.5px solid #0078d4;
  border-radius: 0.5rem;
  padding: 0.1875rem 0.25rem;
  height: 1.9rem;
  width: 100%;
}

.diy-select-container :deep(.t-input__inner) {
  /* 设置字体大小 */
  font-size: 1rem;

  font-weight: bold;
}

.diy-select-container :deep(.t-select__wrap) {
  width: 100%;
}
</style>
<style>
.t-select-option {
  /* font-size: 0.5rem !important; */
  font-weight: normal;
}

.t-popup__content {
  max-width: 15rem !important;
}
</style>
