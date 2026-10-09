**简体中文** | [English](ARCHITECTURE.en.md)

# 架构与 IPC

## 数据流

```text
Vue 页面 / Pinia
        ↓ desktop.ts：invoke、原生目录对话框
Tauri 2 IPC / Rust commands
        ↓ process.rs：tokio 子进程、双管道读取、生命周期
yt-dlp.exe → ffmpeg.exe / ffprobe.exe
        ↑ terminal-output / task-status 事件
Vue 终端 / 本次运行任务列表
```

不再启动 Eel HTTP/WebSocket 服务，不依赖浏览器可执行文件、Tkinter 或独立 Python 环境。yt-dlp Windows EXE 自身的运行时仍属于第三方工具，不由项目重写。

## 模块

- `src/services/desktop.ts`：集中 IPC、初始化监听、错误通知、解析状态收敛、设置保存队列。
- `src/stores/`：链接、格式、字幕、设置、日志、任务状态。
- `src-tauri/src/lib.rs`：命令注册、设置文件、应用生命周期。
- `src-tauri/src/model.rs`：参数校验、下载参数生成、JSON 元数据映射。
- `src-tauri/src/process.rs`：工具定位、隐藏进程、并发限制、stdout/stderr、取消和超时。
- `services/updater.ts` 在桌面端查询 GitHub Releases、比较版本并协调自动/手动更新；Rust `updater.rs` 校验 GitHub HTTPS 资产、下载 `*-setup.exe`、报告进度并启动 NSIS。活动任务结束前不会安装。
- `app-icon.png` / `src-tauri/icons/`：由根目录 `视频下载工具图标设计.png` 生成，Windows 打包继续使用 `tauri.conf.json` 中的多尺寸 PNG 与 `icon.ico` 配置。

## 命令协议

Tauri 参数使用 camelCase；Rust 字段使用 snake_case，通过 Serde 转换。

| 命令 | 输入 | 输出 |
| --- | --- | --- |
| `get_settings` | 无 | `{ downloadPath, retryTimes }` |
| `save_settings` | `{ settings }` | 保存后的 Settings |
| `analyze_url` | `{ url }` | `{ title, thumbnail, formats, subtitles }` |
| `start_download` | `{ request }` | taskId（任务已启动，不等于下载完成） |
| `list_supported_sites` | 无 | taskId；列表输出到终端 |
| `cancel_task` | `{ taskId }` | 无；最终结果通过任务事件反馈 |

`request.kind` 支持 `quick`、`format`、`combined`、`subtitle`、`thumbnail`、`description`。所有下载必需 `url`；其余可选字段为 `formatId`、`videoId`、`audioId`、`containerFormat`、`language`。Rust 根据类型验证必需字段。

事件：

- `terminal-output`：`{ taskId, line }`，纯文本，不作为 HTML 注入。
- `task-status`：`{ taskId, title, status, message }`；status 为 running / success / error / cancelled。

先建立监听，再加载设置，最后允许调用桌面服务，避免漏掉快速任务的结果。解析失败及陈旧解析结果不会把旧 URL 标为有效，加载状态在 finally 清理。

## 工具和进程

开发模式优先根目录 `bin/`；安装版本优先使用主 EXE 同级 `bin/`，并保留应用资源目录 `bin/` 作为兼容回退。资源目录映射在 `tauri.conf.json` 中明确声明，不从不可信 PATH 查找工具。

通过 Tokio 直接传入 argv 启动 EXE，Windows 使用 CREATE_NO_WINDOW；stdout/stderr 同时读取避免管道阻塞。强制 UTF-8、禁用 ANSI 颜色、下载启用逐行输出。最多运行 4 个任务（含解析与网站列表），满额拒绝新请求，没有等待队列。

解析整体超时 180 秒、JSON 最大 16 MiB；其他任务上限 24 小时，网络 socket 超时 30 秒。取消和正常退出会使用系统 taskkill /T /F 清理 Windows 进程树。崩溃或强制终止应用不等同于正常退出，需要额外人工检查残留进程。

## 安全边界

仅支持 HTTP/HTTPS URL，不接受嵌入用户名/密码。格式 ID、字幕语言和封装格式均验证；URL 放在 `--` 之后，配置使用 `--ignore-config`，不接受任意 yt-dlp 参数或 shell 命令。字幕语言是单个语言代码，不开放正则表达式。

WebView 仅加载本地前端；CSP 限制脚本和连接，封面允许 HTTP/HTTPS 图片。权限只开放核心 IPC/事件、原生目录选择，以及“关于”页中三个固定项目链接的系统浏览器打开能力；不开放前端任意 shell 或文件读写插件。第三方下载工具仍有网络/文件权限，需要使用可信版本并持续维护。

## 更新状态与生命周期

更新状态由前端控制器维护：`idle`、`checking`、`latest`、`waiting`、`downloading`、`installing`、`error`。自动检查默认开启，偏好保存在 `localStorage`；手动检查不受该开关限制。安装请求与下载任务互斥，避免覆盖安装时仍有 yt-dlp/FFmpeg 子进程运行。

Rust 更新命令仅接受 HTTPS，并将主机限制为 GitHub Release 相关域名；安装文件名必须是安全的 `*-setup.exe`。下载完成后检查字节数，使用临时 `.part` 文件改名，避免把未完成文件当作安装包。只有检测到当前程序同级 `uninstall.exe` 时才允许替换，开发运行和便携运行会明确报错。