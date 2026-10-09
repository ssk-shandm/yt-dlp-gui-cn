export default {
  eyebrow: '下载工具 · 从上游获取',
  heading: {
    manage: '管理下载工具',
    setup: '准备你的下载工具',
  },
  intro: '应用不会捆绑第三方 EXE。请选择 FFmpeg 构建，程序将校验下载文件后安装到本地 bin 目录。',
  profileLegend: '选择工具版本',
  profile: {
    basic: {
      title: '基础版',
      tag: '推荐',
      license: 'FFmpeg LGPL 静态构建',
      description: '用于常见下载、音视频合并和转封装。不包含 libx264 / libx265 等 GPL 编码库。',
      size: '较小 · 总下载约 200 MB 起',
    },
    full: {
      title: '完整版',
      license: 'FFmpeg GPL 静态构建',
      description: '增加 GPL 编码库，适合需要更多编码、滤镜及后处理能力的用户。',
      size: '功能更全 · 总下载约 230 MB 起',
    },
  },
  note: '两种配置使用相同的 yt-dlp。体积随上游版本变化；基础版也可随时在“关于”页升级为完整版。上游工具适用各自许可证。',
  progressLabel: '工具下载进度',
  cancelling: '正在取消…',
  cancel: '取消安装',
  close: '关闭',
  later: '稍后安装',
  installing: '正在安装…',
  retry: '重试安装',
  install: '下载并安装',
  offlineNote: '首次安装需要网络；大文件支持最多 4 路连接，线路较慢时可取消后重试。下载失败或取消不会替换已安装的工具；无工具时不能解析或下载视频。',
  remaining: {
    seconds: '预计剩余 {n} 秒',
    minutes: '预计剩余 {n} 分钟',
  },
  progress: {
    detail: '{stage}：{percent}%（{downloaded} / {total} MiB）',
  },
  status: {
    reading: '正在读取上游版本并准备下载…',
    cancelling: '正在取消并清理临时文件…',
    cancelled: '已取消工具安装，原有工具保持不变。',
    failed: '安装未成功，原有工具保持不变；可检查网络后重试。',
    installedBasic: '基础版工具安装成功。',
    installedFull: '完整版工具安装成功。',
  },
  errors: {
    browserPreview: '浏览器预览不能下载安装工具，请使用桌面程序。',
    activeTasks: '仍有下载或解析任务，请等待任务结束后安装工具。',
    incomplete: '工具安装结果不完整，请重试。',
  },
}
