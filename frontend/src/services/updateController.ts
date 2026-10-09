import { reactive } from 'vue'

export type UpdatePhase = 'idle' | 'checking' | 'latest' | 'waiting' | 'downloading' | 'installing' | 'error'
export interface UpdateInfo {
  version: string
  available: boolean
  releaseUrl?: string | null
  releaseNotes?: string | null
  installerUrl?: string | null
  installerName?: string | null
  installerSha256?: string | null
}
export interface UpdateDependencies {
  isDesktop: () => boolean
  activeTasks: () => boolean
  check: () => Promise<UpdateInfo>
  install: (update: UpdateInfo) => Promise<void>
  readPreference: () => string | null
  savePreference: (value: string) => void
}
export const UPDATE_STORAGE_KEY = 'ytdlp.auto-update-check'

export function createUpdateController(deps: UpdateDependencies) {
  const state = reactive({
    autoCheck: true,
    phase: 'idle' as UpdatePhase,
    message: '',
    version: '',
    progress: null as number | null,
    preferenceError: '',
  })
  let busy = false
  let initialized = false
  let pendingUpdate: UpdateInfo | null = null
  let automatic = false
  let latestMessageTimer: ReturnType<typeof setTimeout> | undefined

  function clearLatestMessageTimer() {
    if (latestMessageTimer) {
      clearTimeout(latestMessageTimer)
      latestMessageTimer = undefined
    }
  }

  function initializePreference() {
    if (initialized) return
    initialized = true
    try {
      const saved = deps.readPreference()
      state.autoCheck = saved === null ? true : saved === 'true'
    } catch {
      state.preferenceError = '无法读取本地偏好，自动更新默认开启。'
    }
  }

  function savePreference() {
    state.preferenceError = ''
    try {
      deps.savePreference(String(state.autoCheck))
    } catch {
      state.preferenceError = '无法保存本地偏好，当前选择仅在本次运行中有效。'
    }
    if (!state.autoCheck && automatic && pendingUpdate) {
      pendingUpdate = null
      state.phase = 'idle'
      state.message = '已关闭自动更新。需要更新时可手动检查并安装。'
    }
  }

  async function installPending() {
    const update = pendingUpdate
    if (!update || busy) return
    if (automatic && !state.autoCheck) return
    if (deps.activeTasks()) {
      state.phase = 'waiting'
      state.message = '发现 v' + state.version + '，将在下载或解析任务结束后自动安装。'
      return
    }
    busy = true
    pendingUpdate = null
    state.progress = null
    state.phase = 'downloading'
    state.message = update.installerName
      ? '正在下载 v' + state.version + ' 更新安装包…'
      : '发现 v' + state.version + '，但该 Release 没有 Windows 安装包。'
    try {
      await deps.install(update)
      state.phase = 'installing'
      state.message = '安装程序已启动，应用将退出并在安装完成后重新启动。'
    } catch (error) {
      state.phase = 'error'
      state.message = String(error)
    } finally {
      busy = false
    }
  }

  async function checkAndInstall(source: 'manual' | 'automatic' = 'manual') {
    if (busy || pendingUpdate || state.phase === 'installing') return
    if (!deps.isDesktop()) {
      state.phase = 'error'
      state.message = '浏览器界面预览不支持安装更新，请在桌面程序中使用。'
      return
    }
    automatic = source === 'automatic'
    clearLatestMessageTimer()
    busy = true
    state.phase = 'checking'
    state.progress = null
    state.message = '正在检查 GitHub Releases…'
    try {
      const update = await deps.check()
      state.version = update.version
      if (!update.available) {
        state.phase = 'latest'
        state.message = '当前已是最新正式版本。'
        latestMessageTimer = setTimeout(() => {
          if (state.phase === 'latest' && state.message === '当前已是最新正式版本。') {
            state.phase = 'idle'
            state.message = ''
          }
          latestMessageTimer = undefined
        }, 3000)
      } else if (!automatic || state.autoCheck) {
        pendingUpdate = update
      } else {
        state.phase = 'idle'
        state.message = '已关闭自动更新，本次未下载安装。'
      }
    } catch (error) {
      state.phase = 'error'
      state.message = String(error)
    } finally {
      busy = false
    }
    await installPending()
  }

  function progress(event: { downloaded: number; total?: number | null; percent?: number | null }) {
    state.phase = 'downloading'
    state.progress = event.percent ?? (event.total ? Math.min(100, Math.round(event.downloaded / event.total * 100)) : null)
    state.message = state.progress === null ? '正在下载更新安装包…' : '正在下载更新安装包…'
  }

  function installing() {
    state.phase = 'installing'
    state.progress = 100
    state.message = '安装程序已启动，应用将退出并在安装完成后重新启动。'
  }

  return { state, initializePreference, savePreference, checkAndInstall, installPending, progress, installing }
}
