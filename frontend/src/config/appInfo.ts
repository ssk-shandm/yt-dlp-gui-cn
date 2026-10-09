import { version } from '../../package.json'
export const APP_NAME = 'yt-dlp GUI 中文版'
export const APP_VERSION = version
export const COPYRIGHT_LINE = 'Copyright © 2025 ssk-shandm'
export const LICENSE_NAME = 'MIT License'
export const REPOSITORY_URL = 'https://github.com/ssk-shandm/yt-dlp-gui-cn'
export const RELEASES_URL = `${REPOSITORY_URL}/releases`
export const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`
export const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp'
export const FFMPEG_URL = 'https://ffmpeg.org/'
export const FFMPEG_BUILDS_URL = 'https://github.com/BtbN/FFmpeg-Builds'
export const ABOUT_URLS = [REPOSITORY_URL, RELEASES_URL, LICENSE_URL, YTDLP_URL, FFMPEG_URL, FFMPEG_BUILDS_URL]
export const APP_PAGES = [
  {
    path: '/',
    title: '图片链接',
    eyebrow: '开始下载',
    description: '从一个链接开始，分析视频并获取最佳画质。',
    icon: 'image',
  },
  {
    path: '/page-two',
    title: '内容处理',
    eyebrow: '自定义下载',
    description: '选择视频、音频与字幕，让下载更符合你的需要。',
    icon: 'video',
  },
  {
    path: '/page-three',
    title: '下载列表',
    eyebrow: '任务管理',
    description: '查看本次运行的下载任务与完成状态。',
    icon: 'download',
  },
  {
    path: '/page-four',
    title: '终端显示',
    eyebrow: '运行日志',
    description: '实时查看工具输出，定位分析与下载过程中的问题。',
    icon: 'terminal',
  },
  {
    path: '/about',
    title: '关于',
    eyebrow: '项目说明',
    description: '了解应用、开源许可与项目相关信息。',
    icon: 'info',
  },
] as const
