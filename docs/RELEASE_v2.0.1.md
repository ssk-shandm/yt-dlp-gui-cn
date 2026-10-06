# v2.0.1 — 更新下载修复版

这是 Windows x64 NSIS 安装包的修复版本，重点修复应用内更新下载在部分 Windows 网络、代理或企业证书环境下失败的问题。

## 修复内容

- 更新下载器使用 Windows 系统信任根证书，支持系统代理和企业网络已信任的证书链。
- 保持 HTTPS 证书校验，不使用跳过证书校验的安全风险方案。
- 下载器启用 30 秒连接超时和 60 秒单次读取超时，不限制大安装包的总下载时间。
- 更新失败提示保留底层错误链，并针对证书、连接和超时提供处理建议。
- 版本统一为 2.0.1。

## 下载与安装

下载 **yt-dlp.GUI_2.0.1_x64-setup.exe** 并运行安装器。请不要只复制主程序 EXE，否则可能缺少随包的 yt-dlp、FFmpeg 和 ffprobe。

- 平台：Windows x64。
- 文件大小：**115,571,498 bytes (about 110.22 MiB)**。
- 安装包未签名，Windows 可能显示 SmartScreen 提示，请核对来源与 SHA-256。
- 缺少 WebView2 时，安装器可能联网下载运行时；此包不是完全离线安装包。

## 校验

安装包 SHA-256：

```
02f471aff9cf4480f989ff8ea39b56c249e3a9de50bba70cec5795130656aa24
```

## 验证

- 前端自动化测试：**20/20 通过**。
- Rust 常规测试：**12/12 通过**。
- Rust clippy（all-targets，-D warnings）：通过。
- TypeScript/Vite 构建、ESLint、cargo fmt、UI 浏览器烟测和 Windows x64 NSIS 打包：通过。
- GitHub Release 安装包网络烟测：完整读取 115,596,191 字节，HTTPS、EXE 标识和 Content-Length 验证通过。

未执行本次 NSIS 覆盖安装、卸载、干净机器及代理认证等全部环境验收。

## 使用须知

自动更新仅适用于已安装的 Windows x64 NSIS 版本；开发版和便携版不会替换当前程序。请仅下载和处理有权获取的内容，并遵守目标网站条款。
