[简体中文](ARCHITECTURE.md) | **English**

# Architecture and IPC

## Data flow

```text
Vue pages / Pinia
        ↓ desktop.ts: invoke, native directory dialog
Tauri 2 IPC / Rust commands
        ↓ process.rs: tokio child processes, dual-pipe reading, lifecycle
yt-dlp.exe → ffmpeg.exe / ffprobe.exe
        ↑ terminal-output / task-status events
Vue terminal / task list for this run
```

The app no longer starts an Eel HTTP/WebSocket server and does not depend on a browser executable, Tkinter or a separate Python environment. The runtime of the yt-dlp Windows EXE is still third-party code and is not rewritten by this project.

## Modules

- `src/services/desktop.ts`: centralizes IPC, initializes listeners, error notifications, parse-state reconciliation and the settings save queue.
- `src/stores/`: link, format, subtitle, settings, log and task state.
- `src-tauri/src/lib.rs`: command registration, settings file, application lifecycle.
- `src-tauri/src/model.rs`: parameter validation, download argument generation, JSON metadata mapping.
- `src-tauri/src/process.rs`: tool location, hidden processes, concurrency limits, stdout/stderr, cancellation and timeouts.
- `services/updater.ts` on desktop queries GitHub Releases, compares versions and coordinates automatic/manual updates; Rust `updater.rs` validates the GitHub HTTPS asset, downloads `*-setup.exe`, reports progress and launches NSIS. Installation does not start until active tasks have finished.
- `app-icon.png` / `src-tauri/icons/`: generated from the root file `视频下载工具图标设计.png` (the Chinese filename is kept as-is). Windows packaging continues to use the multi-size PNG and `icon.ico` configured in `tauri.conf.json`.

## Command protocol

Tauri parameters use camelCase; Rust fields use snake_case, converted through Serde.

| Command | Input | Output |
| --- | --- | --- |
| `get_settings` | none | `{ downloadPath, retryTimes }` |
| `save_settings` | `{ settings }` | the saved Settings |
| `analyze_url` | `{ url }` | `{ title, thumbnail, formats, subtitles }` |
| `start_download` | `{ request }` | taskId (the task has started; this does not mean the download has finished) |
| `list_supported_sites` | none | taskId; the list is written to the terminal |
| `cancel_task` | `{ taskId }` | none; the final result is reported through task events |

`request.kind` supports `quick`, `format`, `combined`, `subtitle`, `thumbnail` and `description`. Every download requires `url`; the other optional fields are `formatId`, `videoId`, `audioId`, `containerFormat` and `language`. Rust validates the required fields for each type.

Events:

- `terminal-output`: `{ taskId, line }`, plain text, never injected as HTML.
- `task-status`: `{ taskId, title, status, message }`; status is running / success / error / cancelled.

Listeners are registered first, then settings are loaded, and only then are desktop service calls allowed, so the results of fast tasks are not missed. A failed parse or a stale parse result does not mark the previous URL as valid, and the loading state is cleared in `finally`.

## Tools and processes

In development mode the root `bin/` directory takes priority. In the installed version, the `bin/` directory next to the main EXE takes priority, and the application resource directory `bin/` is kept as a compatibility fallback. The resource directory mapping is declared explicitly in `tauri.conf.json`; tools are never looked up from an untrusted PATH.

The EXE is started by Tokio with arguments passed directly as argv, using CREATE_NO_WINDOW on Windows. stdout and stderr are read at the same time to avoid pipe blocking. UTF-8 is forced, ANSI colors are disabled, and line-by-line output is enabled for downloads. At most 4 tasks run at once (including parsing and the site list); when the limit is reached, new requests are rejected, and there is no waiting queue.

The overall parse timeout is 180 seconds and JSON is capped at 16 MiB; other tasks are capped at 24 hours, and network socket timeouts are 30 seconds. Cancellation and normal exit use the system `taskkill /T /F` to clean up the Windows process tree. A crash or forced termination of the app is not the same as a normal exit, and leftover processes need to be checked manually.

## Security boundaries

Only HTTP/HTTPS URLs are supported, and URLs with embedded usernames or passwords are not accepted. Format IDs, subtitle languages and container formats are all validated. The URL is placed after `--`, configuration is disabled with `--ignore-config`, and arbitrary yt-dlp arguments or shell commands are not accepted. A subtitle language is a single language code; regular expressions are not exposed.

The WebView loads only the local frontend. The CSP restricts scripts and connections, and covers may be loaded from HTTP/HTTPS images. Permissions expose only the core IPC/events, native directory selection, and opening the three fixed project links on the About page in the system browser. Arbitrary frontend shell or file read/write plugins are not exposed. Third-party download tools still have network and file permissions, so trusted versions must be used and kept up to date.

## Update state and lifecycle

Update state is maintained by the frontend controller: `idle`, `checking`, `latest`, `waiting`, `downloading`, `installing` and `error`. Automatic checking is enabled by default, and the preference is stored in `localStorage`; manual checks are not limited by this switch. Installation requests and download tasks are mutually exclusive, so an overwrite install never runs while yt-dlp/FFmpeg child processes are still running.

Rust update commands accept only HTTPS and restrict the host to GitHub Release-related domains. The installer file name must be a safe `*-setup.exe`. After download completes, the byte count is checked, and the temporary `.part` file is renamed, so an incomplete file is never treated as an installer. Replacement is allowed only when an `uninstall.exe` is found next to the running program; development runs and portable runs report an explicit error.
