import { isTauri, invoke } from '@tauri-apps/api/core'
import { APP_VERSION, RELEASES_URL } from '@/config/appInfo'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { watch } from 'vue'
import { useTaskStore } from '@/stores/taskStore'
import { createUpdateController, UPDATE_STORAGE_KEY, type UpdateInfo } from './updateController'

const GITHUB_API_URL = 'https://api.github.com/repos/ssk-shandm/yt-dlp-gui-cn/releases/latest'

interface ReleaseAsset {
  name?: unknown
  browser_download_url?: unknown
}

async function fetchLatestRelease(): Promise<UpdateInfo> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!response.ok) {
      if (response.status === 403) throw new Error("GitHub API 请求受限，请稍后再试")
      if (response.status === 404) throw new Error("GitHub 上还没有发布 Release")
      throw new Error(`更新检查失败（HTTP ${response.status}）`)
    }

    const data = await response.json() as {
      tag_name?: unknown
      html_url?: unknown
      body?: unknown
      assets?: unknown
    }
    const remoteVersion = String(data.tag_name ?? '').replace(/^v/i, '')
    if (!remoteVersion) throw new Error("最新 Release 缺少版本号")

    const installer = Array.isArray(data.assets)
      ? (data.assets as ReleaseAsset[]).find((asset) => String(asset.name ?? '').toLowerCase().endsWith('-setup.exe'))
      : undefined

    if (compareVersions(remoteVersion, APP_VERSION) <= 0) {
      return { version: APP_VERSION, available: false }
    }

    return {
      version: remoteVersion,
      available: true,
      releaseUrl: typeof data.html_url === 'string' ? data.html_url : RELEASES_URL,
      releaseNotes: typeof data.body === 'string' ? data.body : '',
      installerUrl: installer?.browser_download_url ? String(installer.browser_download_url) : null,
      installerName: installer?.name ? String(installer.name) : null,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error("无法连接 GitHub 检查更新：请求超时")
    }
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      throw new Error("无法连接 GitHub 检查更新：请检查网络或系统代理设置")
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const pb = b.split('.').map((part) => Number.parseInt(part, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}

export const appUpdater = createUpdateController({
  isDesktop: isTauri,
  activeTasks: () => useTaskStore().tasks.some((task) => task.status === 'running'),
  // Keep the Release check in the WebView, matching exam's working network path.
  check: fetchLatestRelease,
  install: (update) => {
    if (!update.installerUrl || !update.installerName) {
      return Promise.reject(new Error('该 Release 没有可自动安装的 Windows NSIS 安装包。'))
    }
    return invoke('download_and_install_update', {
      url: update.installerUrl,
      fileName: update.installerName,
    })
  },
  readPreference: () => window.localStorage.getItem(UPDATE_STORAGE_KEY),
  savePreference: (value) => window.localStorage.setItem(UPDATE_STORAGE_KEY, value),
})

let unlistenProgress: UnlistenFn | undefined
let unlistenInstall: UnlistenFn | undefined
let stopWatch: (() => void) | undefined

export async function startAppUpdates() {
  appUpdater.initializePreference()
  if (!isTauri()) return
  try {
    unlistenProgress = await listen<{ downloaded: number; total: number | null; percent: number | null }>(
      'update-download-progress',
      ({ payload }) => appUpdater.progress(payload),
    )
    unlistenInstall = await listen<string>('update-install-starting', () => appUpdater.installing())
    stopWatch = watch(
      () => useTaskStore().tasks.some((task) => task.status === 'running'),
      (active) => {
        if (!active) void appUpdater.installPending()
      },
    )
    if (appUpdater.state.autoCheck) await appUpdater.checkAndInstall('automatic')
  } catch (error) {
    appUpdater.state.phase = 'error'
    appUpdater.state.message = '更新服务初始化失败：' + String(error)
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unlistenProgress?.()
    unlistenInstall?.()
    stopWatch?.()
  })
}
