# Eel → Tauri 技术迁移

日期：2026-10-06；目标版本：2.0.0。

## 保留

保留 Vue 3 / TypeScript / Vite / Pinia、现有中文页面结构、Arco / TDesign 组件及 yt-dlp / FFmpeg 外部工具。没有重新实现下载引擎。

## 替换

| 原实现 | 当前实现 |
| --- | --- |
| `main.py`、Eel、Python 线程 | Rust 命令、Tokio 异步子进程 |
| `window.eel` / `eel.js` | `services/desktop.ts` 的 invoke 和事件 |
| Tkinter 目录选择 | Tauri dialog 原生目录选择 |
| Edge/Chrome 应用模式 | Windows WebView2 原生桌面窗口 |
| PyInstaller 单 EXE | Tauri release 主程序 + NSIS 安装器 |
| Python ANSI-to-HTML | UTF-8 纯文本日志、Vue 转义渲染 |
| 全局下载目录 | 用户配置目录下的设置文件 |
| 假下载记录 | 本次运行真实任务事件列表 |

迁移时曾将旧 Python、Docker、Eel 客户端和 pnpm lock 归档到 `legacy/python-eel/`。后续项目整理已从当前工作树移除这些非运行文件；旧源码仍可在 Git 标签 `v2.0.1` 的相同路径查看。旧 PyInstaller 本地输出不会转换成新程序；新包需要重新构建。Docker 不再作为当前桌面运行方式。

## 修复

- 封面按钮曾传入下载目录而不是视频 URL，现使用成功解析的链接。
- 重试次数统一为字符串，默认 10；修复 10 和 infinite 的原分支混乱。
- 解析失败、输入改变、非法 URL 会正确收敛状态，不保留错误的已解析标志。
- 添加双管道读取、并发上限、超时、任务取消和正常退出进程树清理。
- 终端不再使用 v-html，避免下载工具文本被解释为页面 HTML。
- 开发/安装资源路径不再依赖当前工作目录或 PyInstaller 解压目录。

## 新边界

当前只验证 Windows x64；NSIS 不是 macOS/Linux 的分发格式。播放列表、自动字幕、Cookies/登录、代理、跨会话历史和暂停/恢复不属于此次迁移。自动更新已纳入桌面版本，但仅支持 GitHub Release 中文件名以 `-setup.exe` 结尾的 Windows NSIS 安装包；浏览器预览、开发版和便携版不会自动安装。音视频组合只请求合并，不保证任意编码都兼容所选封装，错误由 yt-dlp/FFmpeg 日志反馈。

任务页里的解析和网站列表也属于任务；“已结束”包含完成、失败和取消，不代表磁盘上一定有新视频文件。日志展示进度，但尚未实现统一百分比进度条。

## 自动更新迁移说明

自动更新不是 Tauri updater 插件方案，而是应用层的 GitHub Release 流程：前端请求最新 Release API，筛选版本和 `*-setup.exe` 资产；Rust 端只允许 HTTPS GitHub 资产，下载到系统下载目录（失败时回退临时目录），校验下载完整性后以 `/UPDATE /P /R /D=...` 启动 NSIS 安装器。安装器启动后应用退出，更新失败时保留安装包路径供手动运行。

因此发布者需要保持 `package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 版本一致，并把 NSIS 安装包上传到 GitHub Release。该实现不使用 `latest.json`、签名元数据或私钥；正式发布前仍应接入代码签名并完成 SmartScreen、覆盖安装和回滚验收。