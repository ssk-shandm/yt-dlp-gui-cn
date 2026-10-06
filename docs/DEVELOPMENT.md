# 开发指南

## 环境

当前目标为 Windows x64。安装 Node.js（推荐 22/24 LTS）、Rust stable 的 `x86_64-pc-windows-msvc` 工具链、Visual Studio 2022 Build Tools 的“使用 C++ 的桌面开发”（含 Windows SDK）和 Microsoft Edge WebView2 Runtime。

依赖分别由 `frontend/package-lock.json` 和 `frontend/src-tauri/Cargo.lock` 锁定。当前统一使用 npm；旧 pnpm lock 已归档。

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
npm run tauri -- icon app-icon.png --output src-tauri/icons --fit contain
```

## 设置与数据

设置文件位于 Tauri `app_config_dir()` 下的 `settings.json`；Windows 通常是 `%APPDATA%/com.ssk-shandm.ytdlp-gui/settings.json`。以运行时解析结果为准。默认下载目录来自系统 Downloads，不依赖工作目录。损坏或非法设置会回退默认值。

任务记录为本次运行内存状态，最多保留 200 条已结束任务；终端最多保留 2000 行。下载目录的文件不会因清空任务记录而删除。
