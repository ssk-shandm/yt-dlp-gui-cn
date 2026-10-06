# 开发指南

## 环境

当前目标为 Windows x64。安装 Node.js（推荐 22/24 LTS）、Rust stable 的 `x86_64-pc-windows-msvc` 工具链、Visual Studio 2022 Build Tools 的“使用 C++ 的桌面开发”（含 Windows SDK）和 Microsoft Edge WebView2 Runtime。

依赖分别由 `frontend/package-lock.json` 和 `frontend/src-tauri/Cargo.lock` 锁定。当前统一使用 npm；旧 pnpm lock 已从工作树移除，仅在 Git 历史中保留。

## 初始化

1. 将 Windows 版 `yt-dlp.exe`、`ffmpeg.exe`、`ffprobe.exe` 放入根目录 `bin/`。不可使用来源不明的 EXE。
2. 在 `frontend/` 执行 `npm ci`。
3. 执行 `npm run tools:check`，然后 `npm run desktop:dev`。

Vite 固定监听 `127.0.0.1:1420`，端口冲突直接报错；Tauri 负责启动前端与 Rust 窗口。关闭开发窗口后检查终端，必要时用 Ctrl+C 结束开发服务。

## 常用命令（在 frontend/ 执行）

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 仅浏览器界面预览，不具备桌面能力 |
| `npm run desktop:dev` | 完整桌面开发模式 |
| `npm run build` | TypeScript 检查和前端生产构建 |
| `npm run lint:check` | ESLint 检查，不修改源码 |
| `npm test` | Node 内置测试；需 Node.js 22.18+ / 24 |
| `npm run check:rust` | Rust 编译检查 |
| `npm run test:rust` | Rust 单元测试 |
| `npm run test:desktop` | 构建后运行真实桌面烟测（会短暂打开窗口，临时修改并恢复设置） |
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Rust 格式检查 |
| `npm run desktop:build` | 前端、Rust release、NSIS 打包 |
| `npm audit` | 检查 JS 依赖公告；不要直接强制降级或升级全部依赖 |

## 修改代码

前端页面不得直接调用底层命令：使用 `src/services/desktop.ts`，并同步维护 `src/types/desktop.ts`。新增 Rust 命令需注册到 `invoke_handler`。Rust 子进程不能通过 shell 执行拼接字符串，也不能开放任意可执行文件路径。

发布时保持 `package.json`、`Cargo.toml`、`tauri.conf.json` 的版本一致，并更新 `docs/CHANGELOG.md`。图标源文件为 `frontend/app-icon.png`，重新生成可运行：

```powershell
# 先在临时目录生成，再仅复制当前 Windows 构建所需图标。
$iconOutput = Join-Path $env:TEMP ('ytdlp-icons-' + [guid]::NewGuid())
npm run tauri -- icon app-icon.png --output $iconOutput --fit contain
if ($LASTEXITCODE -ne 0) { throw '图标生成失败' }
'icon.ico', 'icon.png', '32x32.png', '128x128.png', '128x128@2x.png' |
  ForEach-Object {
    Copy-Item -LiteralPath (Join-Path $iconOutput $_) -Destination 'src-tauri/icons/'
  }
```

## 项目文件维护

- 当前有效入口为 `frontend/src/main.ts` 与 `frontend/src-tauri/src/main.rs`，不再维护 Python/Eel、Docker 或 PyInstaller 入口。
- 根目录旧 `build/`、`dist/`、`venv/`、`__pycache__/` 与 `tmp_ffmpeg_download/` 已清理。注意：`frontend/dist/` 是新版 Vite 产物，不能当作根目录的旧版 `dist/`。
- 保留 `bin/` 三个工具、`frontend/node_modules/`、`frontend/src-tauri/target/` 当前构建缓存；本地 NSIS 产物仅保留当前 2.0.1 安装包，不改动已发布安装包及其校验值。
- 图标保留原始图稿、`frontend/app-icon.png`、配置引用的 Windows ICO/PNG 及通用 `icon.png`；不提交未支持平台的 Android/iOS/macOS 或 Windows Store 图标。
- 前端业务代码使用 TypeScript；构建、烟测及 Node 测试的 `.mjs` 文件是有效工具脚本，不是旧版残留。
- 未引用的示例计数器、测试图片、写入权限探测文件及重复图标已移除；不用的 Element Plus 图标、Less 和重复的直接 ESLint parser 依赖已清理。现有组件仍使用 SCSS，保留 Sass。

旧实现保留在 Git 标签 `v2.0.1` 中，可在项目根目录只读查看，不会覆盖当前工作树：

```powershell
git ls-tree -r --name-only v2.0.1 legacy/python-eel/
git show v2.0.1:legacy/python-eel/main.py
```

新增或删除文件后运行 `npm test`、`npm run lint:check`、`npm run build`，并核对图标、文档链接和 Tauri 资源映射。发布前另执行工具预检和 NSIS 打包。

## 设置与数据

设置文件位于 Tauri `app_config_dir()` 下的 `settings.json`；Windows 通常是 `%APPDATA%/com.ssk-shandm.ytdlp-gui/settings.json`。以运行时解析结果为准。默认下载目录来自系统 Downloads，不依赖工作目录。损坏或非法设置会回退默认值。

任务记录为本次运行内存状态，最多保留 200 条已结束任务；终端最多保留 2000 行。下载目录的文件不会因清空任务记录而删除。
