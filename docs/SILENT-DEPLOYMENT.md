# 静默部署告知与确认

适用对象：以 `/S` 或其他静默/被动方式批量安装 yt-dlp GUI 的部署方。在下发安装包前，部署方须阅读本文件，并填写文末确认记录。

## 安装内容

- 安装器为 NSIS 当前用户安装，不内置 yt-dlp、FFmpeg 或 ffprobe。工具在首次使用时由用户从上游下载到本机 `bin/`。
- GUI 本身以项目 MIT 许可分发。`licenses/gui/INSTALLER-NOTICE.txt` 包含 MIT 原文及 Microsoft WebView2 官方最终用户条款，安装包随附同一份内容。

## WebView2 Runtime

- 目标机器缺少 WebView2 Runtime 时，安装器会以静默方式运行 Microsoft 官方 downloadBootstrapper，并从 Microsoft 网络下载安装。该过程**需要联网**，本安装包不含完整离线运行时。
- Runtime 是 Microsoft 独立维护、自动更新的共享组件。卸载 GUI 不会移除它。
- 若启用 Microsoft Defender SmartScreen，其可能向 Microsoft 发送信息。隐私声明：https://aka.ms/privacy ；SmartScreen 说明：https://learn.microsoft.com/en-us/microsoft-edge/privacy-whitepaper#smartscreen 。WebView2 本身也可能按 Microsoft 条款收集使用信息。

## 静默安装的影响

- `/S` 不显示 NSIS 许可页，因此安装者看不到上述告知。本文件用于替代这一显示，部署方应在下发前完成阅读。
- 部署方对其管理的终端承担告知与同意安排的责任。本项目不替部署方取得用户同意。

## 部署确认记录

未填写完整并签署前，不得将本次静默部署视为已完成告知。

| 项目 | 内容 |
|---|---|
| 部署方（组织/部门） | |
| 负责人 | |
| 安装包版本 | 2.0.1 |
| 目标终端范围 | |
| 已确认上述告知并同意静默安装 WebView2 Runtime | 是 |
| 确认日期 | 2026-10-09 |
| 签署 | |
