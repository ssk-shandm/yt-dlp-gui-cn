use crate::{process::tool_directory, AppState};
use serde::Serialize;
use std::{
    error::Error,
    fs,
    io::Write,
    path::Path,
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Default)]
pub struct UpdateState {
    busy: AtomicBool,
}

struct Busy<'a>(&'a AtomicBool);

impl Drop for Busy<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

impl UpdateState {
    fn begin(&self) -> Result<Busy<'_>, String> {
        self.busy
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map_err(|_| "更新操作正在进行，请勿重复点击".to_string())?;
        Ok(Busy(&self.busy))
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    downloaded: u64,
    total: Option<u64>,
    percent: Option<u8>,
    file_name: String,
}

fn validate_update_url(url: &str) -> Result<(), String> {
    let Some(rest) = url.strip_prefix("https://") else {
        return Err("Update URL must use HTTPS".to_string());
    };
    let host = rest
        .split(['/', '?', '#'])
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    let allowed_hosts = [
        "github.com",
        "objects.githubusercontent.com",
        "github-releases.githubusercontent.com",
        "release-assets.githubusercontent.com",
    ];
    if !allowed_hosts.contains(&host.as_str()) {
        return Err("Update URL is not a supported GitHub Release asset".to_string());
    }
    Ok(())
}

fn safe_update_file_name(file_name: &str) -> Result<String, String> {
    let name = file_name.trim();
    if name.contains(['/', '\\']) {
        return Err("Update installer file name contains a path separator".to_string());
    }
    if name.is_empty()
        || name == "."
        || name == ".."
        || !name.to_ascii_lowercase().ends_with("-setup.exe")
    {
        return Err("Invalid update installer file name".to_string());
    }
    if !name
        .chars()
        .all(|character| !character.is_control() && !r#"<>:"/\\|?*"#.contains(character))
    {
        return Err("Update installer file name contains unsafe characters".to_string());
    }
    Ok(name.to_string())
}

// Load the OS trust store (including user-trusted proxy/enterprise roots), and
// honor system proxies. Keep TLS verification enabled for executable downloads.
fn update_http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("yt-dlp-gui-cn-updater")
        .https_only(true)
        .connect_timeout(Duration::from_secs(30))
        // Limit stalled reads, not the total duration of a large installer download.
        .read_timeout(Duration::from_secs(60))
        .build()
        .map_err(|error| update_network_error("无法初始化更新下载器", &error))
}

fn error_chain(error: &dyn Error) -> String {
    let mut details = error.to_string();
    let mut source = error.source();
    while let Some(cause) = source {
        details.push_str(" → ");
        details.push_str(&cause.to_string());
        source = cause.source();
    }
    details
}

fn update_network_error(context: &str, error: &reqwest::Error) -> String {
    let details = error_chain(error);
    let lower = details.to_ascii_lowercase();
    let hint = if error.is_timeout() {
        "连接或读取超时，请检查网络及系统代理后重试。"
    } else if lower.contains("certificate") || lower.contains("unknownissuer") {
        "HTTPS 证书校验失败，请检查系统时间、系统信任证书及代理软件的证书配置；请勿关闭证书校验。"
    } else if error.is_connect() {
        "无法连接 GitHub 下载服务器，请检查网络及 Windows 系统代理设置。"
    } else {
        "请检查网络及系统代理，或通过浏览器下载 Release 中的安装包后手动安装。"
    };
    format!("{context}：{hint}\n详细原因：{details}")
}

#[tauri::command]
pub async fn download_and_install_update(
    app: AppHandle,
    state: State<'_, UpdateState>,
    url: String,
    file_name: String,
) -> Result<(), String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, state, url, file_name);
        return Err("自动安装更新目前仅支持 Windows 桌面端".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        let _busy = state.begin()?;
        validate_update_url(&url)?;
        let safe_name = safe_update_file_name(&file_name)?;
        let executable =
            std::env::current_exe().map_err(|error| format!("无法获取当前程序路径：{error}"))?;
        let install_directory = executable
            .parent()
            .ok_or_else(|| "无法获取当前安装目录".to_string())?;
        if !install_directory.join("uninstall.exe").is_file() {
            return Err("当前运行的是便携版或开发版，自动安装不会替换此文件。请使用 Release 中的 *-setup.exe 安装版启动。".to_string());
        }

        app.state::<AppState>().tasks.begin_update()?;
        let result = download_update_package(&app, &url, &safe_name, install_directory).await;
        if result.is_err() {
            app.state::<AppState>().tasks.end_update();
        }
        result
    }
}

