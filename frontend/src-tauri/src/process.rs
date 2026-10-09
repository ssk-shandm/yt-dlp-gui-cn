use crate::model::{LogEvent, TaskEvent};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{
    io::{AsyncRead, AsyncReadExt},
    process::Command,
    sync::Notify,
};

#[derive(Default)]
pub struct TaskControl {
    cancelled: AtomicBool,
    pid: AtomicU32,
    notify: Notify,
}
#[derive(Default)]
pub struct TaskRegistry {
    next_id: AtomicU64,
    closing: AtomicBool,
    tools_installing: AtomicBool,
    tasks: Mutex<HashMap<u64, Arc<TaskControl>>>,
}
impl TaskRegistry {
    pub fn reserve(&self) -> Result<(u64, Arc<TaskControl>), String> {
        let mut tasks = self.tasks.lock().map_err(|_| "任务锁不可用")?;
        if self.closing.load(Ordering::SeqCst) {
            return Err("应用正在退出".into());
        }
        if self.tools_installing.load(Ordering::SeqCst) {
            return Err("工具安装或应用更新正在进行，请等待完成后重试".into());
        }
        if tasks.len() >= 4 {
            return Err("最多同时运行 4 个任务，请等待或取消已有任务".into());
        }
        let id = self.next_id.fetch_add(1, Ordering::Relaxed) + 1;
        let control = Arc::new(TaskControl::default());
        tasks.insert(id, control.clone());
        Ok((id, control))
    }
    pub fn finish(&self, id: u64) {
        if let Ok(mut tasks) = self.tasks.lock() {
            tasks.remove(&id);
        }
    }
    pub fn cancel(&self, id: u64) -> Result<(), String> {
        let tasks = self.tasks.lock().map_err(|_| "任务锁不可用")?;
        let task = tasks.get(&id).ok_or("任务已结束或不存在")?;
        task.cancelled.store(true, Ordering::SeqCst);
        task.notify.notify_one();
        kill_tree(task.pid.load(Ordering::SeqCst));
        Ok(())
    }
    pub fn begin_tools_install(&self) -> Result<(), String> {
        let tasks = self.tasks.lock().map_err(|_| "任务锁不可用")?;
        if self.closing.load(Ordering::SeqCst) || self.tools_installing.load(Ordering::SeqCst) {
            return Err("工具安装或应用更新正在进行，请等待完成后重试".into());
        }
        if !tasks.is_empty() {
            return Err("工具安装或应用更新正在进行，请等待完成后重试".into());
        }
        self.tools_installing.store(true, Ordering::SeqCst);
        Ok(())
    }
    pub fn end_tools_install(&self) {
        self.tools_installing.store(false, Ordering::SeqCst);
    }
    pub fn begin_update(&self) -> Result<(), String> {
        let tasks = self.tasks.lock().map_err(|_| "任务锁不可用")?;
        if self.closing.load(Ordering::SeqCst) || self.tools_installing.load(Ordering::SeqCst) {
            return Err("工具安装或应用更新正在进行，请等待完成后重试".into());
        }
        if !tasks.is_empty() {
            return Err("仍有下载或解析任务，请等待任务结束后安装更新".into());
        }
        self.closing.store(true, Ordering::SeqCst);
        Ok(())
    }
    pub fn end_update(&self) {
        self.closing.store(false, Ordering::SeqCst);
    }
    pub fn shutdown(&self) {
        self.closing.store(true, Ordering::SeqCst);
        if let Ok(tasks) = self.tasks.lock() {
            for task in tasks.values() {
                task.cancelled.store(true, Ordering::SeqCst);
                task.notify.notify_one();
                kill_tree(task.pid.load(Ordering::SeqCst));
            }
        }
    }
}

