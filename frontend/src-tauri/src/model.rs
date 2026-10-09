use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeSet;

// Stable machine-readable code; the frontend translates `codes.<code>` and interpolates `detail`.
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

impl AppError {
    pub fn new(code: &'static str) -> Self {
        Self { code, detail: None }
    }

    pub fn with(code: &'static str, detail: impl Into<String>) -> Self {
        Self { code, detail: Some(detail.into()) }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.detail {
            Some(detail) => write!(f, "{}: {detail}", self.code),
            None => f.write_str(self.code),
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub download_path: String,
    #[serde(default = "default_retries")]
    pub retry_times: String,
    #[serde(default = "default_concurrent_fragments")]
    pub concurrent_fragments: u8,
    #[serde(default)]
    pub proxy_enabled: bool,
    #[serde(default = "default_proxy_url")]
    pub proxy_url: String,
}
pub fn default_proxy_url() -> String {
    "http://127.0.0.1:7890".into()
}

// Only local client endpoints are accepted; input is never shell-expanded.
pub fn validate_proxy_url(input: &str) -> AppResult<String> {
    let invalid = || AppError::new("proxy.invalid");
    let input = input.trim();
    if input.len() > 512 || input.chars().any(|c| c.is_control() || c.is_whitespace()) {
        return Err(invalid());
    }
    let proxy = url::Url::parse(input).map_err(|_| invalid())?;
    let local = match proxy.host() {
        Some(url::Host::Domain(host)) => {
            host.eq_ignore_ascii_case("localhost")
                || host
                    .parse::<std::net::IpAddr>()
                    .is_ok_and(|ip| ip.is_loopback())
        }
        Some(url::Host::Ipv4(host)) => host.is_loopback(),
        Some(url::Host::Ipv6(host)) => host.is_loopback(),
        None => false,
    };
    if !matches!(proxy.scheme(), "http" | "https" | "socks5" | "socks5h")
        || !local
        || proxy.port_or_known_default().is_none_or(|port| port == 0)
        || !proxy.username().is_empty()
        || proxy.password().is_some()
        || !matches!(proxy.path(), "" | "/")
        || proxy.query().is_some()
        || proxy.fragment().is_some()
    {
        return Err(invalid());
    }
    Ok(proxy.to_string())
}

pub fn proxy_args(settings: &Settings) -> AppResult<Vec<String>> {
    if settings.proxy_enabled {
        Ok(vec![
            "--proxy".into(),
            validate_proxy_url(&settings.proxy_url)?,
        ])
    } else {
        // Preserve environment/system routing when the override is disabled.
        Ok(vec![])
    }
}

pub fn configure_http_proxy(
    builder: reqwest::ClientBuilder,
    settings: &Settings,
) -> AppResult<reqwest::ClientBuilder> {
    if !settings.proxy_enabled {
        return Ok(builder);
    }
    let proxy = reqwest::Proxy::all(validate_proxy_url(&settings.proxy_url)?)
        .map_err(|_| AppError::new("proxy.initFailed"))?;
    // Explicit settings override OS/env proxies; do not fall back to direct.
    Ok(builder.no_proxy().proxy(proxy))
}
pub fn default_concurrent_fragments() -> u8 {
    8
}
pub fn validate_concurrent_fragments(value: u8) -> AppResult<()> {
    if (1..=16).contains(&value) {
        Ok(())
    } else {
        Err(AppError::new("settings.concurrentFragmentsRange"))
    }
}
fn default_retries() -> String {
    "10".into()
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DownloadKind {
    Quick,
    Format,
    Combined,
    Subtitle,
    Thumbnail,
    Description,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadRequest {
    pub url: String,
    pub kind: DownloadKind,
    pub format_id: Option<String>,
    pub video_id: Option<String>,
    pub audio_id: Option<String>,
    pub container_format: Option<String>,
    pub language: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskEvent {
    pub task_id: u64,
    pub kind: &'static str,
    pub status: String,
    pub message: AppError,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEvent {
    pub task_id: u64,
    pub line: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notice: Option<AppError>,
}

pub fn validate_url(input: &str) -> AppResult<String> {
    let url = url::Url::parse(input.trim()).map_err(|_| AppError::new("url.invalid"))?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err(AppError::new("url.unsupportedScheme"));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(AppError::new("url.credentials"));
    }
    Ok(url.to_string())
}

pub fn validate_retries(input: &str) -> AppResult<()> {
    if input == "infinite" || input.parse::<u32>().is_ok_and(|n| n <= 100) {
        Ok(())
    } else {
        Err(AppError::new("settings.retriesInvalid"))
    }
}

fn identifier(value: &Option<String>) -> Option<String> {
    let value = value.as_deref().unwrap_or_default();
    if value.is_empty()
        || value.len() > 128
        || value.starts_with('-')
        || !value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
    {
        return None;
    }
    Some(value.into())
}

pub fn download_args(
    request: &DownloadRequest,
    settings: &Settings,
    ffmpeg_dir: &str,
) -> AppResult<Vec<String>> {
    validate_retries(&settings.retry_times)?;
    validate_concurrent_fragments(settings.concurrent_fragments)?;
    let mut args: Vec<String> = [
        "--ignore-config",
        "--encoding",
        "utf-8",
        "--no-color",
        "--newline",
        "--no-playlist",
        "--socket-timeout",
        "30",
        "--retries",
        &settings.retry_times,
        "--ffmpeg-location",
        ffmpeg_dir,
        "-P",
        &settings.download_path,
        "--progress",
        "--progress-delta",
        "0.5",
    ]
    .into_iter()
    .map(str::to_string)
    .collect();
    args.extend(proxy_args(settings)?);
    if matches!(
        request.kind,
        DownloadKind::Quick | DownloadKind::Format | DownloadKind::Combined
    ) {
        args.extend([
            "--concurrent-fragments".into(),
            settings.concurrent_fragments.to_string(),
            "--fragment-retries".into(),
            settings.retry_times.clone(),
            "--buffer-size".into(),
            "256K".into(),
        ]);
    }
    match request.kind {
        DownloadKind::Quick => {}
        DownloadKind::Format => args.extend([
            "-f".into(),
            identifier(&request.format_id).ok_or_else(|| AppError::new("input.invalidFormatId"))?,
        ]),
        DownloadKind::Combined => {
            let container = request.container_format.as_deref().unwrap_or("mp4");
            if !matches!(container, "mp4" | "mkv" | "webm") {
                return Err(AppError::new("download.unsupportedContainer"));
            }
            args.extend([
                "-f".into(),
                format!(
                    "{}+{}",
                    identifier(&request.video_id)
                        .ok_or_else(|| AppError::new("input.invalidFormatId"))?,
                    identifier(&request.audio_id)
                        .ok_or_else(|| AppError::new("input.invalidFormatId"))?
                ),
                "--merge-output-format".into(),
                container.into(),
            ]);
        }
        DownloadKind::Subtitle => args.extend([
            "--skip-download".into(),
            "--write-subs".into(),
            "--sub-langs".into(),
            identifier(&request.language)
                .ok_or_else(|| AppError::new("input.invalidSubtitleLanguage"))?,
        ]),
        DownloadKind::Thumbnail => {
            args.extend(["--skip-download".into(), "--write-all-thumbnails".into()])
        }
        DownloadKind::Description => {
            args.extend(["--skip-download".into(), "--write-description".into()])
        }
    }
    args.extend(["--".into(), validate_url(&request.url)?]);
    Ok(args)
}

fn size_text(size: Option<f64>) -> String {
    let Some(mut size) = size else {
        return "N/A".into();
    };
    let units = ["B", "KB", "MB", "GB", "TB"];
    let mut i = 0;
    while size >= 1024.0 && i < units.len() - 1 {
        size /= 1024.0;
        i += 1;
    }
    format!("{size:.2} {}", units[i])
}
fn bitrate(value: &Value) -> Value {
    value
        .as_f64()
        .filter(|v| *v > 0.0)
        .map(|v| json!(format!("~{v}kbps")))
        .unwrap_or(Value::Null)
}

pub fn normalize_metadata(info: Value) -> Value {
    let formats: Vec<Value> = info["formats"].as_array().into_iter().flatten().map(|f| json!({
        "id": f["format_id"], "ext": f["ext"], "resolution": f["resolution"], "fps": f["fps"],
        "vcodec": f["vcodec"].as_str().unwrap_or("none"), "acodec": f["acodec"].as_str().unwrap_or("none"),
        "vbr": bitrate(&f["vbr"]), "abr": bitrate(&f["abr"]), "tbr": bitrate(&f["tbr"]),
        "filesize": size_text(f["filesize"].as_f64().or_else(|| f["filesize_approx"].as_f64()))
    })).collect();
    let subtitles: Vec<Value> = info["subtitles"].as_object().into_iter().flatten().map(|(lang, entries)| {
        let extensions: BTreeSet<&str> = entries.as_array().into_iter().flatten().filter_map(|f| f["ext"].as_str()).collect();
        json!({"language":lang, "formats":extensions.into_iter().collect::<Vec<_>>().join(", ")})
    }).collect();
    json!({"title":info["title"], "thumbnail":info["thumbnail"], "formats":formats, "subtitles":subtitles})
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(kind: DownloadKind) -> DownloadRequest {
        DownloadRequest {
            url: "https://example.com/watch?v=1".into(),
            kind,
            format_id: Some("137".into()),
            video_id: Some("137".into()),
            audio_id: Some("140".into()),
            container_format: Some("mp4".into()),
            language: Some("zh-Hans".into()),
        }
    }
    fn settings() -> Settings {
        Settings {
            download_path: r"C:\测试 下载".into(),
            retry_times: "10".into(),
            concurrent_fragments: default_concurrent_fragments(),
            proxy_enabled: false,
            proxy_url: default_proxy_url(),
        }
    }
    #[test]
    fn old_settings_keep_directory_and_retries_and_gain_parallel_default() {
        let settings: Settings =
            serde_json::from_value(json!({"downloadPath": r"C:\测试 下载", "retryTimes": "3"}))
                .unwrap();
        assert!(settings.download_path.contains("测试 下载"));
        assert_eq!(settings.retry_times, "3");
        assert_eq!(settings.concurrent_fragments, 8);
        assert!(!settings.proxy_enabled);
        assert_eq!(settings.proxy_url, default_proxy_url());
    }
    #[test]
    fn media_downloads_use_bounded_parallelism_without_rate_limits() {
        for count in [1, 4, 8, 16] {
            let settings = Settings {
                concurrent_fragments: count,
                ..settings()
            };
            for kind in [
                DownloadKind::Quick,
                DownloadKind::Format,
                DownloadKind::Combined,
            ] {
                let args = download_args(&request(kind), &settings, "bin").unwrap();
                assert!(args
                    .windows(2)
                    .any(|pair| pair == ["--concurrent-fragments", &count.to_string()]));
                assert!(args
                    .windows(2)
                    .any(|pair| pair == ["--fragment-retries", "10"]));
                assert!(args
                    .windows(2)
                    .any(|pair| pair == ["--progress-delta", "0.5"]));
                assert!(!args
                    .iter()
                    .any(|s| s == "--limit-rate" || s == "--no-check-certificates"));
            }
        }
        for count in [0, 17, 255] {
            let settings = Settings {
                concurrent_fragments: count,
                ..settings()
            };
            assert!(download_args(&request(DownloadKind::Quick), &settings, "bin").is_err());
        }
        for kind in [
            DownloadKind::Subtitle,
            DownloadKind::Thumbnail,
            DownloadKind::Description,
        ] {
            assert!(!download_args(&request(kind), &settings(), "bin")
                .unwrap()
                .iter()
                .any(|s| s == "--concurrent-fragments"));
        }
    }
    #[test]
    fn local_proxy_urls_reject_nonlocal_hosts_credentials_and_options() {
        for value in [
            "http://127.0.0.1:7890",
            "https://localhost:7890",
            "http://127.0.0.1:80",
            "socks5://127.0.0.1:1080",
            "socks5h://localhost:1080",
            "socks5://[::1]:1080",
            " http://127.0.0.1:7890 ",
        ] {
            assert!(validate_proxy_url(value).is_ok(), "{value}");
        }
        for value in [
            "",
            "--exec=calc",
            "ftp://127.0.0.1:7890",
            "http://example.com:7890",
            "http://192.168.1.1:7890",
            "http://localhost.evil:7890",
            "http://[::2]:7890",
            "http://user:pass@127.0.0.1:7890",
            "http://127.0.0.1:0",
            "socks5://localhost",
            "http://127.0.0.1:65536",
            "http://127.0.0.1:7890/path",
            "http://127.0.0.1:7890?x=1",
            "http://127.0.0.1:7890#fragment",
            "http://127.0.0.1:7890\n--exec=calc",
        ] {
            assert!(validate_proxy_url(value).is_err(), "{value}");
        }
    }

    #[test]
    fn all_modes_share_proxy_args_and_disabled_settings_preserve_old_routing() {
        let mut settings = settings();
        settings.proxy_enabled = true;
        settings.proxy_url = "socks5://127.0.0.1:1080".into();
        for kind in [
            DownloadKind::Quick,
            DownloadKind::Format,
            DownloadKind::Combined,
            DownloadKind::Subtitle,
            DownloadKind::Thumbnail,
            DownloadKind::Description,
        ] {
            let args = download_args(&request(kind), &settings, "bin").unwrap();
            let index = args.iter().position(|a| a == "--proxy").unwrap();
            assert_eq!(
                args[index + 1],
                validate_proxy_url(&settings.proxy_url).unwrap()
            );
            assert!(index < args.iter().position(|a| a == "--").unwrap());
        }
        let roundtrip: Settings =
            serde_json::from_value(serde_json::to_value(&settings).unwrap()).unwrap();
        assert!(roundtrip.proxy_enabled);
        assert_eq!(roundtrip.proxy_url, settings.proxy_url);
        settings.proxy_url = "bad address".into();
        assert!(proxy_args(&settings).is_err());
        settings.proxy_enabled = false;
        assert!(proxy_args(&settings).unwrap().is_empty());
        assert!(
            !download_args(&request(DownloadKind::Quick), &settings, "bin")
                .unwrap()
                .contains(&"--proxy".into())
        );
    }

    #[tokio::test]
    async fn explicit_http_and_socks5h_proxies_route_requests_without_origin_dns() {
        use std::time::Duration;
        use tokio::io::{AsyncReadExt, AsyncWriteExt};
        for scheme in ["http", "socks5h"] {
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
            let port = listener.local_addr().unwrap().port();
            let server = tokio::spawn(async move {
                let (mut stream, _) =
                    tokio::time::timeout(Duration::from_secs(3), listener.accept())
                        .await
                        .unwrap()
                        .unwrap();
                if scheme == "socks5h" {
                    let mut greeting = [0; 2];
                    stream.read_exact(&mut greeting).await.unwrap();
                    assert_eq!(greeting[0], 5);
                    let mut methods = vec![0; greeting[1] as usize];
                    stream.read_exact(&mut methods).await.unwrap();
                    stream.write_all(&[5, 0]).await.unwrap();
                    let mut connect = [0; 5];
                    stream.read_exact(&mut connect).await.unwrap();
                    assert_eq!(&connect[..4], &[5, 1, 0, 3]);
                    let mut host = vec![0; connect[4] as usize];
                    stream.read_exact(&mut host).await.unwrap();
                    assert_eq!(host, b"proxy-routing.invalid");
                    let mut port = [0; 2];
                    stream.read_exact(&mut port).await.unwrap();
                    assert_eq!(port, [0, 80]);
                    stream
                        .write_all(&[5, 0, 0, 1, 127, 0, 0, 1, 0, 80])
                        .await
                        .unwrap();
                }
                let mut header = Vec::new();
                loop {
                    header.push(stream.read_u8().await.unwrap());
                    if header.ends_with(b"\r\n\r\n") {
                        break;
                    }
                    assert!(header.len() < 8192);
                }
                let expected = if scheme == "http" {
                    "GET http://proxy-routing.invalid/test HTTP/1.1"
                } else {
                    "GET /test HTTP/1.1"
                };
                assert!(String::from_utf8(header).unwrap().starts_with(expected));
                stream
                    .write_all(
                        b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nOK",
                    )
                    .await
                    .unwrap();
            });
            let settings = Settings {
                proxy_enabled: true,
                proxy_url: format!("{scheme}://127.0.0.1:{port}"),
                ..settings()
            };
            let client = configure_http_proxy(reqwest::Client::builder(), &settings)
                .unwrap()
                .timeout(Duration::from_secs(3))
                .build()
                .unwrap();
            assert_eq!(
                client
                    .get("http://proxy-routing.invalid/test")
                    .send()
                    .await
                    .unwrap()
                    .text()
                    .await
                    .unwrap(),
                "OK"
            );
            server.await.unwrap();
        }
    }

    #[tokio::test]
    async fn unavailable_local_proxy_does_not_fall_back_to_direct() {
        let origin = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let proxy = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let settings = Settings {
            proxy_enabled: true,
            proxy_url: format!("http://{}", proxy.local_addr().unwrap()),
            ..settings()
        };
        drop(proxy);
        let client = configure_http_proxy(reqwest::Client::builder(), &settings)
            .unwrap()
            .timeout(std::time::Duration::from_secs(2))
            .build()
            .unwrap();
        assert!(client
            .get(format!("http://{}/video", origin.local_addr().unwrap()))
            .send()
            .await
            .is_err());
        assert!(
            tokio::time::timeout(std::time::Duration::from_millis(50), origin.accept())
                .await
                .is_err()
        );
    }

    #[test]
    fn urls_reject_options_and_local_files() {
        for value in [
            "--exec=calc",
            "file:///C:/a",
            "javascript:alert(1)",
            "ftp://example.com/a",
            "https://user:pass@example.com",
        ] {
            assert!(validate_url(value).is_err());
        }
        assert!(validate_url(" https://example.com/a ").is_ok());
    }
    #[test]
    fn retries_are_validated() {
        for v in ["0", "3", "10", "100", "infinite"] {
            assert!(validate_retries(v).is_ok());
        }
        for v in ["-1", "101", "字幕语言", "--exec", ""] {
            assert!(validate_retries(v).is_err());
        }
        assert_eq!(
            validate_retries("-1").unwrap_err().code,
            "settings.retriesInvalid"
        );
    }
    #[test]
    fn all_download_modes_and_unicode_paths() {
        for kind in [
            DownloadKind::Quick,
            DownloadKind::Format,
            DownloadKind::Combined,
            DownloadKind::Subtitle,
            DownloadKind::Thumbnail,
            DownloadKind::Description,
        ] {
            let args = download_args(&request(kind), &settings(), r"C:\工具 bin").unwrap();
            assert!(args.contains(&settings().download_path));
            assert_eq!(args[args.len() - 2], "--");
            assert_eq!(args.last().unwrap(), "https://example.com/watch?v=1");
        }
        let args = download_args(&request(DownloadKind::Combined), &settings(), "bin").unwrap();
        assert!(args.contains(&"137+140".to_string()));
        assert!(download_args(
            &DownloadRequest {
                format_id: Some("--exec".into()),
                ..request(DownloadKind::Format)
            },
            &settings(),
            "bin"
        )
        .is_err());
        assert!(download_args(
            &DownloadRequest {
                format_id: Some("a;calc".into()),
                ..request(DownloadKind::Format)
            },
            &settings(),
            "bin"
        )
        .is_err());
        assert!(download_args(
            &DownloadRequest {
                container_format: Some("exe".into()),
                ..request(DownloadKind::Combined)
            },
            &settings(),
            "bin"
        )
        .is_err());
    }
    #[test]
    fn metadata_handles_missing_fields_and_deduplicates_subtitles() {
        let result = normalize_metadata(
            json!({"formats":[{"format_id":"1","filesize":1024}],"subtitles":{"en":[{"ext":"vtt"},{"ext":"vtt"},{"ext":"srt"}]}}),
        );
        assert_eq!(result["formats"][0]["filesize"], "1.00 KB");
        assert_eq!(result["formats"][0]["vcodec"], "none");
        assert_eq!(result["subtitles"][0]["formats"], "srt, vtt");
        assert_eq!(normalize_metadata(json!({}))["formats"], json!([]));
    }
}
