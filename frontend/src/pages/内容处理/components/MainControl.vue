<template>
  <BOX title="主要用法" class="box">
    <div class="box-inner">
      <div class="row-group">
        <BBB @click="selectPath" class="btn-sm">下载目录</BBB>
        <DiySelect
          v-model="settingsStore.retryTimes"
          :options="timeOptions"
          class="select-sm"
        />
      </div>
      <t-input
        disabled
        v-model="settingsStore.downloadPath"
        placeholder="默认目录"
        size="small"
      />
      <div class="row-group">
        <BBB @click="get_cover_image" class="btn-sm">获取封面</BBB>
        <BBB @click="get_all_supported_sites" class="btn-sm">支持网站</BBB>
      </div>
      <p class="tip-text">下载境外视频请自行使用梯子</p>
    </div>
  </BOX>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/stores/settingsStore'
import { ref, watch } from 'vue'
import BBB from '@/components/DiyButtom.vue'
import BOX from '@/components/BoxStyle.vue'
import DiySelect from '@/components/TxSelect.vue'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'

const settingsStore = useSettingsStore()

const selectPath = () => {
  window.eel.select_download_directory()
}

const get_cover_image = () => {
  if (!settingsStore.downloadPath) {
    NotificationPlugin.warning({ title: '操作提示', content: '请先选择下载目录' })
    return
  }
  NotificationPlugin.info({ title: '系统提示', content: '已请求获取封面...' })
  window.eel.download_cover_page(settingsStore.downloadPath)
}

const get_all_supported_sites = () => {
  NotificationPlugin.info({ title: '系统提示', content: '正在获取列表，请稍后在终端查看...' })
  window.eel.list_all_suppost_website()
}

const timeOptions = ref([
  { label: '3次', value: 3 },
  { label: '5次', value: 5 },
  { label: '10次', value: 10 },
  { label: '无限', value: 'infinite' },
])

watch(
  () => settingsStore.retryTimes,
  (newValue) => {
    console.log(`重试次数已设置为: ${newValue}`)
  },
)
</script>

<style scoped>
.box-inner {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
}

.row-group {
  display: flex;
  gap: 0.3rem;
  align-items: center;
  flex-wrap: wrap;
}

.btn-sm {
  flex: 1;
  min-width: 5rem;
  padding: 0.25rem 0.5rem !important;
  font-size: 0.8rem !important;
  height: 1.8rem !important;
}

.select-sm {
  flex: 1;
  min-width: 6rem;
}

.select-sm :deep(.t-select) {
  height: 1.8rem;
  font-size: 0.8rem;
}

:deep(.t-input) {
  font-size: 0.8rem;
  height: 1.8rem;
}

:deep(.t-input__input) {
  padding: 0.25rem 0.5rem;
}

.tip-text {
  font-size: 0.65rem;
  color: #666;
  margin: 0;
  text-align: center;
}
</style>
