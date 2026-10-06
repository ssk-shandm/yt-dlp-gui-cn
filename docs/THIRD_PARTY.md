# 第三方工具与许可

项目 MIT 许可只覆盖本项目代码，不覆盖 yt-dlp、FFmpeg、WebView2 等第三方组件。

## 下载工具

- yt-dlp：建议采用官方 Windows 发布 EXE。单文件构建含运行时与依赖，不能仅凭主项目许可推断整个二进制的分发条件。
- FFmpeg / ffprobe：应采用来源可追溯的 Windows x64 构建。运行 `-version`、`-L`、`-buildconf` 查看版本与构建选项。
- WebView2：使用 Microsoft 官方引导器/运行时与 Tauri 支持的分发模式。

本仓库不托管上述 EXE。Tauri 安装包会将本地 bin 中三个 EXE 打包；成功打包不代表完成第三方许可审核。

## 2026-10-06 本地构建记录

以下哈希由本次使用的文件直接计算。版本、供应方信息来自工具自身输出，**未完成官方来源、签名和下载链核验**。

| 文件 | 版本 | 来源状态 | SHA-256 | 许可状态 |
| --- | --- | --- | --- | --- |
| yt-dlp.exe | 2026.08.19 | 本地 EXE 自报版本；原始下载 URL 尚未核实 | `66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a` | 单文件构建含其他组件，完整许可待审核 |
| ffmpeg.exe | 7.1.1-full_build-www.gyan.dev | 二进制自报 Gyan 构建；原始下载 URL 尚未核实 | `b1383f5d07470d503edecdaee4bddc5891e986e916a698299b357f79cfe445fd` | 本地 `-L` 自报 GPL v3 or later |
| ffprobe.exe | 7.1.1-full_build-www.gyan.dev | 同一 FFmpeg 构建标识，未核实来源链 | `012bddded3cbc5204055210d7ff4f0b3f7521bca441a694939856d01909f5756` | 构建启用 GPL / version3；完整分发材料待补 |

本地 FFmpeg 配置含 `--enable-gpl` 和 `--enable-version3`，且 `ffmpeg.exe -L` 显示 GPL v3 or later。当前安装包仅带有本项目 LICENSE，**尚未补齐完整的第三方许可、对应源码及构建资料；公开发布不代表已完成第三方合规审核**。

正式发布前，应核实准确下载 URL、各二进制对应的许可证和通知文件、对应源码/源码获取与构建信息，并依据实际分发方式完成必要审核。不要仅用本项目 MIT 许可覆盖这些工具。参考 FFmpeg 官方 `License and Legal Considerations` 页面；本文不是法律意见。

## 重新记录

在 frontend 目录执行：

```powershell
Get-FileHash ../bin/*.exe -Algorithm SHA256
../bin/yt-dlp.exe --version
../bin/ffmpeg.exe -version
../bin/ffmpeg.exe -L
../bin/ffmpeg.exe -buildconf
../bin/ffprobe.exe -version
```

更换 bin 内容后必须重新构建并更新此表。哈希仅标识文件，不等于来源可信或许可合规证明。
