use crate::{process::tool_directory, AppState};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File},
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::Notify;

mod transfer;

const YTDLP_REPOSITORY: &str = "yt-dlp/yt-dlp";
const FFMPEG_REPOSITORY: &str = "BtbN/FFmpeg-Builds";
const FILE_NAMES: [&str; 3] = ["yt-dlp.exe", "ffmpeg.exe", "ffprobe.exe"];

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ToolProfile {
    Basic,
    Full,
}
impl ToolProfile {
    fn asset_name(self) -> &'static str {
        match self {
            Self::Basic => "ffmpeg-master-latest-win64-lgpl.zip",
            Self::Full => "ffmpeg-master-latest-win64-gpl.zip",
        }
    }
}

#[derive(Default)]
pub struct ToolInstallState {
    busy: AtomicBool,
    cancelled: Arc<AtomicBool>,
    notify: Notify,
}
struct Busy<'a>(&'a ToolInstallState);
impl Drop for Busy<'_> {
    fn drop(&mut self) {
        self.0.busy.store(false, Ordering::SeqCst);
    }
}
impl ToolInstallState {
    fn begin(&self) -> Result<Busy<'_>, String> {
        self.busy
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map_err(|_| "工具安装正在进行，请勿重复点击".to_string())?;
        self.cancelled.store(false, Ordering::SeqCst);
        Ok(Busy(self))
    }
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
        self.notify.notify_waiters();
        self.notify.notify_one();
    }
    fn check(&self) -> Result<(), String> {
        check_cancelled(&self.cancelled)
    }
    async fn wait<T>(
        &self,
        future: impl std::future::Future<Output = Result<T, String>>,
    ) -> Result<T, String> {
        self.check()?;
        tokio::select! {
            biased;
            _ = async { loop {
                let notified = self.notify.notified();
                tokio::pin!(notified);
                notified.as_mut().enable();
                if self.cancelled.load(Ordering::SeqCst) { break; }
                notified.await;
            } } => Err("工具安装已取消".into()),
            result = future => { self.check()?; result }
        }
    }
}
fn check_cancelled(cancelled: &AtomicBool) -> Result<(), String> {
    if cancelled.load(Ordering::SeqCst) {
        Err("工具安装已取消".into())
    } else {
        Ok(())
    }
}
struct TaskPause<'a>(&'a crate::process::TaskRegistry);
impl Drop for TaskPause<'_> {
    fn drop(&mut self) {
        self.0.end_tools_install();
    }
}
struct Staging(PathBuf);
impl Drop for Staging {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolStatus {
    pub installed: bool,
    pub profile: Option<ToolProfile>,
    pub bin_path: String,
    pub ytdlp_version: Option<String>,
    pub ffmpeg_version: Option<String>,
    pub ffprobe_version: Option<String>,
    pub missing: Vec<String>,
    pub error: Option<String>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Progress {
    profile: ToolProfile,
    stage: String,
    downloaded: u64,
    total: Option<u64>,
    percent: Option<u8>,
}
fn emit_progress(
    app: &AppHandle,
    profile: ToolProfile,
    stage: &str,
    downloaded: u64,
    total: Option<u64>,
) {
    let percent = total.filter(|n| *n > 0).map(|n| {
        downloaded
            .saturating_mul(100)
            .checked_div(n)
            .unwrap_or(0)
            .min(100) as u8
    });
    let _ = app.emit(
        "tool-download-progress",
        Progress {
            profile,
            stage: stage.into(),
            downloaded,
            total,
            percent,
        },
    );
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Asset {
    repository: String,
    release_tag: String,
    published_at: String,
    name: String,
    url: String,
    size: u64,
    sha256: String,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ToolMarker {
    schema_version: u8,
    profile: ToolProfile,
    installed_at_unix: u64,
    ytdlp: Asset,
    ffmpeg: Asset,
    versions: Vec<String>,
    ytdlp_notices: Asset,
}
fn marker_path(dir: &Path) -> PathBuf {
    dir.join("tool-profile.json")
}
fn read_marker(dir: &Path) -> Option<ToolMarker> {
    serde_json::from_slice::<ToolMarker>(&fs::read(marker_path(dir)).ok()?)
        .ok()
        .filter(|m| m.schema_version == 1)
}

fn validate_download_url(value: &str) -> Result<(), String> {
    let url = url::Url::parse(value).map_err(|_| "工具下载地址无效".to_string())?;
    if url.scheme() != "https"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some_and(|p| p != 443)
    {
        return Err("工具下载地址必须使用无凭据的标准 HTTPS".into());
    }
    if !matches!(
        url.host_str(),
        Some(
            "api.github.com"
                | "github.com"
                | "objects.githubusercontent.com"
                | "release-assets.githubusercontent.com"
                | "github-releases.githubusercontent.com"
        )
    ) {
        return Err("不支持的工具下载域名".into());
    }
    Ok(())
}
fn client(settings: &crate::model::Settings) -> Result<reqwest::Client, String> {
    crate::model::configure_http_proxy(reqwest::Client::builder(), settings)?
        // Range workers need independent TCP connections. HTTP/2 multiplexing
        // can otherwise put all four requests on one throttled connection.
        .http1_only()
        .user_agent("yt-dlp-gui-cn-tools")
        .https_only(true)
        .connect_timeout(Duration::from_secs(30))
        .read_timeout(Duration::from_secs(60))
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 5 {
                attempt.error("工具下载重定向过多")
            } else if validate_download_url(attempt.url().as_str()).is_err() {
                attempt.error("工具下载重定向到不支持的域名或协议")
            } else {
                attempt.follow()
            }
        }))
        .build()
        .map_err(|e| network_error("无法初始化工具下载器", &e))
}
fn network_error(context: &str, error: &reqwest::Error) -> String {
    use std::error::Error;
    let mut detail = error.to_string();
    let mut source = error.source();
    while let Some(cause) = source {
        detail.push_str(&format!(" → {cause}"));
        source = cause.source();
    }
    format!("{context}：请检查网络、系统代理、系统时间及受信任证书后重试；不要关闭 HTTPS 证书校验。\n{detail}")
}
fn asset_from_metadata(
    repository: &str,
    name: &str,
    metadata: &serde_json::Value,
) -> Result<Asset, String> {
    let asset = metadata["assets"]
        .as_array()
        .and_then(|list| list.iter().find(|a| a["name"].as_str() == Some(name)))
        .ok_or_else(|| format!("上游发布缺少 {name}"))?;
    let url = asset["browser_download_url"]
        .as_str()
        .ok_or("上游缺少下载地址")?;
    validate_download_url(url)?;
    let prefix = format!("https://github.com/{repository}/releases/download/");
    if !url.starts_with(&prefix) {
        return Err("工具资产不属于指定上游项目".into());
    }
    let sha256 = asset["digest"]
        .as_str()
        .and_then(|s| s.strip_prefix("sha256:"))
        .filter(|s| s.len() == 64 && s.bytes().all(|c| c.is_ascii_hexdigit()))
        .ok_or("上游未提供有效 SHA-256 摘要，无法安全安装，请稍后重试")?;
    let size = asset["size"]
        .as_u64()
        .filter(|size| *size > 0 && *size <= 512 * 1024 * 1024)
        .ok_or("工具资产大小无效或超过 512 MB 限制")?;
    Ok(Asset {
        repository: repository.into(),
        release_tag: metadata["tag_name"]
            .as_str()
            .ok_or("上游缺少版本信息")?
            .into(),
        published_at: metadata["published_at"].as_str().unwrap_or_default().into(),
        name: name.into(),
        url: url.into(),
        size,
        sha256: sha256.to_ascii_lowercase(),
    })
}
fn ffmpeg_asset_name(profile: ToolProfile, metadata: &serde_json::Value) -> Result<&str, String> {
    let assets = metadata["assets"].as_array().ok_or("上游缺少资产列表")?;
    // The rolling `latest` tag has aliases, but /releases/latest normally returns
    // an immutable daily release with versioned master builds. Never select a
    // shared, nonfree, other-architecture or stable-branch archive by accident.
    let suffix = match profile {
        ToolProfile::Basic => "-win64-lgpl.zip",
        ToolProfile::Full => "-win64-gpl.zip",
    };
    let candidates: Vec<&str> = assets
        .iter()
        .filter_map(|asset| asset["name"].as_str())
        .filter(|name| {
            if *name == profile.asset_name() {
                return true;
            }
            name.strip_prefix("ffmpeg-N-")
                .and_then(|name| name.strip_suffix(suffix))
                .is_some_and(|version| {
                    version.split_once("-g").is_some_and(|(count, revision)| {
                        !count.is_empty()
                            && count.bytes().all(|c| c.is_ascii_digit())
                            && (7..=40).contains(&revision.len())
                            && revision.bytes().all(|c| c.is_ascii_hexdigit())
                    })
                })
        })
        .collect();
    match candidates.as_slice() {
        [name] => Ok(name),
        [] => Err(format!(
            "上游发布缺少 Windows x64 静态 {profile:?} FFmpeg 构建"
        )),
        _ => Err("上游 FFmpeg 构建匹配不唯一，拒绝自动选择".into()),
    }
}
async fn resolve_release(
    client: &reqwest::Client,
    state: &ToolInstallState,
    repository: &str,
) -> Result<serde_json::Value, String> {
    let url = format!("https://api.github.com/repos/{repository}/releases/latest");
    let mut response = state
        .wait(async {
            client
                .get(&url)
                .send()
                .await
                .map_err(|e| network_error("读取上游版本失败", &e))
        })
        .await?;
    if !response.status().is_success() {
        return Err(format!(
            "读取上游版本失败（HTTP {}），可能达到 GitHub 请求限额，请稍后重试",
            response.status()
        ));
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = state
        .wait(async {
            response
                .chunk()
                .await
                .map_err(|e| network_error("读取上游版本失败", &e))
        })
        .await?
    {
        if bytes.len() + chunk.len() > 2 * 1024 * 1024 {
            return Err("上游版本响应过大".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&bytes).map_err(|e| format!("上游版本响应无效：{e}"))
}
async fn resolve_asset(
    client: &reqwest::Client,
    state: &ToolInstallState,
    repository: &str,
    name: &str,
) -> Result<Asset, String> {
    let metadata = resolve_release(client, state, repository).await?;
    let name = if repository == FFMPEG_REPOSITORY {
        let profile = if name == ToolProfile::Basic.asset_name() {
            ToolProfile::Basic
        } else if name == ToolProfile::Full.asset_name() {
            ToolProfile::Full
        } else {
            return Err("不支持的 FFmpeg 配置".into());
        };
        ffmpeg_asset_name(profile, &metadata)?
    } else {
        name
    };
    asset_from_metadata(repository, name, &metadata)
}
async fn download_file(
    app: &AppHandle,
    profile: ToolProfile,
    client: &reqwest::Client,
    state: &ToolInstallState,
    asset: &Asset,
    target: &Path,
) -> Result<(), String> {
    validate_download_url(&asset.url)?;
    transfer::download(client, state, asset, target, |downloaded| {
        emit_progress(app, profile, &asset.name, downloaded, Some(asset.size));
    })
    .await
}

fn is_safe_archive_name(name: &str) -> bool {
    // Use Windows rules even when unit tests run on another OS.
    !name.is_empty()
        && !name.starts_with(['/', '\\'])
        && !name.contains([':', '\0'])
        && !name
            .replace('\\', "/")
            .split('/')
            .any(|part| part == ".." || part.ends_with(' ') || part.ends_with('.'))
}
fn validate_pe(path: &Path) -> Result<(), String> {
    let mut file = File::open(path).map_err(|e| format!("无法读取 {}：{e}", path.display()))?;
    let mut header = [0u8; 64];
    file.read_exact(&mut header)
        .map_err(|_| "工具文件不完整".to_string())?;
    if &header[..2] != b"MZ" {
        return Err("工具不是 Windows EXE".into());
    }
    use std::io::{Seek, SeekFrom};
    let offset = u32::from_le_bytes(header[60..64].try_into().unwrap()) as u64;
    file.seek(SeekFrom::Start(offset))
        .map_err(|e| e.to_string())?;
    let mut signature = [0u8; 6];
    file.read_exact(&mut signature)
        .map_err(|_| "工具 PE 头不完整".to_string())?;
    if &signature[..4] != b"PE\0\0" || signature[4..6] != [0x64, 0x86] {
        return Err("工具不是 Windows x64 EXE".into());
    }
    Ok(())
}
fn extract_ffmpeg(zip_path: &Path, dir: &Path, cancelled: &AtomicBool) -> Result<(), String> {
    let mut archive = zip::ZipArchive::new(File::open(zip_path).map_err(|e| e.to_string())?)
        .map_err(|e| format!("FFmpeg 压缩包损坏：{e}"))?;
    if archive.len() > 20_000 {
        return Err("FFmpeg 压缩包条目过多".into());
    }
    let mut found = [false, false];
    let materials = dir.join("licenses/ffmpeg");
    fs::create_dir_all(&materials).map_err(|e| e.to_string())?;
    let mut expanded = 0u64;
    for index in 0..archive.len() {
        check_cancelled(cancelled)?;
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();
        if !is_safe_archive_name(&name)
            || entry.unix_mode().is_some_and(|m| m & 0o170000 == 0o120000)
        {
            return Err("FFmpeg 压缩包包含不安全路径或符号链接".into());
        }
        if entry.is_dir() {
            continue;
        }
        let normalized = name.replace('\\', "/");
        let leaf = normalized
            .rsplit('/')
            .next()
            .unwrap_or_default()
            .to_ascii_lowercase();
        let (target, max_size) = match leaf.as_str() {
            "ffmpeg.exe" | "ffprobe.exe" => {
                let i = usize::from(leaf == "ffprobe.exe");
                if found[i] {
                    return Err("FFmpeg 压缩包包含重复工具".into());
                }
                found[i] = true;
                (dir.join(&leaf), 512 * 1024 * 1024)
            }
            "license.txt" | "readme.txt" | "readme.md" | "copying.lgplv2.1" | "copying.gplv3" => {
                (materials.join(&leaf), 4 * 1024 * 1024)
            }
            _ => continue,
        };
        if entry.size() > max_size {
            return Err("FFmpeg 解压文件过大".into());
        }
        let mut output = File::create(&target).map_err(|e| e.to_string())?;
        let mut buffer = [0u8; 65536];
        let mut written = 0u64;
        loop {
            check_cancelled(cancelled)?;
            let n = entry
                .read(&mut buffer)
                .map_err(|e| format!("FFmpeg 解压失败：{e}"))?;
            if n == 0 {
                break;
            }
            written += n as u64;
            expanded += n as u64;
            if written > max_size || expanded > 1100 * 1024 * 1024 {
                return Err("FFmpeg 解压超过大小限制".into());
            }
            output.write_all(&buffer[..n]).map_err(|e| e.to_string())?;
        }
        output.sync_all().map_err(|e| e.to_string())?;
    }
    if !found.into_iter().all(|v| v) {
        return Err("压缩包缺少 ffmpeg.exe 或 ffprobe.exe".into());
    }
    for name in ["ffmpeg.exe", "ffprobe.exe"] {
        validate_pe(&dir.join(name))?;
    }
    Ok(())
}

fn extract_ytdlp_notices(
    zip_path: &Path,
    dir: &Path,
    cancelled: &AtomicBool,
) -> Result<(), String> {
    let mut archive = zip::ZipArchive::new(File::open(zip_path).map_err(|e| e.to_string())?)
        .map_err(|e| format!("yt-dlp 许可压缩包损坏：{e}"))?;
    if archive.len() > 20_000 {
        return Err("yt-dlp 许可压缩包条目过多".into());
    }
    let materials = dir.join("licenses/yt-dlp");
    fs::create_dir_all(&materials).map_err(|e| e.to_string())?;
    let mut found = false;
    let mut total = 0u64;
    for index in 0..archive.len() {
        check_cancelled(cancelled)?;
        let mut entry = archive.by_index(index).map_err(|e| e.to_string())?;
        let name = entry.name().replace('\\', "/");
        if !is_safe_archive_name(&name)
            || entry.unix_mode().is_some_and(|m| m & 0o170000 == 0o120000)
        {
            return Err("yt-dlp 许可压缩包包含不安全路径".into());
        }
        if entry.is_dir() {
            continue;
        }
        let leaf = name
            .rsplit('/')
            .next()
            .unwrap_or_default()
            .to_ascii_lowercase();
        let target = if leaf == "third_party_licenses.txt" {
            if found {
                return Err("yt-dlp 许可压缩包包含重复通知".into());
            }
            found = true;
            materials.join("THIRD_PARTY_LICENSES.txt")
        } else if matches!(
            leaf.as_str(),
            "license" | "license.txt" | "notice" | "notice.txt" | "copying"
        ) {
            materials.join(format!("dependency-{index}-notice.txt"))
        } else {
            continue;
        };
        if entry.size() > 4 * 1024 * 1024 {
            return Err("yt-dlp 许可文件过大".into());
        }
        let mut bytes = Vec::new();
        (&mut entry)
            .take(4 * 1024 * 1024 + 1)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        total += bytes.len() as u64;
        if bytes.len() > 4 * 1024 * 1024 || total > 16 * 1024 * 1024 {
            return Err("yt-dlp 许可文件超出大小限制".into());
        }
        fs::write(target, bytes).map_err(|e| e.to_string())?;
    }
    if !found {
        return Err("yt-dlp 上游归档缺少第三方许可通知，拒绝安装".into());
    }
    fs::write(
        materials.join("UNLICENSE.txt"),
        include_str!("../../../licenses/yt-dlp/UNLICENSE.txt"),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn version(dir: &Path, name: &str, argument: &str) -> Result<String, String> {
    let mut command = tokio::process::Command::new(dir.join(name));
    command
        .arg(argument)
        .kill_on_drop(true)
        .stdin(std::process::Stdio::null());
    #[cfg(windows)]
    command.creation_flags(0x08000000);
    let output = tokio::time::timeout(Duration::from_secs(15), command.output())
        .await
        .map_err(|_| format!("{name} 版本检查超时"))?
        .map_err(|e| format!("无法启动 {name}：{e}"))?;
    if !output.status.success() {
        return Err(format!("{name} 版本检查失败"));
    }
    let text = String::from_utf8_lossy(&output.stdout)
        .lines()
        .next()
        .unwrap_or_default()
        .trim()
        .to_string();
    if text.is_empty() {
        return Err(format!("{name} 缺少版本输出"));
    }
    Ok(text)
}
async fn probe_versions(dir: &Path) -> Result<Vec<String>, String> {
    for name in FILE_NAMES {
        validate_pe(&dir.join(name))?;
    }
    let (a, b, c) = tokio::try_join!(
        version(dir, "yt-dlp.exe", "--version"),
        version(dir, "ffmpeg.exe", "-version"),
        version(dir, "ffprobe.exe", "-version")
    )?;
    Ok(vec![a, b, c])
}
async fn status_at(dir: PathBuf) -> ToolStatus {
    let missing = FILE_NAMES
        .iter()
        .filter(|n| !dir.join(n).is_file())
        .map(|n| (*n).into())
        .collect::<Vec<_>>();
    let mut result = ToolStatus {
        installed: false,
        profile: None,
        bin_path: dir.to_string_lossy().into_owned(),
        ytdlp_version: None,
        ffmpeg_version: None,
        ffprobe_version: None,
        missing,
        error: None,
    };
    if !result.missing.is_empty() {
        return result;
    }
    match probe_versions(&dir).await {
        Ok(versions) => {
            result.installed = true;
            result.ytdlp_version = Some(versions[0].clone());
            result.ffmpeg_version = Some(versions[1].clone());
            result.ffprobe_version = Some(versions[2].clone());
            result.profile = read_marker(&dir)
                .filter(|m| m.versions == versions)
                .map(|m| m.profile);
        }
        Err(error) => result.error = Some(error),
    }
    result
}
fn replace_install(stage: &Path, target: &Path) -> Result<(), String> {
    for name in FILE_NAMES.into_iter().chain(["tool-profile.json"]) {
        if !stage.join(name).is_file() {
            return Err(format!("安装文件缺失：{name}"));
        }
    }
    let parent = target.parent().ok_or("无法确定工具目录")?;
    let backup = parent.join(".ytdlp-gui-bin-backup");
    if backup.exists() {
        return Err(format!(
            "发现未清理的工具备份 {}，请恢复或移开后重试",
            backup.display()
        ));
    }
    if target.exists() {
        if target.is_symlink() || !target.is_dir() {
            return Err("工具目录不是普通目录，拒绝替换".into());
        }
        fs::rename(target, &backup)
            .map_err(|e| format!("无法准备替换工具（请关闭外部 FFmpeg 进程）：{e}"))?;
    }
    if let Err(error) = fs::rename(stage, target) {
        if backup.exists() {
            fs::rename(&backup, target).map_err(|rollback| {
                format!(
                    "安装失败：{error}；旧工具恢复失败：{rollback}。备份保留在 {}",
                    backup.display()
                )
            })?;
        }
        return Err(format!("无法安装工具，旧工具已保留：{error}"));
    }
    // A failed backup cleanup must not falsely report an already committed install as failed.
    if backup.exists() {
        let _ = fs::remove_dir_all(&backup);
    }
    Ok(())
}
fn recover_backup(target: &Path) -> Result<(), String> {
    let backup = target
        .parent()
        .ok_or("无法确定工具目录")?
        .join(".ytdlp-gui-bin-backup");
    if !target.exists() && backup.is_dir() && FILE_NAMES.iter().all(|n| backup.join(n).is_file()) {
        fs::rename(&backup, target).map_err(|e| format!("无法恢复旧工具：{e}"))?;
    }
    Ok(())
}
#[tauri::command]
pub async fn get_tool_status(app: AppHandle) -> Result<ToolStatus, String> {
    let dir = tool_directory(&app)?;
    if app.state::<ToolInstallState>().busy.load(Ordering::SeqCst) {
        return Err("工具安装正在进行，请等待安装结束后刷新".into());
    }
    recover_backup(&dir)?;
    Ok(status_at(dir).await)
}
#[tauri::command]
pub fn cancel_tool_download(state: State<'_, ToolInstallState>) {
    if state.busy.load(Ordering::SeqCst) {
        state.cancel();
    }
}

#[tauri::command]
pub async fn download_tools(
    app: AppHandle,
    state: State<'_, ToolInstallState>,
    profile: ToolProfile,
) -> Result<ToolStatus, String> {
    let _busy = state.begin()?;
    let app_state = app.state::<AppState>();
    app_state.tasks.begin_tools_install()?;
    let _paused = TaskPause(&app_state.tasks);
    let dir = tool_directory(&app)?;
    let parent = dir.parent().ok_or("无法确定工具目录")?;
    fs::create_dir_all(parent).map_err(|e| format!("无法创建工具目录：{e}"))?;
    let parent = fs::canonicalize(parent).map_err(|e| e.to_string())?;
    let target = parent.join("bin");
    recover_backup(&target)?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?;
    let staging = Staging(parent.join(format!(
        ".ytdlp-gui-install-{}-{}",
        std::process::id(),
        stamp.as_nanos()
    )));
    fs::create_dir(&staging.0).map_err(|e| format!("无法创建临时目录：{e}"))?;
    emit_progress(&app, profile, "读取上游版本", 0, None);
    let settings = app
        .state::<AppState>()
        .settings
        .lock()
        .map_err(|_| "设置锁不可用")?
        .clone();
    let client = client(&settings)?;
    // EXE and notices must come from one immutable release snapshot, not two
    // requests that can straddle a release or duplicate slow API calls.
    let release = resolve_release(&client, &state, YTDLP_REPOSITORY).await?;
    let ytdlp = asset_from_metadata(YTDLP_REPOSITORY, "yt-dlp.exe", &release)?;
    let ytdlp_notices = asset_from_metadata(YTDLP_REPOSITORY, "yt-dlp_win.zip", &release)?;
    let ffmpeg = resolve_asset(&client, &state, FFMPEG_REPOSITORY, profile.asset_name()).await?;
    download_file(
        &app,
        profile,
        &client,
        &state,
        &ytdlp,
        &staging.0.join("yt-dlp.exe"),
    )
    .await?;
    download_file(
        &app,
        profile,
        &client,
        &state,
        &ffmpeg,
        &staging.0.join("ffmpeg.zip"),
    )
    .await?;
    download_file(
        &app,
        profile,
        &client,
        &state,
        &ytdlp_notices,
        &staging.0.join("yt-dlp-notices.zip"),
    )
    .await?;
    emit_progress(&app, profile, "安全解压", 0, None);
    let extract_dir = staging.0.clone();
    let cancelled = state.cancelled.clone();
    // Always join extraction before dropping staging; cancellation cannot leave a writer behind.
    tokio::task::spawn_blocking(move || {
        extract_ffmpeg(&extract_dir.join("ffmpeg.zip"), &extract_dir, &cancelled)?;
        extract_ytdlp_notices(
            &extract_dir.join("yt-dlp-notices.zip"),
            &extract_dir,
            &cancelled,
        )
    })
    .await
    .map_err(|e| e.to_string())??;
    fs::remove_file(staging.0.join("ffmpeg.zip")).map_err(|e| e.to_string())?;
    fs::remove_file(staging.0.join("yt-dlp-notices.zip")).map_err(|e| e.to_string())?;
    emit_progress(&app, profile, "验证工具与许可证", 0, None);
    let versions = state.wait(probe_versions(&staging.0)).await?;
    for (name, args) in [
        ("license-output.txt", vec!["-L"]),
        ("buildconf-output.txt", vec!["-buildconf"]),
    ] {
        let mut command = tokio::process::Command::new(staging.0.join("ffmpeg.exe"));
        command
            .args(args)
            .kill_on_drop(true)
            .stdin(std::process::Stdio::null());
        #[cfg(windows)]
        command.creation_flags(0x08000000);
        let output = state
            .wait(async {
                tokio::time::timeout(Duration::from_secs(15), command.output())
                    .await
                    .map_err(|_| "构建信息检查超时".to_string())?
                    .map_err(|e| e.to_string())
            })
            .await?;
        if !output.status.success() {
            return Err("FFmpeg 构建信息读取失败".into());
        }
        let text = format!(
            "{}\n{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        if name == "buildconf-output.txt" {
            let gpl = text.contains("--enable-gpl");
            if text.contains("--enable-nonfree") || gpl != (profile == ToolProfile::Full) {
                return Err("FFmpeg 实际构建与所选 LGPL/GPL 配置不符，拒绝安装".into());
            }
        }
        fs::write(staging.0.join("licenses/ffmpeg").join(name), text).map_err(|e| e.to_string())?;
    }
    let marker = ToolMarker {
        schema_version: 1,
        profile,
        installed_at_unix: stamp.as_secs(),
        ytdlp,
        ffmpeg,
        ytdlp_notices,
        versions: versions.clone(),
    };
    let marker_bytes = serde_json::to_vec_pretty(&marker).map_err(|e| e.to_string())?;
    fs::write(marker_path(&staging.0), &marker_bytes).map_err(|e| e.to_string())?;
    fs::write(
        staging.0.join("licenses/installed-tools.json"),
        marker_bytes,
    )
    .map_err(|e| e.to_string())?;
    fs::write(staging.0.join("licenses/NOTICE.txt"), format!("Tools downloaded directly by this application from upstream GitHub Releases.\nProfile: {profile:?}; FFmpeg provider: BtbN/FFmpeg-Builds.\nActual versions and SHA-256 verification records: installed-tools.json.\nFFmpeg license and build configuration: ffmpeg/license-output.txt and ffmpeg/buildconf-output.txt.\nUpstream: https://github.com/yt-dlp/yt-dlp and https://github.com/BtbN/FFmpeg-Builds.\nSource leads: https://github.com/yt-dlp/yt-dlp/tree/{} and https://github.com/BtbN/FFmpeg-Builds/tree/master/scripts.d.\nThese source leads are NOT a complete Corresponding Source or written source offer.\nDo not redistribute these binaries before a separate licensing review.\n", marker.ytdlp.release_tag)).map_err(|e| e.to_string())?;
    state.check()?;
    emit_progress(&app, profile, "安装工具", 0, None);
    // No await between final cancellation check and directory transaction.
    replace_install(&staging.0, &target)?;
    emit_progress(&app, profile, "安装完成", 1, Some(1));
    Ok(ToolStatus {
        installed: true,
        profile: Some(profile),
        bin_path: target.to_string_lossy().into_owned(),
        ytdlp_version: Some(versions[0].clone()),
        ffmpeg_version: Some(versions[1].clone()),
        ffprobe_version: Some(versions[2].clone()),
        missing: vec![],
        error: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn urls_require_https_exact_hosts_and_no_credentials() {
        for url in [
            "https://github.com/yt-dlp/yt-dlp/releases/download/1/yt-dlp.exe",
            "https://release-assets.githubusercontent.com/a",
        ] {
            assert!(validate_download_url(url).is_ok());
        }
        for url in [
            "http://github.com/a",
            "https://evilgithub.com/a",
            "https://github.com.evil/a",
            "https://user@github.com/a",
            "https://github.com:444/a",
            "file:///a",
        ] {
            assert!(validate_download_url(url).is_err(), "{url}");
        }
    }
    #[test]
    fn profiles_are_strict_and_map_to_static_archives() {
        assert_eq!(
            serde_json::from_str::<ToolProfile>("\"basic\"").unwrap(),
            ToolProfile::Basic
        );
        assert!(serde_json::from_str::<ToolProfile>("\"nonfree\"").is_err());
        assert!(ToolProfile::Basic.asset_name().ends_with("-lgpl.zip"));
        assert!(ToolProfile::Full.asset_name().ends_with("-gpl.zip"));
    }
    #[test]
    fn paths_use_windows_security_rules() {
        assert!(is_safe_archive_name("root/bin/ffmpeg.exe"));
        for path in [
            "../ffmpeg.exe",
            "root/../../ffprobe.exe",
            "C:/ffmpeg.exe",
            "\\\\host\\a",
            "/a",
            "root\\..\\a",
            "a.exe:stream",
            "root /file",
            "root./file",
        ] {
            assert!(!is_safe_archive_name(path), "{path}");
        }
    }
    #[test]
    fn installs_are_serialized_and_can_retry_after_cancellation() {
        let state = ToolInstallState::default();
        let busy = state.begin().unwrap();
        assert!(state.begin().is_err());
        state.cancel();
        assert!(state.check().is_err());
        drop(busy);
        let _busy = state.begin().unwrap();
        assert!(state.check().is_ok());
    }
    #[test]
    fn metadata_requires_digest_and_expected_repository() {
        let mut metadata = serde_json::json!({"tag_name":"1", "published_at":"x", "assets":[{"name":"yt-dlp.exe", "size":100, "digest":format!("sha256:{}", "a".repeat(64)), "browser_download_url":"https://github.com/yt-dlp/yt-dlp/releases/download/1/yt-dlp.exe"}]});
        assert!(asset_from_metadata(YTDLP_REPOSITORY, "yt-dlp.exe", &metadata).is_ok());
        assert!(asset_from_metadata(FFMPEG_REPOSITORY, "yt-dlp.exe", &metadata).is_err());
        metadata["assets"][0]["digest"] = serde_json::Value::Null;
        assert!(asset_from_metadata(YTDLP_REPOSITORY, "yt-dlp.exe", &metadata).is_err());
    }
    #[test]
    fn daily_ffmpeg_assets_select_only_unique_x64_static_master_builds() {
        let basic = "ffmpeg-N-127252-ga25ba44c0c-win64-lgpl.zip";
        let full = "ffmpeg-N-127252-ga25ba44c0c-win64-gpl.zip";
        let metadata = serde_json::json!({"assets": [
            {"name": basic}, {"name": full},
            {"name": "ffmpeg-N-127252-ga25ba44c0c-win64-lgpl-shared.zip"},
            {"name": "ffmpeg-N-127252-ga25ba44c0c-win64-gpl-shared.zip"},
            {"name": "ffmpeg-n9.0.2-23-g27b46f0fbc-win64-lgpl-9.0.zip"},
            {"name": "ffmpeg-N-127252-ga25ba44c0c-linux64-lgpl.zip"}
        ]});
        assert_eq!(
            ffmpeg_asset_name(ToolProfile::Basic, &metadata).unwrap(),
            basic
        );
        assert_eq!(
            ffmpeg_asset_name(ToolProfile::Full, &metadata).unwrap(),
            full
        );
        let aliases = serde_json::json!({"assets": [
            {"name": ToolProfile::Basic.asset_name()}, {"name": ToolProfile::Full.asset_name()}
        ]});
        assert_eq!(
            ffmpeg_asset_name(ToolProfile::Basic, &aliases).unwrap(),
            ToolProfile::Basic.asset_name()
        );
        for invalid in [
            "ffmpeg-N-127252-ga25ba44c0c-win64-lgpl-shared.zip",
            "ffmpeg-N-127252-ga25ba44c0c-win64-lgpl-nonfree.zip",
            "ffmpeg-N-127252-ga25ba44c0c-win32-lgpl.zip",
            "ffmpeg-N-not-a-revision-win64-lgpl.zip",
        ] {
            assert!(ffmpeg_asset_name(
                ToolProfile::Basic,
                &serde_json::json!({"assets":[{"name":invalid}]})
            )
            .is_err());
        }
        assert!(ffmpeg_asset_name(
            ToolProfile::Basic,
            &serde_json::json!({"assets":[{"name":basic},{"name":basic}]})
        )
        .is_err());
    }
    fn temporary() -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "ytdlp-tools-test-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir(&dir).unwrap();
        dir
    }
    fn test_pe() -> Vec<u8> {
        let mut data = vec![0; 70];
        data[..2].copy_from_slice(b"MZ");
        data[60..64].copy_from_slice(&64u32.to_le_bytes());
        data[64..70].copy_from_slice(b"PE\0\0\x64\x86");
        data
    }
    fn archive(dir: &Path, names: &[&str]) -> PathBuf {
        let path = dir.join("test.zip");
        let mut zip = zip::ZipWriter::new(File::create(&path).unwrap());
        for name in names {
            zip.start_file(*name, zip::write::SimpleFileOptions::default())
                .unwrap();
            zip.write_all(&test_pe()).unwrap();
        }
        zip.finish().unwrap();
        path
    }
    #[test]
    fn extraction_rejects_missing_duplicate_and_traversing_entries() {
        let dir = temporary();
        let _cleanup = Staging(dir.clone());
        let cancelled = AtomicBool::new(false);
        for names in [
            vec!["root/ffmpeg.exe"],
            vec!["root/ffmpeg.exe", "../ffprobe.exe"],
            vec!["a/ffmpeg.exe", "b/ffmpeg.exe", "ffprobe.exe"],
        ] {
            assert!(extract_ffmpeg(&archive(&dir, &names), &dir, &cancelled).is_err());
        }
        assert!(extract_ffmpeg(
            &archive(
                &dir,
                &[
                    "root/bin/ffmpeg.exe",
                    "root/bin/ffprobe.exe",
                    "root/bin/ffplay.exe"
                ]
            ),
            &dir,
            &cancelled
        )
        .is_ok());
        assert!(!dir.join("ffplay.exe").exists());
        cancelled.store(true, Ordering::SeqCst);
        assert!(extract_ffmpeg(&dir.join("test.zip"), &dir, &cancelled).is_err());
    }
    #[test]
    fn failed_install_preserves_old_tools_and_staging_is_cleaned() {
        let dir = temporary();
        let _cleanup = Staging(dir.clone());
        let target = dir.join("bin");
        fs::create_dir(&target).unwrap();
        fs::write(target.join("old"), "old").unwrap();
        let stage = Staging(dir.join("stage"));
        fs::create_dir(&stage.0).unwrap();
        assert!(replace_install(&stage.0, &target).is_err());
        assert!(target.join("old").exists());
        let stage_path = stage.0.clone();
        drop(stage);
        assert!(!stage_path.exists());
    }
    #[test]
    fn successful_install_is_a_complete_directory_swap() {
        let dir = temporary();
        let _cleanup = Staging(dir.clone());
        let target = dir.join("bin");
        fs::create_dir(&target).unwrap();
        fs::write(target.join("old"), "old").unwrap();
        let stage = dir.join("stage");
        fs::create_dir(&stage).unwrap();
        for name in FILE_NAMES.into_iter().chain(["tool-profile.json"]) {
            fs::write(stage.join(name), "new").unwrap();
        }
        replace_install(&stage, &target).unwrap();
        assert!(!target.join("old").exists());
        assert!(FILE_NAMES.iter().all(|n| target.join(n).exists()));
        assert!(!dir.join(".ytdlp-gui-bin-backup").exists());
    }
    #[test]
    fn crash_recovery_restores_previous_directory() {
        let dir = temporary();
        let _cleanup = Staging(dir.clone());
        let backup = dir.join(".ytdlp-gui-bin-backup");
        fs::create_dir(&backup).unwrap();
        for name in FILE_NAMES {
            fs::write(backup.join(name), "old").unwrap();
        }
        let target = dir.join("bin");
        recover_backup(&target).unwrap();
        assert!(target.join("yt-dlp.exe").exists());
    }
}

#[tauri::command]
pub fn open_tool_licenses(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let installed = tool_directory(&app)?.join("licenses");
    let directory = if installed.is_dir() {
        installed
    } else {
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("licenses")
    };
    if !directory.is_dir() {
        return Err("未找到许可材料，请先安装工具或查看项目 licenses/ 目录".into());
    }
    app.opener()
        .open_path(directory.to_string_lossy(), None::<&str>)
        .map_err(|e| format!("无法打开许可目录：{e}"))
}

// A separate fixed resource path: installed tool licenses must not hide GUI notices.
#[tauri::command]
pub fn open_gui_licenses(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let directory = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("licenses")
        .join("gui");
    if !directory.is_dir() {
        return Err("未找到 GUI 许可材料，请使用完整安装包或查看项目 licenses/gui/ 目录".into());
    }
    app.opener()
        .open_path(directory.to_string_lossy(), None::<&str>)
        .map_err(|e| format!("无法打开 GUI 许可目录：{e}"))
}
