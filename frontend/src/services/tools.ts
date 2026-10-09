import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useTaskStore } from '@/stores/taskStore'
import { createToolController, type ToolProfile, type ToolProgress, type ToolStatus } from './toolController'

export const tools = createToolController({
  isDesktop: isTauri,
  activeTasks: () => useTaskStore().tasks.some(task => task.status === 'running'),
  getStatus: () => invoke<ToolStatus>('get_tool_status'),
  install: (profile: ToolProfile) => invoke<ToolStatus>('download_tools', { profile }),
  cancel: () => invoke<void>('cancel_tool_download'),
})
export const toolManager = tools.state
let progressStop: UnlistenFn | undefined
let initialization: Promise<void> | undefined
export function initializeTools(): Promise<void> {
  if (!isTauri()) return Promise.resolve()
  if (initialization) return initialization
  initialization = (async () => {
    progressStop = await listen<ToolProgress>('tool-download-progress', ({ payload }) => tools.progress(payload))
    await tools.refresh(true)
  })().catch(error => {
    initialization = undefined
    progressStop?.()
    progressStop = undefined
    toolManager.error = String(error)
    toolManager.visible = true
    throw error
  })
  return initialization
}
export async function openGuiLicenses() { await invoke<void>('open_gui_licenses') }
export async function openToolLicenses() { await invoke<void>('open_tool_licenses') }
if (import.meta.hot) import.meta.hot.dispose(() => { progressStop?.(); initialization = undefined })
