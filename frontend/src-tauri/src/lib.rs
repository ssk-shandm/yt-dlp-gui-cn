mod model;
mod process;
mod tools;
mod updater;

use model::{DownloadKind, DownloadRequest, Settings};
use process::{execute, log, resolve_tools, task_event, TaskRegistry};
use std::{path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager, State};

pub struct AppState {
    settings: Mutex<Settings>,
    settings_file: PathBuf,
    tasks: TaskRegistry,
}

fn validate_settings(settings: &Settings) -> Result<(), String> {
    model::validate_retries(&settings.retry_times)?;
    model::validate_concurrent_fragments(settings.concurrent_fragments)?;
    if settings.proxy_enabled {
        model::validate_proxy_url(&settings.proxy_url)?;
    }
    if !PathBuf::from(&settings.download_path).is_absolute() {
        return Err("下载目录必须是绝对路径".into());
    }
    if settings.download_path.contains('\0') {
        return Err("下载目录包含非法字符".into());
    }
    Ok(())
}
#[tauri::command]
fn get_settings(state: State<AppState>) -> Result<Settings, String> {
    state
        .settings
        .lock()
        .map(|s| s.clone())
        .map_err(|_| "设置锁不可用".into())
}
#[tauri::command]
fn save_settings(settings: Settings, state: State<AppState>) -> Result<Settings, String> {
    validate_settings(&settings)?;
    std::fs::create_dir_all(&settings.download_path)
        .map_err(|e| format!("无法创建下载目录: {e}"))?;
    let mut current = state.settings.lock().map_err(|_| "设置锁不可用")?;
    let json = serde_json::to_vec_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(&state.settings_file, json).map_err(|e| format!("无法保存设置: {e}"))?;
    *current = settings.clone();
    Ok(settings)
}
#[tauri::command]
async fn analyze_url(
    url: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let url = model::validate_url(&url)?;
    let tools = resolve_tools(&app)?;
    let settings = state.settings.lock().map_err(|_| "设置锁不可用")?.clone();
    let mut args = model::proxy_args(&settings)?;
    args.extend(
        [
            "--ignore-config",
            "--encoding",
            "utf-8",
            "--no-color",
            "--no-playlist",
            "--skip-download",
            "--dump-single-json",
            "--socket-timeout",
            "30",
            "--retries",
            "3",
            "--",
            &url,
        ]
        .into_iter()
        .map(str::to_string),
    );
    let (id, control) = state.tasks.reserve()?;
    let title = "链接解析";
    task_event(&app, id, title, "running", "正在获取视频信息");
    let result = execute(&app, &tools.ytdlp, &args, id, control, true)
        .await
        .and_then(|bytes| {
            serde_json::from_slice(&bytes)
                .map(model::normalize_metadata)
                .map_err(|e| format!("无法解析视频信息 JSON: {e}"))
        });
    state.tasks.finish(id);
    match &result {
        Ok(_) => task_event(&app, id, title, "success", "链接解析完成"),
        Err(e) => {
            log(&app, id, e);
            task_event(
                &app,
                id,
                title,
                if e == "任务已取消" {
                    "cancelled"
                } else {
                    "error"
                },
                e,
            );
        }
    }
    result
}

fn launch(
    app: AppHandle,
    executable: PathBuf,
    args: Vec<String>,
    title: String,
) -> Result<u64, String> {
    let state = app.state::<AppState>();
    let (id, control) = state.tasks.reserve()?;
    task_event(&app, id, &title, "running", "任务已启动");
    log(&app, id, format!("开始：{title}"));
    let worker_app = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = execute(&worker_app, &executable, &args, id, control, false).await;
        worker_app.state::<AppState>().tasks.finish(id);
        match result {
            Ok(_) => {
                log(&worker_app, id, format!("{title}已完成"));
                task_event(&worker_app, id, &title, "success", "任务已完成");
            }
            Err(e) => {
                log(&worker_app, id, &e);
                task_event(
                    &worker_app,
                    id,
                    &title,
                    if e == "任务已取消" {
                        "cancelled"
                    } else {
                        "error"
                    },
                    &e,
                );
            }
        }
    });
    Ok(id)
}
#[tauri::command]
fn start_download(
    request: DownloadRequest,
    app: AppHandle,
    state: State<AppState>,
) -> Result<u64, String> {
    let tools = resolve_tools(&app)?;
    let settings = state.settings.lock().map_err(|_| "设置锁不可用")?.clone();
    std::fs::create_dir_all(&settings.download_path)
        .map_err(|e| format!("无法创建下载目录: {e}"))?;
    let args = model::download_args(&request, &settings, &tools.ffmpeg_dir.to_string_lossy())?;
    let title = match request.kind {
        DownloadKind::Quick => "快速下载",
        DownloadKind::Format => "指定格式下载",
        DownloadKind::Combined => "音视频组合下载",
        DownloadKind::Subtitle => "字幕下载",
        DownloadKind::Thumbnail => "封面下载",
        DownloadKind::Description => "简介下载",
    };
    launch(app, tools.ytdlp, args, title.into())
}
#[tauri::command]
fn list_supported_sites(app: AppHandle) -> Result<u64, String> {
    let tools = resolve_tools(&app)?;
    launch(
        app,
        tools.ytdlp,
        vec![
            "--ignore-config".into(),
            "--encoding".into(),
            "utf-8".into(),
            "--no-color".into(),
            "--list-extractors".into(),
        ],
        "支持网站列表".into(),
    )
}
#[tauri::command]
fn cancel_task(task_id: u64, state: State<AppState>) -> Result<(), String> {
    state.tasks.cancel(task_id)
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(updater::UpdateState::default())
        .manage(tools::ToolInstallState::default())
        .setup(|app| {
            let config = app.path().app_config_dir()?;
            std::fs::create_dir_all(&config)?;
            let settings_file = config.join("settings.json");
            let default = Settings {
                download_path: app
                    .path()
                    .download_dir()
                    .or_else(|_| app.path().home_dir().map(|p| p.join("Downloads")))?
                    .to_string_lossy()
                    .into_owned(),
                retry_times: "10".into(),
                concurrent_fragments: model::default_concurrent_fragments(),
                proxy_enabled: false,
                proxy_url: model::default_proxy_url(),
            };
            let settings = std::fs::read(&settings_file)
                .ok()
                .and_then(|bytes| serde_json::from_slice::<Settings>(&bytes).ok())
                .filter(|s| validate_settings(s).is_ok())
                .unwrap_or(default);
            app.manage(AppState {
                settings: Mutex::new(settings),
                settings_file,
                tasks: TaskRegistry::default(),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            analyze_url,
            start_download,
            list_supported_sites,
            cancel_task,
            updater::fetch_latest_release,
            updater::download_and_install_update,
            updater::get_tool_info,
            tools::get_tool_status,
            tools::download_tools,
            tools::cancel_tool_download,
            tools::open_tool_licenses,
            tools::open_gui_licenses
        ])
        .build(tauri::generate_context!())
        .expect("无法启动 yt-dlp GUI");
    app.run(|app, event| {
        if matches!(
            event,
            tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit
        ) {
            app.state::<tools::ToolInstallState>().cancel();
            app.state::<AppState>().tasks.shutdown();
        }
    });
}