#[cfg(target_os = "windows")]
async fn download_update_package(
    app: &AppHandle,
    url: &str,
    safe_name: &str,
    install_directory: &Path,
) -> Result<(), String> {
    let save_dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().temp_dir())
        .map_err(|error| format!("无法获取更新保存目录：{error}"))?;
    fs::create_dir_all(&save_dir).map_err(|error| format!("无法创建更新保存目录：{error}"))?;
    let target = save_dir.join(safe_name);
    let partial = save_dir.join(format!("{safe_name}.part"));
    let response = update_http_client()?
        .get(url)
        .header("Accept", "application/octet-stream")
        .send()
        .await
        .map_err(|error| update_network_error("更新下载失败", &error))?;
    if !response.status().is_success() {
        return Err(format!("更新下载失败（HTTP {}）", response.status()));
    }

    let total = response.content_length();
    let mut downloaded = 0_u64;
    let mut output =
        fs::File::create(&partial).map_err(|error| format!("无法创建更新文件：{error}"))?;
    let emit_progress = |downloaded: u64, percent: Option<u8>| {
        let _ = app.emit(
            "update-download-progress",
            DownloadProgress {
                downloaded,
                total,
                percent,
                file_name: safe_name.to_string(),
            },
        );
    };
    emit_progress(0, total.map(|_| 0));
    let mut last_percent = Some(0_u8);
    let mut last_reported_bytes = 0_u64;
    let mut response = response;
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| update_network_error("读取更新数据失败", &error))?
    {
        output
            .write_all(&chunk)
            .map_err(|error| format!("保存更新文件失败：{error}"))?;
        downloaded += chunk.len() as u64;
        match total {
            Some(size) => {
                let percent = downloaded
                    .saturating_mul(100)
                    .checked_div(size)
                    .unwrap_or(100)
                    .min(100) as u8;
                if last_percent != Some(percent) {
                    last_percent = Some(percent);
                    emit_progress(downloaded, Some(percent));
                }
            }
            None => {
                if downloaded.saturating_sub(last_reported_bytes) >= 1024 * 1024 {
                    last_reported_bytes = downloaded;
                    emit_progress(downloaded, None);
                }
            }
        }
    }
    output
        .flush()
        .map_err(|error| format!("写入更新文件失败：{error}"))?;
    drop(output);
    if downloaded == 0 || total.is_some_and(|size| size != downloaded) {
        let _ = fs::remove_file(&partial);
        return Err("更新安装包下载不完整，请重试".to_string());
    }
    if total.is_none() {
        emit_progress(downloaded, None);
    }
    if target.exists() {
        let _ = fs::remove_file(&target);
    }
    fs::rename(&partial, &target).map_err(|error| format!("无法保存更新安装包：{error}"))?;
    let _ = app.emit(
        "update-install-starting",
        target.to_string_lossy().into_owned(),
    );
    launch_installer(&target, install_directory).map_err(|error| {
        format!(
            "{error}。安装包已保存到：{}，可手动运行安装",
            target.display()
        )
    })?;
    app.exit(0);
    Ok(())
}

