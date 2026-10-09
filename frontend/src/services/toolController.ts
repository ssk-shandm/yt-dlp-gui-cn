import { reactive } from 'vue'

export type ToolProfile = 'basic' | 'full'
export interface ToolStatus {
  installed: boolean
  profile: ToolProfile | null
  binPath: string
  ytdlpVersion: string | null
  ffmpegVersion: string | null
  ffprobeVersion: string | null
  missing: string[]
  error: string | null
}
export interface ToolProgress { profile: ToolProfile; stage: string; downloaded: number; total: number | null; percent: number | null }
export interface ToolDependencies {
  isDesktop: () => boolean
  activeTasks: () => boolean
  getStatus: () => Promise<ToolStatus>
  install: (profile: ToolProfile) => Promise<ToolStatus>
  cancel: () => Promise<void>
}
export function createToolController(deps: ToolDependencies) {
  const state = reactive({
    status: null as ToolStatus | null,
    visible: false,
    busy: false,
    cancelling: false,
    checking: false,
    profile: 'basic' as ToolProfile,
    stage: '',
    progress: null as number | null,
    speed: '',
    remaining: '',
    message: '',
    error: '',
  })
  let cancellation: Promise<void> | undefined
  let sample: { stage: string; bytes: number; time: number } | undefined
  async function refresh(firstRun = false) {
    if (!deps.isDesktop() || state.busy || state.checking) return
    state.checking = true
    try {
      state.status = await deps.getStatus()
      state.error = state.status.error || ''
      if (firstRun && !state.status.installed) state.visible = true
    } catch (error) {
      state.error = String(error)
      if (firstRun) state.visible = true
    } finally { state.checking = false }
  }
  function open(profile?: ToolProfile) {
    if (state.busy) { state.visible = true; return }
    state.profile = profile ?? state.status?.profile ?? 'basic'
    state.visible = true
    state.error = ''
  }
  function close() { if (!state.busy) state.visible = false }
  function progress(payload: ToolProgress) {
    if (!state.busy || payload.profile !== state.profile) return
    const now = Date.now()
    if (!sample || sample.stage !== payload.stage || payload.downloaded < sample.bytes) {
      sample = { stage: payload.stage, bytes: payload.downloaded, time: now }
      state.speed = ''
      state.remaining = ''
    } else if (now - sample.time >= 500) {
      const rate = (payload.downloaded - sample.bytes) * 1000 / (now - sample.time)
      state.speed = rate >= 1024 * 1024 ? (rate / 1024 / 1024).toFixed(2) + ' MiB/s' : (rate / 1024).toFixed(1) + ' KiB/s'
      const seconds = rate > 0 && payload.total !== null ? Math.ceil((payload.total - payload.downloaded) / rate) : null
      state.remaining = seconds === null ? '' : seconds < 60 ? '预计剩余 ' + seconds + ' 秒' : '预计剩余 ' + Math.ceil(seconds / 60) + ' 分钟'
      sample = { stage: payload.stage, bytes: payload.downloaded, time: now }
    }
    state.stage = payload.stage
    state.progress = payload.percent
    state.message = payload.total === null ? payload.stage : `${payload.stage}：${payload.percent ?? 0}%（${(payload.downloaded / 1024 / 1024).toFixed(1)} / ${(payload.total / 1024 / 1024).toFixed(1)} MiB）`
  }
  async function install(profile: ToolProfile = state.profile) {
    if (state.busy || state.checking) return
    if (!deps.isDesktop()) { state.error = '浏览器预览不能下载安装工具，请使用桌面程序。'; return }
    if (deps.activeTasks()) { state.error = '仍有下载或解析任务，请等待任务结束后安装工具。'; return }
    state.busy = true
    state.cancelling = false
    sample = undefined
    state.speed = ''
    state.remaining = ''
    state.error = ''
    state.profile = profile
    state.progress = null
    state.stage = '读取上游版本'
    state.message = '正在读取上游版本并准备下载…'
    try {
      const status = await deps.install(profile)
      if (!status.installed) throw new Error('工具安装结果不完整，请重试。')
      const firstInstall = !state.status?.installed
      state.status = status
      state.visible = false
      state.message = `${profile === 'basic' ? '基础版' : '完整版'}工具安装成功。`
      if (firstInstall && typeof window !== 'undefined') window.dispatchEvent(new Event('start-beginner-guide'))
    } catch (error) {
      state.error = String(error)
      state.message = state.cancelling ? '已取消工具安装，原有工具保持不变。' : '安装未成功，原有工具保持不变；可检查网络后重试。'
    } finally {
      // A download may reject before the cancellation IPC response arrives.
      // Do not enable retry until both finish: a late cancel must never hit
      // the next install or overwrite its error/progress state.
      await cancellation
      state.busy = false
      state.cancelling = false
    }
  }
  async function cancel() {
    if (!state.busy || state.cancelling) return
    state.cancelling = true
    state.message = '正在取消并清理临时文件…'
    const pending = Promise.resolve().then(() => deps.cancel()).catch(error => {
      state.error = String(error)
      state.cancelling = false
    })
    cancellation = pending
    try { await pending }
    finally { if (cancellation === pending) cancellation = undefined }
  }
  return { state, refresh, open, close, install, cancel, progress }
}