pub fn kill_tree(pid: u32) {
    if pid == 0 {
        return;
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let system_root = std::env::var_os("SystemRoot").unwrap_or_else(|| r"C:\Windows".into());
        let _ =
            std::process::Command::new(PathBuf::from(system_root).join("System32/taskkill.exe"))
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .creation_flags(0x08000000)
                .output();
    }
}

pub struct Tools {
    pub ytdlp: PathBuf,
    pub ffmpeg_dir: PathBuf,
}
pub fn tool_directory(app: &AppHandle) -> Result<PathBuf, String> {
    let development = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../bin");
    if cfg!(debug_assertions) {
        return Ok(development);
    }
    // NSIS places resources at the install root. Keep a resource_dir fallback for
    // bundles that choose a nested resources directory.
    let exe_bin = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .map(|dir| dir.join("bin"))
        .ok_or("无法确定主程序目录")?;
    if exe_bin.is_dir() {
        return Ok(exe_bin);
    }
    let resource_bin = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("bin");
    if resource_bin.is_dir() {
        return Ok(resource_bin);
    }
    Ok(exe_bin)
}
pub fn resolve_tools(app: &AppHandle) -> Result<Tools, String> {
    let dir = tool_directory(app)?;
    if dir.join("yt-dlp.exe").is_file()
        && dir.join("ffmpeg.exe").is_file()
        && dir.join("ffprobe.exe").is_file()
    {
        return Ok(Tools {
            ytdlp: dir.join("yt-dlp.exe"),
            ffmpeg_dir: dir,
        });
    }
    Err("缺少下载工具。开发时请将 yt-dlp.exe、ffmpeg.exe 和 ffprobe.exe 放入根目录 bin/；安装版请在“关于”页下载安装工具。".into())
}

fn command(executable: &Path, args: &[String]) -> Command {
    let mut command = Command::new(executable);
    command
        .args(args)
        .env("PYTHONIOENCODING", "utf-8")
        .env("PYTHONUTF8", "1")
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .kill_on_drop(true);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.as_std_mut().creation_flags(0x08000000);
    }
    command
}

pub fn log(app: &AppHandle, id: u64, line: impl Into<String>) {
    let _ = app.emit(
        "terminal-output",
        LogEvent {
            task_id: id,
            line: line.into(),
        },
    );
}
pub fn task_event(app: &AppHandle, id: u64, title: &str, status: &str, message: &str) {
    let _ = app.emit(
        "task-status",
        TaskEvent {
            task_id: id,
            title: title.into(),
            status: status.into(),
            message: message.into(),
        },
    );
}

async fn read_stream<R: AsyncRead + Unpin>(
    mut stream: R,
    capture: bool,
    mut emit: impl FnMut(String),
) -> Result<Vec<u8>, String> {
    let mut all = Vec::new();
    let mut pending = Vec::new();
    let mut buffer = [0u8; 8192];
    loop {
        let n = stream.read(&mut buffer).await.map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        if capture {
            if all.len() + n > 16 * 1024 * 1024 {
                return Err("解析结果超过 16 MB 限制".into());
            }
            all.extend_from_slice(&buffer[..n]);
        } else {
            for byte in &buffer[..n] {
                if *byte == b'\n' {
                    emit(String::from_utf8_lossy(&pending).trim_end().to_string());
                    pending.clear();
                } else {
                    pending.push(*byte);
                    if pending.len() >= 32768 {
                        emit(String::from_utf8_lossy(&pending).to_string());
                        pending.clear();
                    }
                }
            }
        }
    }
    if !pending.is_empty() {
        emit(String::from_utf8_lossy(&pending).to_string());
    }
    Ok(all)
}

