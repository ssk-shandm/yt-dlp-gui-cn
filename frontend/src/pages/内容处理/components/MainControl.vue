<template>
  <BOX
    title="主要用法"
    class="box"
  >
    <div class="box-inner">
      <div class="box-inner-inner">
        <BBB @click="selectPath" style="width: 9vw">下载目录</BBB>

        <!-- 下载次数 -->
        <DiySelect
          v-model="settingsStore.retryTimes"
          :options="timeOptions"
          width="8vw"
            />
      </div>
      <div>
        <t-input
          disabled
          v-model="settingsStore.downloadPath"
          placeholder="默认目录为“下载”目录"
        />
      </div>
      <div class="box-inner-inner">
        <BBB @click="get_cover_image">获取封面图</BBB>
        <!-- 使用外部下载器
        <DiySelect
          v-model="download"
          :options="downloadOptions"
          width="6rem"
        /> -->
      </div>
      <!-- <div class="box-inner-inner">
        <div class="ip-change-container">
           <DiySelect
            v-model="IPchange"
            :options="ipOptions"
            width="5.5rem"
          />
        </div>
      </div>-->
      <BBB  style="width: 15vw" @click="get_all_supported_sites">列出所有支持的网站</BBB>
      <p class="ip-change-tip">下载境外视频请自行使用梯子</p>
    </div>
  </BOX>
</template>

<script lang="ts" setup>
import { useSettingsStore } from '@/stores/settingsStore'
import { useUrlStore } from '@/stores/urlStore'
import { ref, watch } from 'vue'
import BBB from '@/components/DiyButtom.vue'
import BOX from '@/components/BoxStyle.vue'
import DiySelect from '@/components/TxSelect.vue'

// 获取实例
const settingsStore = useSettingsStore()
const urlStore = useUrlStore()

const selectPath = () => {
  window.eel.select_download_directory()
}

// 下载封面图
const get_cover_image = () => {
  window.eel.download_cover_page(urlStore.currentUrl)
}

// 列出所有支持的网站
const get_all_supported_sites = () => {
  window.eel.list_all_suppost_website()
}

// 为每个下拉框定义更具体的选项
// const downloadOptions = ref([
//   { label: '无', value: 'none' },
//   { label: '最佳画质', value: 'best' },
//   { label: '仅音频 (MP3)', value: 'mp3' },
//   { label: '仅视频 (无声)', value: 'bestvideo' },
// ])

const timeOptions = ref([
  { label: '3次', value: 3 },
  { label: '5次', value: 5 },
  { label: '10次', value: 10 },
  { label: '无限', value: 'infinite' },
])

// 监视重试次数的变化
watch(
  () => settingsStore.retryTimes,
  (newValue, oldValue) => {
    console.log(`重试次数从 ${oldValue} 变为 ${newValue}`)
  },
)

// const ipOptions = ref([
//   { label: '默认IP', value: 'default' },
//   { label: '香港IP', value: 'hk' },
//   { label: '美国IP', value: 'us' },
// ])

// 3. v-model 的 ref 定义保持不变，但初始值可以更清晰
// const download = ref('best') // 可以给一个默认值
// const IPchange = ref('default')

// watch(
//   () => download.value,
//   (newValue, oldValue) => {
//     // Vue 3 watch 的参数顺序是 newValue, oldValue
//     console.log(`下载器选择从 ${oldValue} 变为 ${newValue}`)
//     if (newValue == 'none') {
//       console.log('没有选择下载器')
//     }
//   },
// )
</script>

<style scoped>
.box-inner-ousider {
  display: flex;
  flex-direction: column;
}
.box {
  align-items: center;
}

.box-inner {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.box-inner-inner {
  display: flex;
  flex-direction: row;
  gap: 0.3rem;
  align-items: center;
}

.tss {
  border-radius: 1.25rem;
}

/* .ip-change-container {
  display: flex;
  gap: 1.25rem;
  align-items: center;
} */
:deep(.t-input) {
  font-size:1rem;
}
.ip-change-tip {
  display: flex;
  justify-content: center;
  font-size: 0.7rem;
  width: auto;
  color: grey;
  margin: 0;
}
</style>
