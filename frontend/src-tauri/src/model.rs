use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::BTreeSet;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub download_path: String,
    #[serde(default = "default_retries")]
    pub retry_times: String,
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
    pub title: String,
    pub status: String,
    pub message: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEvent {
    pub task_id: u64,
    pub line: String,
}

pub fn validate_url(input: &str) -> Result<String, String> {
    let url = url::Url::parse(input.trim()).map_err(|_| "请输入有效的视频 URL".to_string())?;
    if !matches!(url.scheme(), "http" | "https") || url.host_str().is_none() {
        return Err("仅支持 HTTP / HTTPS 视频链接".into());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("视频链接不能包含用户名或密码".into());
    }
    Ok(url.to_string())
}

pub fn validate_retries(input: &str) -> Result<(), String> {
    if input == "infinite" || input.parse::<u32>().is_ok_and(|n| n <= 100) {
        Ok(())
    } else {
        Err("重试次数必须是 0–100 的整数或 infinite".into())
    }
}

fn identifier(value: &Option<String>, name: &str) -> Result<String, String> {
    let value = value.as_deref().unwrap_or_default();
    if value.is_empty()
        || value.len() > 128
        || value.starts_with('-')
        || !value
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "-_.".contains(c))
    {
        return Err(format!("无效的{name}"));
    }
    Ok(value.into())
}

pub fn download_args(
    request: &DownloadRequest,
    settings: &Settings,
    ffmpeg_dir: &str,
) -> Result<Vec<String>, String> {
    validate_retries(&settings.retry_times)?;
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
    ]
    .into_iter()
    .map(str::to_string)
    .collect();
    match request.kind {
        DownloadKind::Quick => {}
        DownloadKind::Format => {
            args.extend(["-f".into(), identifier(&request.format_id, "格式 ID")?])
        }
        DownloadKind::Combined => {
            let container = request.container_format.as_deref().unwrap_or("mp4");
            if !matches!(container, "mp4" | "mkv" | "webm") {
                return Err("不支持的封装格式".into());
            }
            args.extend([
                "-f".into(),
                format!(
                    "{}+{}",
                    identifier(&request.video_id, "格式 ID")?,
                    identifier(&request.audio_id, "格式 ID")?
                ),
                "--merge-output-format".into(),
                container.into(),
            ]);
        }
        DownloadKind::Subtitle => args.extend([
            "--skip-download".into(),
            "--write-subs".into(),
            "--sub-langs".into(),
            identifier(&request.language, "字幕语言")?,
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
        }
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
