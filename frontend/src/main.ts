import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import ArcoVue from '@arco-design/web-vue'
import TDesign from 'tdesign-vue-next'
import App from './App.vue'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'

import { useUrlStore } from './stores/urlStore'
import { useSettingsStore } from './stores/settingsStore'
import { useTerminalStore } from './stores/terminalStore'
import { useSubtitleStore } from './stores/subtitleStore'
import { useFormatStore } from './stores/formatStore'

import './assets/base.css'
import '@arco-design/web-vue/dist/arco.css'
import 'tdesign-vue-next/es/style/index.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ArcoVue)
app.use(TDesign)
app.mount('#app')

function connectToEel() {
  const urlStore = useUrlStore()
  const settingsStore = useSettingsStore()
  const terminalStore = useTerminalStore()
  const subtitleStore = useSubtitleStore()
  const formatStore = useFormatStore()

  if (window.eel) {
    // function 1 - 更新终端输出
    function update_terminal_output(htmlLine: string) {
      terminalStore.addLine(htmlLine)
    }
    window.eel.expose(update_terminal_output, 'update_terminal_output')

    // function 2 - 接收封面图片 URL
    function receive_thumbnail_url(imageUrl: string) {
      urlStore.setThumbnailUrl(imageUrl)
    }
    window.eel.expose(receive_thumbnail_url, 'receive_thumbnail_url')

    // function 3 - 设置下载路径
    function receive_download_path(path: string) {
      settingsStore.setDownloadPath(path)
    }
    window.eel.expose(receive_download_path, 'receive_download_path')

    // function 4 - 接收字幕列表
    function receive_subtitle_list(subtitles: any[]) {
      subtitleStore.setSubtitles(subtitles)
    }
    window.eel.expose(receive_subtitle_list, 'receive_subtitle_list')

    // function 5 - 接收格式列表
    function receive_format_list(formats: any[]) {
      formatStore.setFormats(formats)
    }
    window.eel.expose(receive_format_list, 'receive_format_list')

    // function 6 - 处理下载结果
    function handle_download_result(result: { status: string; message: string }) {
      if (result && result.status === 'success') {
        NotificationPlugin.success({ title: '下载成功', content: result.message || '下载完成！' });
      } else {
        NotificationPlugin.error({ title: '下载失败', content: result.message || '下载失败，后端错误。' });
      }
    }
    window.eel.expose(handle_download_result, 'handle_download_result');

    window.eel.frontend_is_ready()
  } else {
    setTimeout(connectToEel, 100)
  }
}

connectToEel()
