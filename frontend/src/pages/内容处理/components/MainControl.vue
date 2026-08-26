<template>
  <BOX title="主要用法" class="box">
    <div class="box-inner">
      <div class="box-inner-inner">
        <BBB @click="selectPath" class="btn-adaptive">
          下载目录
        </BBB>
        <DiySelect
          v-model="settingsStore.retryTimes"
          :options="timeOptions"
          class="select-adaptive"
        />
      </div>
      <div>
        <t-input
          disabled
          v-model="settingsStore.downloadPath"
          placeholder="默认目录为下载目录"
        />
      </div>
      <div class="box-inner-inner">
        <BBB @click="get_cover_image">获取封面图</BBB>
      </div>
      <BBB class="btn-full-width" @click="get_all_supported_sites">
        列出所有支持的网站
      </BBB>
      <p class="ip-change-tip">下载境外视频请自行使用梯子</p>
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
.box {
  align-items: stretch;
}

.box-inner {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}

.box-inner-inner {
  display: flex;
  flex-direction: row;
  gap: 0.4rem;
  align-items: center;
  flex-wrap: wrap;
}

.btn-adaptive {
  flex: 1;
  min-width: 5rem;
}

.btn-full-width {
  width: 100%;
}

.select-adaptive {
  flex: 1;
  min-width: 6rem;
}

:deep(.t-input) {
  font-size: 0.875rem;
  width: 100%;
}

.ip-change-tip {
  display: flex;
  justify-content: center;
  font-size: 0.65rem;
  width: auto;
  color: grey;
  margin: 0;
  margin-top: 0.25rem;
}

@media (max-width: 1200px) {
  .box-inner-inner {
    flex-direction: column;
  }

  .btn-adaptive,
  .select-adaptive {
    width: 100%;
  }
}
</style>
