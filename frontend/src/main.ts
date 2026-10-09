import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import ArcoVue from '@arco-design/web-vue'
import TDesign from 'tdesign-vue-next'
import App from './App.vue'
import { i18n, type Locale } from './i18n'
import { applyArcoLocale } from './i18n/uiLibraries'
import { startDesktop } from './services/desktop'
import { startAppUpdates } from './services/updater'
import '@arco-design/web-vue/dist/arco.css'
import 'tdesign-vue-next/es/style/index.css'
import './assets/base.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(ArcoVue)
app.use(TDesign)
watch(i18n.global.locale, (locale) => {
  document.title = i18n.global.t('common.appName')
  applyArcoLocale(locale as Locale)
}, { immediate: true })
app.mount('#app')
startDesktop()
void startAppUpdates()
