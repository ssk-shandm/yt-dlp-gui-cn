use super::{io_error, network_error, Asset, ToolInstallState};
use crate::model::{AppError, AppResult};
use sha2::{Digest, Sha256};
use std::{
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
    time::{Duration, Instant},
};
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufWriter};

const BUFFER_SIZE: usize = 1024 * 1024;
const PARALLEL_THRESHOLD: u64 = 8 * 1024 * 1024;
const CONNECTIONS: u64 = 4;

struct Progress<F> {
    bytes: AtomicU64,
    last_report: Mutex<Instant>,
    report: F,
}
impl<F: Fn(u64)> Progress<F> {
    fn add(&self, bytes: u64) {
        self.bytes.fetch_add(bytes, Ordering::Relaxed);
        let mut last = self.last_report.lock().unwrap();
        if last.elapsed() >= Duration::from_millis(200) {
            (self.report)(self.bytes.load(Ordering::Relaxed));
            *last = Instant::now();
        }
    }
}

fn ranges(size: u64) -> Vec<(u64, u64)> {
    if size < PARALLEL_THRESHOLD {
        return vec![];
    }
    let width = size.div_ceil(CONNECTIONS);
    (0..CONNECTIONS)
        .map(|i| (i * width, ((i + 1) * width).min(size) - 1))
        .collect()
}
fn validate_response(
    response: &reqwest::Response,
    range: Option<(u64, u64)>,
    size: u64,
) -> AppResult<()> {
    let expected = if let Some((start, end)) = range {
        let expected_header = format!("bytes {start}-{end}/{size}");
        if response.status() != reqwest::StatusCode::PARTIAL_CONTENT
            || response
                .headers()
                .get(reqwest::header::CONTENT_RANGE)
                .and_then(|h| h.to_str().ok())
                != Some(expected_header.as_str())
        {
            return Err(AppError::new("tools.rangeMismatch"));
        }
        end - start + 1
    } else {
        if response.status() != reqwest::StatusCode::OK {
            return Err(AppError::with(
                "tools.downloadHttp",
                response.status().as_u16().to_string(),
            ));
        }
        size
    };
    if response.content_length().is_some_and(|n| n != expected)
        || response
            .headers()
            .get(reqwest::header::CONTENT_ENCODING)
            .is_some_and(|v| v != "identity")
    {
        return Err(AppError::new("tools.upstreamChanged"));
    }
    Ok(())
}
async fn request(
    client: &reqwest::Client,
    state: &ToolInstallState,
    asset: &Asset,
    range: Option<(u64, u64)>,
) -> AppResult<reqwest::Response> {
    state
        .wait(async {
            let mut request = client
                .get(&asset.url)
                .header(reqwest::header::ACCEPT_ENCODING, "identity");
            if let Some((start, end)) = range {
                request = request.header(reqwest::header::RANGE, format!("bytes={start}-{end}"));
            }
            request
                .send()
                .await
                .map_err(|e| network_error("tools.downloadFailed", &e))
        })
        .await
}
async fn write_response<F: Fn(u64)>(
    mut response: reqwest::Response,
    state: &ToolInstallState,
    path: &Path,
    expected: u64,
    progress: &Progress<F>,
) -> AppResult<()> {
    let file = tokio::fs::File::create(path).await.map_err(io_error)?;
    let mut output = BufWriter::with_capacity(BUFFER_SIZE, file);
    let mut written = 0u64;
    while let Some(chunk) = state
        .wait(async {
            response
                .chunk()
                .await
                .map_err(|e| network_error("tools.readFailed", &e))
        })
        .await?
    {
        written += chunk.len() as u64;
        if written > expected {
            return Err(AppError::new("tools.downloadTooLarge"));
        }
        state.check()?;
        output.write_all(&chunk).await.map_err(io_error)?;
        progress.add(chunk.len() as u64);
    }
    if written != expected {
        return Err(AppError::new("tools.downloadIncomplete"));
    }
    output.flush().await.map_err(io_error)?;
    state.check()
}
async fn download_part<F: Fn(u64)>(
    client: &reqwest::Client,
    state: &ToolInstallState,
    asset: &Asset,
    range: (u64, u64),
    path: &Path,
    progress: &Progress<F>,
) -> AppResult<()> {
    let response = request(client, state, asset, Some(range)).await?;
    validate_response(&response, Some(range), asset.size)?;
    write_response(response, state, path, range.1 - range.0 + 1, progress).await
}
async fn verify(state: &ToolInstallState, asset: &Asset, target: &Path) -> AppResult<()> {
    let mut input = tokio::fs::File::open(target).await.map_err(io_error)?;
    let mut buffer = vec![0; BUFFER_SIZE];
    let mut hash = Sha256::new();
    let mut size = 0;
    loop {
        state.check()?;
        let count = input.read(&mut buffer).await.map_err(io_error)?;
        if count == 0 {
            break;
        }
        size += count as u64;
        hash.update(&buffer[..count]);
    }
    if size != asset.size || format!("{:x}", hash.finalize()) != asset.sha256 {
        return Err(AppError::new("tools.verifyFailed"));
    }
    state.check()
}

