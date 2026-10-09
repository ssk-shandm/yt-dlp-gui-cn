export default {
  progress: '新手教程 · {current} / {total}',
  skip: '跳过',
  previous: '上一步',
  next: '下一步',
  finish: '完成',
  steps: {
    paste: {
      title: '粘贴视频链接',
      description: '把视频页面的网址粘贴到这里。支持 http 和 https 视频链接。教程只介绍操作，不会自动下载或更改设置。',
    },
    analyze: {
      title: '分析链接',
      description: '点击“分析链接”，程序会读取封面、可用画质和字幕信息。请先填写视频链接，按钮才会启用。',
    },
    quickDownload: {
      title: '快速下载',
      description: '分析完成后，点击“快速下载”即可自动选择最佳视频和音频。尚未分析时，按钮显示为灰色。',
    },
    customPage: {
      title: '自定义下载',
      description: '需要指定画质、音频或字幕时，打开“内容处理”进行选择。接下来介绍这里的下载设置。',
    },
    directory: {
      title: '设置下载目录',
      description: '点击“下载目录”选择文件保存位置，下方会显示当前目录。建议在下载前先确认保存位置。',
    },
    retry: {
      title: '设置重试次数',
      description: '下载失败时按这里的设置重试，可选 3 次、5 次、10 次或无限。新手建议先用有限次数，避免反复重试。',
    },
    subtitles: {
      title: '下载字幕',
      description: '分析完成后，字幕列表会显示可用语言和格式，点击对应行的“下载”即可保存字幕。列表为空时，当前链接没有可用字幕或尚未完成分析。',
    },
    videoAudio: {
      title: '选择视频和音频',
      description: '在 DIY 下载中分别选择视频画质和音频轨道。选项来自已分析的视频，尚未分析或没有独立轨道时，选项可能为空。',
    },
    container: {
      title: '选择输出格式',
      description: '这里选择合成后文件的封装格式。画质和音频由上一项决定，更换封装格式不会自动提升画质。',
    },
    customStart: {
      title: '开始自定义下载',
      description: '确认视频、音频和格式后，点击“下载”开始合成下载。此操作可能占用较多 CPU；本教程不会触发下载。',
    },
    formatFilter: {
      title: '筛选可用格式',
      description: '可用格式列表支持筛选仅视频、仅音频或视频加音频。还可以用旁边的排序查看分辨率、大小或码率，按需下载对应格式。',
    },
    tasks: {
      title: '查看任务',
      description: '在“下载列表”查看下载中的任务、完成状态和保存结果。',
    },
    logs: {
      title: '查看详细日志',
      description: '遇到问题时打开“终端显示”，这里会显示解析和下载的详细信息。',
    },
    copyLogs: {
      title: '复制日志排查问题',
      description: '有日志时点击“复制日志”可复制终端内容，便于排查失败原因。分享前请检查链接等私人信息；没有日志时按钮会禁用。',
    },
    tools: {
      title: '安装下载工具',
      description: '解析和下载需要 yt-dlp、FFmpeg 等工具。在“关于”页点击此按钮选择基础版或完整版并安装；首次安装需要网络，教程不会开始安装。',
    },
    updates: {
      title: '检查软件更新',
      description: '点击“检查并安装更新”可手动安装正式版更新，也可在上方设置自动检测。安装成功后会重启程序，建议先完成当前任务。',
    },
  },
}