#[cfg(target_os = "windows")]
fn launch_installer(path: &Path, install_directory: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::UI::Shell::ShellExecuteW;
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    fn wide(value: &std::ffi::OsStr) -> Vec<u16> {
        value.encode_wide().chain(std::iter::once(0)).collect()
    }

    let operation = wide(std::ffi::OsStr::new("open"));
    let file = wide(path.as_os_str());
    let mut arguments = std::ffi::OsString::from("/UPDATE /P /R /D=");
    arguments.push(install_directory);
    let parameters = wide(&arguments);
    let directory = path.parent().map(|dir| wide(dir.as_os_str()));
    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            operation.as_ptr(),
            file.as_ptr(),
            parameters.as_ptr(),
            directory
                .as_ref()
                .map_or(std::ptr::null(), |dir| dir.as_ptr()),
            SW_SHOWNORMAL,
        )
    };
    let code = result as isize;
    if code > 32 {
        Ok(())
    } else if code == 5 {
        Err("已取消管理员授权，更新未安装".to_string())
    } else {
        Err(format!("无法启动更新安装程序（错误码 {code}）"))
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolInfo {
    bin_path: String,
    ffmpeg_version: String,
}

#[tauri::command]
pub async fn get_tool_info(app: AppHandle) -> Result<ToolInfo, String> {
    let dir = tool_directory(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = std::process::Command::new(dir.join("ffmpeg.exe"));
        cmd.arg("-version");
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000);
        }
        let output = cmd
            .output()
            .map_err(|error| format!("无法读取 FFmpeg 版本：{error}"))?;
        if !output.status.success() {
            return Err("FFmpeg 版本读取失败".into());
        }
        Ok(ToolInfo {
            bin_path: dir.to_string_lossy().into_owned(),
            ffmpeg_version: String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .unwrap_or("未知版本")
                .to_string(),
        })
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "requires network access to a GitHub Release asset"]
    async fn github_release_download_network_smoke() {
        let url = std::env::var("YT_DLP_GUI_UPDATE_TEST_URL")
            .expect("set YT_DLP_GUI_UPDATE_TEST_URL to a GitHub Release installer URL");
        validate_update_url(&url).unwrap();
        let result = update_http_client()
            .unwrap()
            .get(url)
            .header("Accept", "application/octet-stream")
            .send()
            .await;
        let response = result
            .unwrap_or_else(|error| panic!("{}", update_network_error("更新下载失败", &error)));
        assert!(response.status().is_success(), "{}", response.status());
        let expected_length = response.content_length();
        let mut response = response;
        let mut downloaded = 0_u64;
        let mut signature: Vec<u8> = Vec::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .unwrap_or_else(|error| panic!("{}", update_network_error("读取更新数据失败", &error)))
        {
            signature.extend(chunk.iter().copied().take(2 - signature.len()));
            downloaded += chunk.len() as u64;
        }
        assert_eq!(signature, b"MZ", "installer has no EXE signature");
        assert!(downloaded > 0, "empty installer");
        if let Some(length) = expected_length {
            assert_eq!(downloaded, length, "incomplete installer");
        }
        println!("GitHub installer stream verified: {downloaded} bytes");
    }

    #[test]
    fn network_errors_keep_the_underlying_cause() {
        #[derive(Debug)]
        struct Failure(Option<Box<Failure>>, &'static str);

        impl std::fmt::Display for Failure {
            fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                formatter.write_str(self.1)
            }
        }

        impl Error for Failure {
            fn source(&self) -> Option<&(dyn Error + 'static)> {
                self.0.as_deref().map(|error| error as &dyn Error)
            }
        }

        let error = Failure(
            Some(Box::new(Failure(
                None,
                "invalid peer certificate: UnknownIssuer",
            ))),
            "error sending request",
        );
        assert_eq!(
            error_chain(&error),
            "error sending request → invalid peer certificate: UnknownIssuer"
        );
    }

    #[test]
    fn updater_client_can_be_built_with_system_trust() {
        assert!(update_http_client().is_ok());
    }

    #[test]
    fn update_operations_are_serialized() {
        let state = UpdateState::default();
        let busy = state.begin().unwrap();
        assert!(state.begin().is_err());
        drop(busy);
        assert!(state.begin().is_ok());
    }

    #[test]
    fn installer_names_are_restricted_to_nsis_packages() {
        assert!(safe_update_file_name("yt-dlp GUI_1.2.0_x64-setup.exe").is_ok());
        for name in ["yt-dlp.exe", "../app-setup.exe", "app-setup.zip"] {
            assert!(safe_update_file_name(name).is_err());
        }
    }
}
