import { isTauri } from '@tauri-apps/api/core'
import { openUrl } from '@tauri-apps/plugin-opener'
import { ABOUT_URLS } from '../config/appInfo'
import { i18n } from '../i18n'

/** 仅允许打开“关于”页中的项目链接，不开放任意 URL 或本地文件。 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!ABOUT_URLS.includes(url)) throw new Error(i18n.global.t('common.desktop.externalLinkBlocked'))
  if (isTauri()) {
    await openUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
