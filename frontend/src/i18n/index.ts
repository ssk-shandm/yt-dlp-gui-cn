import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export type Locale = 'zh-CN' | 'en-US'

export const SUPPORTED_LOCALES: readonly Locale[] = ['zh-CN', 'en-US']
export const LOCALE_STORAGE_KEY = 'grabmeta.locale'

function detectLocale(): Locale {
  const saved = globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY)
  if (saved === 'zh-CN' || saved === 'en-US') return saved
  return (globalThis.navigator?.language ?? 'en-US').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en-US',
  messages: { 'zh-CN': zhCN, 'en-US': enUS },
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale)
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}

if (typeof document !== 'undefined') document.documentElement.lang = i18n.global.locale.value
