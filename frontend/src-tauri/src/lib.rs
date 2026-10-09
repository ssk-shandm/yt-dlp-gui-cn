mod model;
mod process;
mod tools;
mod updater;

use model::{AppError, AppResult, DownloadKind, DownloadRequest, Settings};
use process::{execute, log_notice, resolve_tools, task_event, TaskRegistry};
use std::{path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager, State};

pub struct AppState {
    settings: Mutex<Settings>,
    settings_file: PathBuf,
    tasks: TaskRegistry,
}

fn validate_settings(settings: &Settings) -> AppResult<()> {
    model::validate_retries(&settings.retry_times)?;
    model::validate_concurrent_fragments(settings.concurrent_fragments)?;
    if settings.proxy_enabled {
        model::validate_proxy_url(&settings.proxy_url)?;
    }
    if !PathBuf::from(&settings.download_path).is_absolute() {
        return Err(AppError::new("settings.pathNotAbsolute"));
    }
    if settings.download_path.contains('\0') {
        return Err(AppError::new("settings.pathInvalid"));
    }
    Ok(())
}
#[tauri::command]
fn get_settings(state: State<AppState>) -> AppResult<Settings> {
    state
        .settings
        .lock()
        .map(|s| s.clone())
        .map_err(|_| AppError::new("settings.lockUnavailable"))
}
#[tauri::command]
fn save_settings(settings: Settings, state: State<AppState>) -> AppResult<Settings> {
    validate_settings(&settings)?;
    std::fs::create_dir_all(&settings.download_path).map_err(|e| {
        AppError::with("settings.directoryCreateFailed", e.to_string())
    })?;
    let mut current = state
        .settings
        .lock()
        .map_err(|_| AppError::new("settings.lockUnavailable"))?;
    let json = serde_json::to_vec_pretty(&settings)
        .map_err(|e| AppError::with("settings.saveFailed", e.to_string()))?;
    std::fs::write(&state.settings_file, json)
        .map_err(|e| AppError::with("settings.saveFailed", e.to_string()))?;
    *current = settings.clone();
    Ok(settings)
}
#[tauri::command]
async fn analyze_url(
    url: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> AppResult<serde_json::Value> {
    let url = model::validate_url(&url)?;
    let tools = resolve_tools(&app)?;
    let settings = state
        .settings
        .lock()
        .map_err(|_| AppError::new("settings.lockUnavailable"))?
        .clone();
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
    task_event(&app, id, "analyze", "running", AppError::new("task.analyzing"));
    let result = execute(&app, &tools.ytdlp, &args, id, control, true)
        .await
        .and_then(|bytes| {
            serde_json::from_slice(&bytes)
                .map(model::normalize_metadata)
                .map_err(|e| AppError::with("metadata.parseFailed", e.to_string()))
        });
    state.tasks.finish(id);
    match &result {
        Ok(_) => task_event(&app, id, "analyze", "success", AppError::new("task.analyzed")),
        Err(e) => {
            log_notice(&app, id, e.clone());
            let status = if e.code == "task.cancelled" {
                "cancelled"
            } else {
                "error"
            };
            task_event(&app, id, "analyze", status, e.clone());
        }
    }
    result
}

fn launch(
    app: AppHandle,
    executable: PathBuf,
    args: Vec<String>,
    kind: &'static str,
) -> AppResult<u64> {
    let state = app.state::<AppState>();
    let (id, control) = state.tasks.reserve()?;
    task_event(&app, id, kind, "running", AppError::new("task.started"));
    log_notice(&app, id, AppError::with("log.started", kind));
    let worker_app = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = execute(&worker_app, &executable, &args, id, control, false).await;
        worker_app.state::<AppState>().tasks.finish(id);
        match result {
            Ok(_) => {
                log_notice(&worker_app, id, AppError::with("log.completed", kind));
                task_event(&worker_app, id, kind, "success", AppError::new("task.completed"));
            }
            Err(e) => {
                let status = if e.code == "task.cancelled" {
                    "cancelled"
                } else {
                    "error"
                };
                log_notice(&worker_app, id, e.clone());
                task_event(&worker_app, id, kind, status, e);
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
) -> AppResult<u64> {
    let tools = resolve_tools(&app)?;
    let settings = state
        .settings
        .lock()
        .map_err(|_| AppError::new("settings.lockUnavailable"))?
        .clone();
    std::fs::create_dir_all(&settings.download_path).map_err(|e| {
        AppError::with("settings.directoryCreateFailed", e.to_string())
    })?;
    let args = model::download_args(&request, &settings, &tools.ffmpeg_dir.to_string_lossy())?;
    let kind = match request.kind {
        DownloadKind::Quick => "quick",
        DownloadKind::Format => "format",
        DownloadKind::Combined => "combined",
        DownloadKind::Subtitle => "subtitle",
        DownloadKind::Thumbnail => "thumbnail",
        DownloadKind::Description => "description",
    };
    launch(app, tools.ytdlp, args, kind)
}
#[tauri::command]
fn list_supported_sites(app: AppHandle) -> AppResult<u64> {
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
        "sites",
    )
}
#[tauri::command]
fn cancel_task(task_id: u64, state: State<AppState>) -> AppResult<()> {
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
        .expect("failed to start GrabMeta");
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
