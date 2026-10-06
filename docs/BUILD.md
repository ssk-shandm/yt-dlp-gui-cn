# Windows x64 / NSIS 构建

## 依赖

开发机需 Node.js、Rust MSVC、C++ Build Tools / Windows SDK、WebView2。第一次 Rust 编译和 NSIS 打包需要网络下载 crate、Tauri 打包工具及运行时引导文件，耗时可能较长。

## 外部工具

将 Windows x64 `yt-dlp.exe`、`ffmpeg.exe`、`ffprobe.exe` 放在根目录 `bin/`。三个工具不会提交 Git；因此仅克隆仓库无法直接生成完整安装包。`npm run tools:check` 检查文件存在，不验证真实性、签名或许可证，发布人员必须单独核验。

来源：yt-dlp 官方发布页、FFmpeg 官方下载页列出的 Windows 构建供应方。选择符合发布需求的构建，记录版本、下载 URL、SHA-256、许可证、对应源码及构建信息，参见 [THIRD_PARTY.md](THIRD_PARTY.md)。

## 构建命令

```powershell
cd frontend
npm ci
npm run tools:check
npm run build
npm test
npm run test:rust
npm run desktop:build
```

产物在 `src-tauri/target/release/bundle/nsis/`。release 主 EXE 与 NSIS 安装包在 `src-tauri/target/release/` 中；NSIS 安装包会把主 EXE 与同级 `bin/` 工具目录一起部署，不要只分发主 EXE。

## 当前安装配置

- 产品名称：`yt-dlp GUI`；窗口标题为中文版名称。
- 应用标识：`com.ssk-shandm.ytdlp-gui`。
- NSIS：当前用户安装，简体中文/英文安装界面，可选择语言。
- 明确携带三个工具及项目 LICENSE；NSIS 安装时写入主程序同级 `bin/`，主 EXE 不内嵌 FFmpeg。`bin/ffmpeg.exe` 与 `ffprobe.exe` 可在未来替换为完整版。
- WebView2：`downloadBootstrapper`。缺少运行时时需要联网；不是完全离线安装器。
- 自动更新由应用层实现：桌面端查询项目 GitHub Releases API，筛选版本号和文件名以 `-setup.exe` 结尾的 NSIS 资产，下载后启动安装器。发布时上传 `npm run desktop:build` 生成的 `*-setup.exe` 即可；当前不读取 `latest.json`、`.sig` 或 Tauri updater endpoint。

## 应用图标

图标原始图稿为根目录 `视频下载工具图标设计.png`，生成源为 `frontend/app-icon.png`。Windows EXE、安装器和卸载器读取 `frontend/src-tauri/icons/icon.ico`，包含 16 / 32 / 48 / 256px 等尺寸；打包配置同时引用 `32x32.png`、`128x128.png`、`128x128@2x.png`，另保留通用 `icon.png`。重复图标及非当前平台图标已清理。重新生成方式见 [开发指南](DEVELOPMENT.md#修改代码)。

本次只替换图标资源，已有 EXE / 安装包不会自动变化。需要运行 `npm run desktop:build` 重新构建，新产物才会使用新图标。

如需离线部署，在 Windows 构建配置中将 `bundle.windows.webviewInstallMode.type` 改为 `offlineInstaller`，然后重新构建并在无网络、无 WebView2 的 Windows 测试机验收。离线运行时和 FFmpeg 会明显增大安装包。

## 安装包体积

体积主要取决于 FFmpeg 构建。现有本地三个工具未压缩总计约 314 MB；本次 NSIS 实际产物约 110.24 MiB，验证记录见 [TESTING.md](TESTING.md)。迁移到 Tauri 不会自动缩小 FFmpeg。

## 发布前

1. 在非开发机或独立 Windows 用户环境安装，验证路径含中文与空格、标准用户权限、首次启动。
2. 完成 [TESTING.md](TESTING.md) 的下载/合并/取消/退出验收。
3. 验证覆盖安装、卸载、WebView2 缺失和离线场景，确认不会删除用户下载文件。
4. 审核第三方工具许可、依赖公告、工具来源和二进制哈希。
5. 通过 Tauri Windows 签名配置接入合法证书；未签名包可能出现 SmartScreen 提示。
6. 同步三个版本号、更新日志、构建验证记录，再发布。

仅有成功编译或本地 NSIS 产物，不能证明覆盖安装、卸载、签名和所有站点下载都通过测试。

## 发布更新包

1. 在 `frontend/` 更新 `package.json`、`src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 的版本号，并同步 `docs/CHANGELOG.md`。
2. 准备 `bin/yt-dlp.exe`、`bin/ffmpeg.exe`、`bin/ffprobe.exe`，运行 `npm run tools:check` 和 `npm run desktop:build`。
3. 从 `src-tauri/target/release/bundle/nsis/` 取出以 `-setup.exe` 结尾的安装包，记录 SHA-256 并完成测试清单。
4. 先创建对应标签的草稿 Release，上传安装包与 SHA256SUMS.txt，核对资产大小、SHA-256 和说明后再公开发布。自动更新通过 GitHub 的 latest Release API 检查正式版本；预发布版本不应作为正式更新目标。
5. 如实记录代码签名、第三方许可材料和覆盖安装验收状态；发布不代表这些检查自动通过。未签名安装包可能触发 SmartScreen；仅上传主 EXE 的 Release 不满足自动更新要求。

自动更新只适用于已安装的当前用户 NSIS 版本。开发版、便携版或运行目录中没有 `uninstall.exe` 的程序会拒绝自动安装，避免误替换开发文件。

### Release 内容格式

以后发布说明统一使用 [发布说明模板](RELEASE_TEMPLATE.md)，仅保留面向用户的以下四部分：

1. **更新内容**：新增功能、体验优化和问题修复。
2. **下载与安装**：安装包选择、安装或升级方式。
3. **使用须知**：平台限制、签名、WebView2 和必要的安全提示。
4. **文件信息**：真实安装包名称、大小与 SHA-256。

公开 Release 不再包含“验证”“测试结果”“验收记录”等章节，也不附测试数量、构建、lint、Clippy 或烟测通过列表。内部验证仍正常执行，记录到 [TESTING.md](TESTING.md)，不复制到发布正文。模板占位符必须替换为本次实际信息，不能把未包含在安装包中的源码变更写成已发布功能。

仅调整已发布 Release 文案时，同步对应的本地发布说明；保持标签、版本号、发布时间和安装包资产不变。

### Release 说明编码

发布说明按版本保存在 UTF-8 编码的 `docs/RELEASE_v<版本>.md`（如 `RELEASE_v2.0.1.md`）。使用 GitHub API 时，将 JSON 显式转换为 UTF-8 字节并设置 `Content-Type: application/json; charset=utf-8`；不要依赖 Windows PowerShell 的默认字符串编码。发布后回读 API，逐字核对标题和正文与本地文件一致，避免中文乱码。
