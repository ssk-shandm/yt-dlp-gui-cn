import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import NotificationPlugin from 'tdesign-vue-next/es/notification/plugin'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTerminalStore } from '@/stores/terminalStore'
import { useTaskStore } from '@/stores/taskStore'
import { useUrlStore } from '@/stores/urlStore'
import { useFormatStore } from '@/stores/formatStore'
import { useSubtitleStore } from '@/stores/subtitleStore'
import type { DownloadRequest, LogEvent, Settings, TaskEvent, VideoMetadata } from '@/types/desktop'
import { initializeTools } from '@/services/tools'
import { i18n } from '../i18n'
import { errorText, kindName, translateCode } from '../i18n/codes'
import { APP_VERSION } from '@/config/appInfo'

const t = i18n.global.t

let initialization: Promise<void> | undefined
const unlisteners: UnlistenFn[] = []
let saveQueue: Promise<unknown> = Promise.resolve()
let persistedSettings: Settings | undefined

function logText(payload: LogEvent): string {
  if (!payload.notice) return payload.line
  const { code, detail = '' } = payload.notice
  return translateCode(code, code.startsWith('log.') ? kindName(detail) : detail)
}

function report(error: unknown) {
  const message = errorText(error)
  useTerminalStore().addLine(message)
  NotificationPlugin.error({ title: t('common.desktop.failed'), content: message })
}

export function initializeDesktop(): Promise<void> {
  if (initialization) return initialization
  initialization = (async () => {
    if (!isTauri()) throw new Error(t('common.desktop.previewOnly'))
    unlisteners.push(await listen<LogEvent>('terminal-output', ({ payload }) => {
      useTerminalStore().addLine('[' + payload.taskId + '] ' + logText(payload))
    }))
    unlisteners.push(await listen<TaskEvent>('task-status', ({ payload }) => {
      useTaskStore().updateTask(payload)
      if (payload.kind === 'analyze' || payload.status === 'running') return
      const title = kindName(payload.kind)
      const content = errorText(payload.message)
      if (payload.status === 'success') NotificationPlugin.success({ title, content })
      else if (payload.status === 'error') NotificationPlugin.error({ title, content })
    }))
    const settings = await invoke<Settings>('get_settings')
    persistedSettings = settings
    useSettingsStore().applySettings(settings)
    useSettingsStore().initialized = true
    useTerminalStore().addLine(t('common.desktop.ready', { path: settings.downloadPath }))
    useTerminalStore().addLine(t('common.desktop.concurrency', { count: settings.concurrentFragments }))
    await initializeTools()
  })()
  return initialization
}

export function startDesktop() {
  useTerminalStore().addLine(t('common.terminalBanner', { version: APP_VERSION }))
  void initializeDesktop().catch((error: unknown) => {
    for (const stop of unlisteners.splice(0)) stop()
    useTerminalStore().addLine(errorText(error))
    NotificationPlugin.warning({ title: t('common.desktop.unavailable'), content: errorText(error), duration: 8000 })
  })
}

async function safely<T>(operation: () => Promise<T>): Promise<T | undefined> {
  try { await initializeDesktop(); return await operation() }
  catch (error) { report(error); return undefined }
}

export async function analyzeVideo(url: string) {
  const formats = useFormatStore()
  const subtitles = useSubtitleStore()
  const urls = useUrlStore()
  if (formats.isLoading) return
  formats.startLoading()
  subtitles.startLoading()
  urls.analyzedUrl = ''
  urls.resetThumbnail()
  const snapshot = url.trim()
  try {
    await initializeDesktop()
    const data = await invoke<VideoMetadata>('analyze_url', { url: snapshot })
    // Do not apply a stale response after the user edits the input.
    if (urls.currentUrl.trim() !== snapshot) return
    formats.setFormats(data.formats)
    subtitles.setSubtitles(data.subtitles)
    if (data.thumbnail) urls.setThumbnailUrl(data.thumbnail)
    urls.analyzedUrl = snapshot
    urls.currentUrl = snapshot
    NotificationPlugin.success({ title: t('common.desktop.analyzeDone'), content: data.title || t('common.desktop.analyzeDefault') })
  } catch (error) { report(error) }
  finally { formats.isLoading = false; subtitles.isLoading = false }
}

export function startDownload(request: DownloadRequest) {
  return safely(() => invoke<number>('start_download', { request }))
}
export function listSupportedSites() {
  return safely(() => invoke<number>('list_supported_sites'))
}
export function cancelTask(taskId: number) {
  return safely(() => invoke<void>('cancel_task', { taskId }))
}

function persist(patch: Partial<Settings>): Promise<Settings> {
  const operation = saveQueue.catch(() => undefined).then(async () => {
    if (!persistedSettings) throw new Error(t('common.desktop.settingsNotReady'))
    const settings = { ...persistedSettings, ...patch }
    const saved = await invoke<Settings>('save_settings', { settings })
    persistedSettings = saved
    return saved
  })
  saveQueue = operation
  return operation
}
export function selectDownloadDirectory() {
  return safely(async () => {
    const store = useSettingsStore()
    const selected = await open({ directory: true, multiple: false, defaultPath: store.downloadPath, title: t('common.desktop.chooseDirectory') })
    if (typeof selected === 'string') {
      const saved = await persist({ downloadPath: selected })
      store.downloadPath = saved.downloadPath
    }
  })
}
export function saveConcurrentFragments(concurrentFragments: number) {
  return safely(async () => {
    await persist({ concurrentFragments })
  })
}
// Propagate failures to the form; update the store only after a successful save.
export async function saveProxySettings(proxyEnabled: boolean, proxyUrl: string): Promise<Settings> {
  if (!isTauri()) throw new Error(t('common.desktop.proxyPreviewOnly'))
  const saved = await persist({ proxyEnabled, proxyUrl: proxyUrl.trim() })
  const store = useSettingsStore()
  store.proxyEnabled = saved.proxyEnabled
  store.proxyUrl = saved.proxyUrl
  return saved
}
export function saveRetryTimes(retryTimes: string) {
  return safely(async () => {
    await persist({ retryTimes })
  })
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  for (const stop of unlisteners.splice(0)) stop()
})
