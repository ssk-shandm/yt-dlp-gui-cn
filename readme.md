# yt-dlp GUI 中文版

**yt-dlp 视频下载器的中文图形界面**：面向 Windows，提供中文界面（汉化）、视频下载、音频提取、字幕与封面下载，无需输入命令。

基于 **Vue 3 + TypeScript + Tauri 2 / Rust** 的 Windows 桌面下载工具。下载与媒体合并由外部 **yt-dlp / FFmpeg** 完成，Windows 安装包采用 **NSIS**。


## 功能

- 分析视频链接，查看封面、可用视频/音频格式、人工字幕列表。
- 快速下载最佳质量，或选择指定格式、音视频组合和 MP4 / MKV / WebM 封装。
- 下载封面、简介和指定语言字幕；在终端查看工具输出与下载进度。
- 原生目录选择，保存下载目录与重试次数。
- 本次运行任务列表、取消任务、失败提示；正常退出时清理下载进程树。
- Windows x64 NSIS 安装包，随包携带三个下载工具，无需用户单独安装 Python / Node.js / Rust。
- 桌面端可检查 GitHub Releases；发现更新时下载并启动匹配的 `*-setup.exe`，有活动任务时会延后安装。

## 开发启动

需要 Windows、Node.js **22.18+ 或 24+**、Rust stable MSVC、Visual Studio C++ Build Tools、WebView2。推荐使用 Node.js 22/24 LTS；本项目仅验证 Windows x64。

先把可信来源的 Windows x64 工具放到根目录：

```text
bin/
  yt-dlp.exe
  ffmpeg.exe
  ffprobe.exe
```

```powershell
cd frontend
npm ci
npm run tools:check
npm run desktop:dev
```

仅预览界面可运行 `npm run dev`，但普通浏览器没有 Tauri IPC，不能下载或选择本地目录。

## 更新机制

自动更新仅在 Tauri 桌面端可用，浏览器预览、开发版和便携版不会尝试替换当前程序。应用直接读取项目 GitHub Releases API，比较正式版本号，并在 Release 资产中查找文件名以 `-setup.exe` 结尾的 Windows NSIS 安装包。

- “关于”页可手动检查并安装；启动时的自动检查可在“设置”中关闭。
- 下载或解析任务运行期间不会启动安装，任务结束后再继续；下载过程中显示进度。
- 下载器使用系统信任的根证书及 Windows 系统代理，保持 HTTPS 证书校验；若失败，提示会显示底层证书、连接或超时原因。
- 更新链接只接受 HTTPS GitHub Release 资产；安装器启动后应用退出，由 NSIS 完成覆盖安装并重新启动。
- 发布新版本时，必须上传 `npm run desktop:build` 生成的 `*-setup.exe`。当前实现不读取 `latest.json`、`.sig` 或 Tauri updater endpoint。

## 打包 NSIS

```powershell
cd frontend
npm run desktop:build
```

默认产物目录：`frontend/src-tauri/target/release/bundle/nsis/`。安装器为当前用户安装，并在缺少 WebView2 时尝试联网安装运行时。离线安装策略、签名和第三方工具许可见 [BUILD.md](docs/BUILD.md)。

## 文档

- [项目文档索引](docs/README.md)
- [开发指南](docs/DEVELOPMENT.md)
- [架构与 IPC](docs/ARCHITECTURE.md)
- [Windows / NSIS 构建](docs/BUILD.md)
- [迁移说明](docs/MIGRATION.md)
- [测试与验收](docs/TESTING.md)
- [第三方工具与分发许可](docs/THIRD_PARTY.md)
- [更新日志](docs/CHANGELOG.md)

## 项目结构

```text
frontend/
  src/                 Vue 页面、Pinia、desktop 服务
  src-tauri/           Rust 后端、Tauri 配置、权限和图标
  scripts/             构建预检与桌面/UI 烟测
  tests/               Node 内置测试
bin/                   本地下载工具，不提交 Git
docs/                  当前项目文档与更新日志
视频下载工具图标设计.png  原始图稿
```

旧 Python/Eel、Docker 和 PyInstaller 实现已从当前工作树移除，仅在 Git 历史中保留。目录保留规则与旧源码查看方式见 [开发指南](docs/DEVELOPMENT.md#项目文件维护)。

## 边界与安全

自动更新仅在桌面端可用；发布到 GitHub Release 的 Windows NSIS 安装包文件名必须以 `-setup.exe` 结尾。

只下载有权获取的内容，遵守目标网站条款。项目代码采用 [MIT](LICENSE)；随包的第三方二进制具有独立许可，尤其 FFmpeg 的构建选项可能引入 GPL 义务，不能用本项目 MIT 许可代替。
