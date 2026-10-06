import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import ArcoVue from '@arco-design/web-vue'
import TDesign from 'tdesign-vue-next'
import App from './App.vue'
import { startDesktop } from './services/desktop'
import { startAppUpdates } from './services/updater'
import '@arco-design/web-vue/dist/arco.css'
import 'tdesign-vue-next/es/style/index.css'
import './assets/base.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ArcoVue)
app.use(TDesign)
app.mount('#app')
startDesktop()
void startAppUpdates()
