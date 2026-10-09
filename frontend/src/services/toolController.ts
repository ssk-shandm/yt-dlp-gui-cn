import { reactive } from 'vue'
import type { CodedError } from '@/types/desktop'

export type ToolProfile = 'basic' | 'full'
export interface ToolText { key: string; values?: Record<string, string | number | ToolText> }
export interface ToolStatus {
  installed: boolean
  profile: ToolProfile | null
  binPath: string
  ytdlpVersion: string | null
  ffmpegVersion: string | null
  ffprobeVersion: string | null
  missing: string[]
  error: CodedError | null
}
export function toToolText(error: unknown): ToolText | string {
  const coded = typeof error === 'object' && error !== null && typeof (error as CodedError).code === 'string' ? error as CodedError : undefined
  if (coded) return { key: 'codes.' + coded.code, values: { detail: coded.detail ?? '' } }
  return String(error)
}
const stageText = (stage: string): ToolText => ({ key: 'codes.' + stage })
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
    remaining: '' as ToolText | string,
    message: '' as ToolText | string,
    error: '' as ToolText | string,
  })
  let cancellation: Promise<void> | undefined
  let sample: { stage: string; bytes: number; time: number } | undefined
  async function refresh(firstRun = false) {
    if (!deps.isDesktop() || state.busy || state.checking) return
    state.checking = true
    try {
      state.status = await deps.getStatus()
      state.error = state.status.error ? toToolText(state.status.error) : ''
      if (firstRun && !state.status.installed) state.visible = true
    } catch (error) {
      state.error = toToolText(error)
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
      state.remaining = seconds === null ? '' : seconds < 60
        ? { key: 'tools.remaining.seconds', values: { n: seconds } }
        : { key: 'tools.remaining.minutes', values: { n: Math.ceil(seconds / 60) } }
      sample = { stage: payload.stage, bytes: payload.downloaded, time: now }
    }
    state.stage = payload.stage
    state.progress = payload.percent
    state.message = payload.total === null ? stageText(payload.stage) : {
      key: 'tools.progress.detail',
      values: {
        stage: stageText(payload.stage),
        percent: payload.percent ?? 0,
        downloaded: (payload.downloaded / 1024 / 1024).toFixed(1),
        total: (payload.total / 1024 / 1024).toFixed(1),
      },
    }
  }
  function reportFailure(error: ToolText | string) {
    state.error = error
    state.message = { key: state.cancelling ? 'tools.status.cancelled' : 'tools.status.failed' }
  }
  async function install(profile: ToolProfile = state.profile) {
    if (state.busy || state.checking) return
    if (!deps.isDesktop()) { state.error = { key: 'tools.errors.browserPreview' }; return }
    if (deps.activeTasks()) { state.error = { key: 'tools.errors.activeTasks' }; return }
    state.busy = true
    state.cancelling = false
    sample = undefined
    state.speed = ''
    state.remaining = ''
    state.error = ''
    state.profile = profile
    state.progress = null
    state.stage = ''
    state.message = { key: 'tools.status.reading' }
    try {
      const status = await deps.install(profile)
      if (!status.installed) return reportFailure({ key: 'tools.errors.incomplete' })
      const firstInstall = !state.status?.installed
      state.status = status
      state.visible = false
      state.message = { key: profile === 'basic' ? 'tools.status.installedBasic' : 'tools.status.installedFull' }
      if (firstInstall && typeof window !== 'undefined') window.dispatchEvent(new Event('start-beginner-guide'))
    } catch (error) {
      reportFailure(toToolText(error))
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
    state.message = { key: 'tools.status.cancelling' }
    const pending = Promise.resolve().then(() => deps.cancel()).catch(error => {
      state.error = toToolText(error)
      state.cancelling = false
    })
    cancellation = pending
    try { await pending }
    finally { if (cancellation === pending) cancellation = undefined }
  }
  return { state, refresh, open, close, install, cancel, progress }
}
