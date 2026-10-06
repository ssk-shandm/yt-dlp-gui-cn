import { isTauri } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import { ABOUT_URLS } from '../config/appInfo'

/** 仅允许打开“关于”页中的项目链接，不开放任意 URL 或本地文件。 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!ABOUT_URLS.includes(url)) throw new Error('该链接不在允许打开的项目链接列表中。')
  if (isTauri()) {
    await openUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
