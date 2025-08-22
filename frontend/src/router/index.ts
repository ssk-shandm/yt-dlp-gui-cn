import { createRouter, createWebHashHistory } from 'vue-router'
import TAU from '@/pages/图片链接/URLAddress.vue'
import pagetwo from '@/pages/内容处理/MainIndex.vue'
import PageThree from '@/pages/下载列表/MainIndex.vue'
import PageFour from '@/pages/终端显示/MainIndex.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path:'/',
      name: 'TabsAndURL',
      component: TAU
    },
    {
      path:'/page-two',
      name: 'page-two',
      component: pagetwo
    },
    {
      path:'/page-three',
      name: 'page-three',
      component:PageThree,
    },
    {
      path:'/page-four',
      name: 'page-four',
      component:PageFour,

    }
  ],


})


export default router