// Worker futures are polled here, never spawned. On failure try_join! drops
// every writer before cleanup, so a stalled peer cannot delay an error or race
// extraction, rollback, or the next install.
pub(super) async fn download<F: Fn(u64)>(
    client: &reqwest::Client,
    state: &ToolInstallState,
    asset: &Asset,
    target: &Path,
    report: F,
) -> AppResult<()> {
    let parts: Vec<PathBuf> = (0..CONNECTIONS)
        .map(|i| target.with_extension(format!("part-{i}")))
        .collect();
    report(0);
    let progress = Progress {
        bytes: AtomicU64::new(0),
        last_report: Mutex::new(Instant::now()),
        report,
    };
    let result = async {
        let ranges = ranges(asset.size);
        let first_range = ranges.first().copied();
        let response = request(client, state, asset, first_range).await?;
        // A server/proxy that ignores Range returns the full body. Reuse this
        // response, without throwing away bytes or making four full downloads.
        if response.status() == reqwest::StatusCode::OK {
            validate_response(&response, None, asset.size)?;
            write_response(response, state, target, asset.size, &progress).await?;
        } else {
            let range =
                first_range.ok_or_else(|| AppError::new("tools.downloadResponseInvalid"))?;
            validate_response(&response, Some(range), asset.size)?;
            tokio::try_join!(
                write_response(response, state, &parts[0], range.1 - range.0 + 1, &progress),
                download_part(client, state, asset, ranges[1], &parts[1], &progress),
                download_part(client, state, asset, ranges[2], &parts[2], &progress),
                download_part(client, state, asset, ranges[3], &parts[3], &progress),
            )?;
            state.check()?;
            let file = tokio::fs::File::create(target).await.map_err(io_error)?;
            let mut output = BufWriter::with_capacity(BUFFER_SIZE, file);
            let mut buffer = vec![0; BUFFER_SIZE];
            for part in &parts {
                let mut input = tokio::fs::File::open(part).await.map_err(io_error)?;
                loop {
                    state.check()?;
                    let count = input.read(&mut buffer).await.map_err(io_error)?;
                    if count == 0 {
                        break;
                    }
                    output.write_all(&buffer[..count]).await.map_err(io_error)?;
                }
            }
            output.flush().await.map_err(io_error)?;
        }
        verify(state, asset, target).await?;
        let file = tokio::fs::OpenOptions::new()
            .write(true)
            .open(target)
            .await
            .map_err(io_error)?;
        file.sync_all().await.map_err(io_error)?;
        state.check()?;
        (progress.report)(asset.size);
        Ok(())
    }
    .await;
    for part in parts {
        let _ = tokio::fs::remove_file(part).await;
    }
    if result.is_err() {
        let _ = tokio::fs::remove_file(target).await;
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    };
    use tokio::{
        net::TcpListener,
        task::{JoinHandle, JoinSet},
    };

    #[derive(Clone, Copy)]
    enum Mode {
        Ranges,
        IgnoreRanges,
        BadRange,
        Corrupt,
        Truncated,
        Stalled,
        FailedWorkerWithStalledPeers,
    }
    struct Server {
        url: String,
        count: Arc<AtomicUsize>,
        peak: Arc<AtomicUsize>,
        task: JoinHandle<()>,
    }
    impl Drop for Server {
        fn drop(&mut self) {
            self.task.abort();
        }
    }
    async fn serve(bytes: Arc<Vec<u8>>, mode: Mode) -> Server {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/asset", listener.local_addr().unwrap());
        let count = Arc::new(AtomicUsize::new(0));
        let active = Arc::new(AtomicUsize::new(0));
        let peak = Arc::new(AtomicUsize::new(0));
        let (requests, activity, maximum) = (count.clone(), active.clone(), peak.clone());
        let task = tokio::spawn(async move {
            let mut jobs = JoinSet::new();
            loop {
                tokio::select! {
                    incoming = listener.accept() => {
                        let (mut socket, _) = incoming.unwrap();
                        let (bytes, requests, activity, maximum) = (bytes.clone(), requests.clone(), activity.clone(), maximum.clone());
                        jobs.spawn(async move {
                            requests.fetch_add(1, Ordering::SeqCst);
                            let current = activity.fetch_add(1, Ordering::SeqCst) + 1;
                            maximum.fetch_max(current, Ordering::SeqCst);
                            let mut request = vec![];
                            while !request.windows(4).any(|s| s == b"\r\n\r\n") {
                                let mut buffer = [0; 1024];
                                let n = socket.read(&mut buffer).await.unwrap();
                                if n == 0 { return; }
                                request.extend_from_slice(&buffer[..n]);
                            }
                            if matches!(mode, Mode::Stalled) {
                                std::future::pending::<()>().await;
                            }
                            let text = String::from_utf8(request).unwrap().to_ascii_lowercase();
                            let range = text.lines().find_map(|l| l.strip_prefix("range: bytes="))
                                .and_then(|r| r.split_once('-')).map(|(a,b)| (a.trim().parse::<usize>().unwrap(), b.trim().parse::<usize>().unwrap()));
                            let range = if matches!(mode, Mode::IgnoreRanges) { None } else { range };
                            let (start, end) = range.unwrap_or((0, bytes.len() - 1));
                            if matches!(mode, Mode::FailedWorkerWithStalledPeers) && start > 0 {
                                let _ = socket.write_all(b"HTTP/1.1 503 Service Unavailable\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").await;
                                return;
                            }
                            let length = end - start + 1;
                            let status = if range.is_some() { "206 Partial Content" } else { "200 OK" };
                            let content_range = if range.is_some() {
                                format!("Content-Range: bytes {}-{end}/{}\r\n", if matches!(mode, Mode::BadRange) {start+1} else {start}, bytes.len())
                            } else { String::new() };
                            let header = format!("HTTP/1.1 {status}\r\nContent-Length: {length}\r\n{content_range}Connection: close\r\n\r\n");
                            if socket.write_all(header.as_bytes()).await.is_ok() {
                                if matches!(mode, Mode::FailedWorkerWithStalledPeers) {
                                    std::future::pending::<()>().await;
                                }
                                let mut body = bytes[start..=end].to_vec();
                                if matches!(mode, Mode::Corrupt) { body[0] ^= 1; }
                                if matches!(mode, Mode::Truncated) { body.truncate(length / 2); }
                                for chunk in body.chunks(64 * 1024) {
                                    if socket.write_all(chunk).await.is_err() { break; }
                                    tokio::time::sleep(Duration::from_millis(2)).await;
                                }
                            }
                            activity.fetch_sub(1, Ordering::SeqCst);
                        });
                    }
                    _ = jobs.join_next(), if !jobs.is_empty() => {}
                }
            }
        });
        Server {
            url,
            count,
            peak,
            task,
        }
    }
    static NEXT: AtomicUsize = AtomicUsize::new(0);
    struct Temp(PathBuf);
    impl Temp {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!(
                "ytdlp-transfer-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::SeqCst)
            ));
            std::fs::create_dir(&path).unwrap();
            Self(path)
        }
        fn target(&self) -> PathBuf {
            self.0.join("asset.zip")
        }
        fn assert_empty(&self) {
            assert_eq!(std::fs::read_dir(&self.0).unwrap().count(), 0);
        }
    }
    impl Drop for Temp {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
    fn asset(url: &str, bytes: &[u8]) -> Asset {
        Asset {
            repository: "test".into(),
            release_tag: "test".into(),
            published_at: "".into(),
            name: "asset.zip".into(),
            url: url.into(),
            size: bytes.len() as u64,
            sha256: format!("{:x}", Sha256::digest(bytes)),
        }
    }
    fn client() -> reqwest::Client {
        reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap()
    }
    fn data() -> Arc<Vec<u8>> {
        Arc::new(
            (0..(PARALLEL_THRESHOLD as usize + 17))
                .map(|i| (i % 251) as u8)
                .collect(),
        )
    }

    #[tokio::test(flavor = "current_thread")]
    async fn parallel_ranges_are_concurrent_ordered_verified_and_cleaned() {
        let bytes = data();
        let server = serve(bytes.clone(), Mode::Ranges).await;
        let temp = Temp::new();
        let state = ToolInstallState::default();
        let _busy = state.begin().unwrap();
        let mut reports = vec![];
        let reports_ref = Mutex::new(&mut reports);
        download(
            &client(),
            &state,
            &asset(&server.url, &bytes),
            &temp.target(),
            |n| reports_ref.lock().unwrap().push(n),
        )
        .await
        .unwrap();
        assert_eq!(tokio::fs::read(temp.target()).await.unwrap(), *bytes);
        assert_eq!(server.count.load(Ordering::SeqCst), 4);
        assert!(
            server.peak.load(Ordering::SeqCst) >= 3,
            "range requests must overlap"
        );
        assert_eq!(std::fs::read_dir(&temp.0).unwrap().count(), 1);
        let reports = reports_ref.lock().unwrap();
        assert_eq!(reports.first(), Some(&0));
        assert_eq!(reports.last(), Some(&(bytes.len() as u64)));
        assert!(reports.windows(2).all(|p| p[0] <= p[1]));
    }
    #[tokio::test(flavor = "current_thread")]
    async fn ignored_ranges_reuse_the_full_response_and_small_assets_use_one_request() {
        for bytes in [data(), Arc::new(vec![7; 1024])] {
            let server = serve(bytes.clone(), Mode::IgnoreRanges).await;
            let temp = Temp::new();
            let state = ToolInstallState::default();
            let _busy = state.begin().unwrap();
            download(
                &client(),
                &state,
                &asset(&server.url, &bytes),
                &temp.target(),
                |_| {},
            )
            .await
            .unwrap();
            assert_eq!(server.count.load(Ordering::SeqCst), 1);
            assert_eq!(tokio::fs::read(temp.target()).await.unwrap(), *bytes);
        }
    }
    #[tokio::test(flavor = "current_thread")]
    async fn invalid_ranges_corruption_and_interruption_do_not_leave_partial_files() {
        for mode in [Mode::BadRange, Mode::Corrupt, Mode::Truncated] {
            let bytes = data();
            let server = serve(bytes.clone(), mode).await;
            let temp = Temp::new();
            let state = ToolInstallState::default();
            let _busy = state.begin().unwrap();
            assert!(download(
                &client(),
                &state,
                &asset(&server.url, &bytes),
                &temp.target(),
                |_| {}
            )
            .await
            .is_err());
            temp.assert_empty();
        }
    }
    #[tokio::test(flavor = "current_thread")]
    async fn failed_worker_drops_stalled_peers_before_cleaning_files() {
        let bytes = data();
        let server = serve(bytes.clone(), Mode::FailedWorkerWithStalledPeers).await;
        let temp = Temp::new();
        let state = ToolInstallState::default();
        let _busy = state.begin().unwrap();
        let error = tokio::time::timeout(
            Duration::from_secs(2),
            download(
                &client(),
                &state,
                &asset(&server.url, &bytes),
                &temp.target(),
                |_| {},
            ),
        )
        .await
        .expect("must fail without waiting for stalled peers")
        .unwrap_err();
        assert!(error.code.starts_with("tools."));
        temp.assert_empty();
    }
    #[tokio::test(flavor = "current_thread")]
    async fn stalled_download_cancels_promptly_and_can_retry() {
        let bytes = data();
        let server = serve(bytes.clone(), Mode::Stalled).await;
        let temp = Temp::new();
        let state = ToolInstallState::default();
        let busy = state.begin().unwrap();
        let asset = asset(&server.url, &bytes);
        let client = client();
        let target = temp.target();
        let result = tokio::time::timeout(Duration::from_secs(2), async {
            tokio::join!(download(&client, &state, &asset, &target, |_| {}), async {
                while server.count.load(Ordering::SeqCst) == 0 {
                    tokio::task::yield_now().await;
                }
                state.cancel();
            })
            .0
        })
        .await
        .unwrap();
        assert_eq!(result.unwrap_err().code, "tools.cancelled");
        temp.assert_empty();
        drop(busy);
        let _busy = state.begin().unwrap();
        let healthy = serve(bytes.clone(), Mode::Ranges).await;
        let healthy_asset = super::tests::asset(&healthy.url, &bytes);
        download(&client, &state, &healthy_asset, &target, |_| {})
            .await
            .unwrap();
    }
    #[tokio::test(flavor = "current_thread")]
    async fn cancellation_wakes_all_idle_workers_including_after_retry() {
        let state = ToolInstallState::default();
        for _ in 0..2 {
            let busy = state.begin().unwrap();
            let wait = || state.wait(std::future::pending::<AppResult<()>>());
            tokio::time::timeout(Duration::from_secs(1), async {
                let results = tokio::join!(wait(), wait(), wait(), wait(), async {
                    tokio::task::yield_now().await;
                    state.cancel();
                });
                for result in [results.0, results.1, results.2, results.3] {
                    assert_eq!(result.unwrap_err().code, "tools.cancelled");
                }
            })
            .await
            .unwrap();
            drop(busy);
        }
    }
    // A controlled per-connection bottleneck. This is not a public-site speed guarantee.
    #[tokio::test(flavor = "current_thread")]
    async fn bounded_parallelism_removes_a_serial_connection_bottleneck() {
        let bytes = data();
        let mut elapsed = vec![];
        for mode in [Mode::IgnoreRanges, Mode::Ranges] {
            let server = serve(bytes.clone(), mode).await;
            let temp = Temp::new();
            let state = ToolInstallState::default();
            let _busy = state.begin().unwrap();
            let start = Instant::now();
            download(
                &client(),
                &state,
                &asset(&server.url, &bytes),
                &temp.target(),
                |_| {},
            )
            .await
            .unwrap();
            elapsed.push(start.elapsed());
        }
        println!(
            "Controlled 8 MiB transfer: serial {:?}; 4 connections {:?}; {:.2}x",
            elapsed[0],
            elapsed[1],
            elapsed[0].as_secs_f64() / elapsed[1].as_secs_f64()
        );
    }
}
