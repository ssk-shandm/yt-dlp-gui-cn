<template>
  <BOX title="DIY下载">
    <div class="container">
      <div class="command-preview">
        <div class="select-group">
          <div class="select-item">
            <label class="select-label">视频质量</label>
            <DiySelect
              v-model="selectedVideoId"
              :options="videoQualityOptions"
              width="17.5vw"
            />
          </div>
          <div class="select-item">
            <label class="select-label">音频质量</label>
            <DiySelect
              v-model="selectedAudioId"
              :options="audioQualityOptions"
              width="17.5vw"
            />
          </div>
          <div class="select-item">
            <label class="select-label">输出格式</label>
            <DiySelect
              v-model="selectedContainerFormat"
              :options="containerFormatOptions"
              width="17.5vw"
            />
          </div>
        </div>
        <BBB
          style="width: 5rem; margin-top: 10px"
          @click="handleDownload"
        >
          下载
        </BBB>
      </div>

      <p class="cpu-warning">此下载方式可能会占用极高的cpu</p>
    </div>
  </BOX>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import DiySelect from '@/components/TxSelect.vue'
import BOX from '@/components/BoxStyle.vue'
import BBB from '@/components/DiyButtom.vue'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'
import { useUrlStore } from '@/stores/urlStore'
import { useFormatStore } from '@/stores/formatStore'

// 实例
const urlStore = useUrlStore()
const formatStore = useFormatStore()

const { formats } = storeToRefs(formatStore)

// 视频质量选项
const videoQualityOptions = computed(() => {
  return formats.value
    .filter((file) => file.vcodec !== 'none' && file.acodec === 'none') // 筛选出纯视频流
    .map((file) => ({
      label: `${file.resolution || ''} (${file.ext}) @ ${file.vbr || file.tbr || 'N/A'}`,
      value: file.id,
    }))
})

// 音频质量选项
const audioQualityOptions = computed(() => {
  return formats.value
    .filter((file) => file.acodec !== 'none' && file.vcodec === 'none') // 筛选出纯音频流
    .map((file) => ({
      label: `${file.acodec} (${file.ext}) @ ${file.abr || 'N/A'}`,
      value: file.id,
    }))
})

// 格式选择
const containerFormatOptions = ref([
  { label: 'MP4 (兼容性好)', value: 'mp4' },
  { label: 'MKV (功能强大)', value: 'mkv' },
  { label: 'WebM (网页格式)', value: 'webm' },
])

const selectedVideoId = ref<string | undefined>(undefined)
const selectedAudioId = ref<string | undefined>(undefined)
const selectedContainerFormat = ref('mp4')

// 监听视频选项
watch(videoQualityOptions, (newOptions) => {
  if (newOptions.length > 0) {
    selectedVideoId.value = newOptions[0].value
  } else {
    selectedVideoId.value = undefined
  }
})

// 监听音频选项
watch(audioQualityOptions, (newOptions) => {
  if (newOptions.length > 0) {
    selectedAudioId.value = newOptions[0].value
  } else {
    selectedAudioId.value = undefined
  }
})

// 更新下载函数
const handleDownload = () => {
  if (!urlStore.currentUrl) {
    NotificationPlugin.warning({ title: '操作提示', content: '你小子,又忘了分析了吧' })
    return
  }
  // 校验
  if (!selectedVideoId.value || !selectedAudioId.value) {
    NotificationPlugin.warning({ title: '操作提示', content: '选好规格!' })
    return
  }

  NotificationPlugin.info({ title: '系统提示', content: 'DIY 合成下载任务已开始...', duration: 5000 })
  window.eel.download_diy_format(
    urlStore.currentUrl,
    selectedVideoId.value,
    selectedAudioId.value,
    selectedContainerFormat.value,
  )
}

// // 更新下载函数
// const handleDownload = async () => {
//   if (!urlStore.currentUrl) {
//     NotificationPlugin.warning({ title: '操作提示', content: '你小子,又忘了分析了吧' })
//     return
//   }
//   // 校验
//   if (!selectedVideoId.value || !selectedAudioId.value) {
//     NotificationPlugin.warning({ title: '操作提示', content: '选好规格!' })
//     return
//   }

//   let loadingMsg = null;
//   try {
//     loadingMsg = NotificationPlugin.info({ title: '系统提示', content: 'DIY中...', duration: 0 })
//     const result = await window.eel.download_diy_format(
//       urlStore.currentUrl,
//       selectedVideoId.value,
//       selectedAudioId.value,
//       selectedContainerFormat.value,
//     )

//     NotificationPlugin.close(loadingMsg)
//     if (result.status === 'success') {
//       NotificationPlugin.success({ title: '下载成功', content: result.message })
//     } else {
//       NotificationPlugin.error({ title: '下载失败', content: result.message })
//     }
//   } catch (e) {
//     if (loadingMsg) {
//         NotificationPlugin.close(loadingMsg)
//     }
//     NotificationPlugin.error({ title: '严重错误', content: '错误' })
//     console.error(e)
//   }
// }
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  align-items: center;
  padding: 0.625rem;
}
.command-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.select-group {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.select-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3125rem;
}

.select-label {
  font-size: 0.55rem;
  font-weight: 500;
  color: #333;
  margin-left: 0.5rem;
}
.cpu-warning {
  font-size: 0.7rem;
  color: #888;
  margin: 0;
  max-width: 11.25rem;
  text-align: center;
}
</style>