pub async fn execute(
    app: &AppHandle,
    executable: &Path,
    args: &[String],
    id: u64,
    control: Arc<TaskControl>,
    capture: bool,
) -> Result<Vec<u8>, String> {
    if control.cancelled.load(Ordering::SeqCst) {
        return Err("任务已取消".into());
    }
    let mut child = command(executable, args)
        .spawn()
        .map_err(|e| format!("无法启动 yt-dlp: {e}"))?;
    control
        .pid
        .store(child.id().unwrap_or_default(), Ordering::SeqCst);
    if control.cancelled.load(Ordering::SeqCst) {
        kill_tree(control.pid.load(Ordering::SeqCst));
    }
    let stdout = child.stdout.take().ok_or("无法读取标准输出")?;
    let stderr = child.stderr.take().ok_or("无法读取错误输出")?;
    let timeout = if capture {
        Duration::from_secs(180)
    } else {
        Duration::from_secs(24 * 60 * 60)
    };
    let result = tokio::select! {
        biased;
        _=control.notify.notified()=>Err("任务已取消".to_string()),
        _=tokio::time::sleep(timeout)=>Err("任务超时，请检查网络后重试".to_string()),
        result=async {
            // Drain both pipes while waiting; any reader failure immediately terminates the child.
            let (status,bytes,_)=tokio::try_join!(
                async { child.wait().await.map_err(|e|e.to_string()) },
                read_stream(stdout,capture,|line|log(app,id,line)),
                read_stream(stderr,false,|line|log(app,id,line)),
            )?;
            if !status.success() { return Err("yt-dlp 执行失败，详情请查看终端日志".to_string()); }
            Ok(bytes)
        }=>result,
    };
    if result.is_err() {
        kill_tree(control.pid.load(Ordering::SeqCst));
        let _ = child.kill().await;
        let _ = child.wait().await;
    }
    control.pid.store(0, Ordering::SeqCst);
    if control.cancelled.load(Ordering::SeqCst) {
        return Err("任务已取消".into());
    }
    result
}

#[cfg(test)]
mod tests {
    #[test]
    fn tool_install_and_application_update_are_mutually_exclusive() {
        let registry = super::TaskRegistry::default();
        registry.begin_tools_install().unwrap();
        assert!(registry.begin_update().is_err());
        assert!(registry.reserve().is_err());
        registry.end_tools_install();
        registry.begin_update().unwrap();
        assert!(registry.begin_tools_install().is_err());
        assert!(registry.begin_update().is_err());
        registry.end_update();
        assert!(registry.reserve().is_ok());
    }
    #[test]
    fn updates_do_not_interrupt_tasks_and_block_new_jobs() {
        let registry = super::TaskRegistry::default();
        let (id, _) = registry.reserve().unwrap();
        assert!(registry.begin_update().is_err());
        registry.finish(id);
        registry.begin_update().unwrap();
        assert!(registry.reserve().is_err());
        registry.end_update();
        assert!(registry.reserve().is_ok());
    }

    use super::*;
    #[test]
    fn streams_handle_utf8_and_final_unterminated_lines() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        runtime.block_on(async {
            let mut lines = vec![];
            let input = "中文日志\n最后一行".as_bytes();
            let result = read_stream(input, false, |line| lines.push(line))
                .await
                .unwrap();
            assert!(result.is_empty());
            assert_eq!(lines, vec!["中文日志", "最后一行"]);
            let captured = read_stream(input, true, |_| panic!("metadata must not be logged"))
                .await
                .unwrap();
            assert_eq!(captured, input);
        });
    }
    #[test]
    fn oversized_metadata_is_rejected() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let input = vec![b'a'; 16 * 1024 * 1024 + 1];
        assert!(runtime
            .block_on(read_stream(input.as_slice(), true, |_| {}))
            .is_err());
    }
    #[test]
    fn registry_limits_tasks_and_cleans_up() {
        let registry = TaskRegistry::default();
        let mut ids = vec![];
        for _ in 0..4 {
            ids.push(registry.reserve().unwrap().0);
        }
        assert!(registry.reserve().is_err());
        registry.cancel(ids[0]).unwrap();
        registry.finish(ids[0]);
        assert!(registry.reserve().is_ok());
        registry.shutdown();
        assert!(registry.reserve().is_err());
    }
}
