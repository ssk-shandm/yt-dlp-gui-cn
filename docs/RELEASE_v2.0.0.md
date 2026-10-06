# v2.0.0 — Tauri 桌面版

本次是桌面架构的大版本升级：应用从 Python/Eel 迁移到 **Tauri 2 + Rust**，界面继续采用 Vue 3 + TypeScript。

## 主要变化

- 使用 Windows x64 **NSIS 当前用户安装包**，无需单独安装 Python、Node.js 或 Rust。
- 随包提供 yt-dlp、FFmpeg 和 ffprobe，支持视频、音频、封面、简介和人工字幕下载。
- 重构下载任务管理，支持取消任务、并发限制及正常退出时清理下载进程。
- 新增 GitHub Releases 更新检查；支持下载并运行 `*-setup.exe`，有活动任务时延后安装。
- 优化页面布局、响应式显示、封面加载反馈、终端日志、关于页及应用图标。
- 当前构建改用 npm 和 Tauri；旧 Python/Eel 实现归档至 `legacy/python-eel/`。

## 下载与安装

下载 **`yt-dlp.GUI_2.0.0_x64-setup.exe`** 并运行安装器。请勿仅复制主程序 EXE，否则可能缺少随包的下载工具。

- 平台：Windows x64。
- 文件大小：**115,596,191 bytes（约 110.24 MiB）**。
- 缺少 WebView2 时，安装器会联网下载运行时；此包不是完全离线安装包。
- 旧 Python/Eel 版本建议保留下载文件后使用本安装器重新安装；旧版配置不承诺自动迁移。

## 校验

安装包 SHA-256：

```text
de5fb0162348e6b7ed364cfd1be4a97ec3711607dae2bb1a5ad730666a8966a8
```

同时提供 `SHA256SUMS.txt`。上传资产的大小和 GitHub SHA-256 digest 已与本地产物核对一致。

## 验证结果

- 前端自动化测试：**19/19 通过**。
- Rust 单元测试：**10/10 通过**。
- TypeScript/Vite 构建、ESLint、Rust 格式检查及 Windows x64 NSIS 打包通过。

## 使用须知

- 安装包**未签名**，Windows 可能显示 SmartScreen 提示，请核对来源与 SHA-256。
- 安装、覆盖升级、卸载、干净机器及无 WebView2 等场景尚未完成全面验收；全部站点下载可用性也不作保证。
- 自动更新只适用于已安装的 Windows x64 NSIS 版本；开发版和便携运行不会替换当前程序。
- 本项目代码采用 MIT 许可；yt-dlp、FFmpeg、ffprobe 和 WebView2 适用各自许可。本地 FFmpeg 构建自报 GPL v3 or later，第三方分发材料的审核状态见 `docs/THIRD_PARTY.md`，本次公开发布不代表已完成全部第三方合规审核。
- 仅下载有权获取的内容，并遵守目标网站条款。

详细变更和测试范围见仓库中的 `docs/CHANGELOG.md`、`docs/MIGRATION.md` 和 `docs/TESTING.md`。
