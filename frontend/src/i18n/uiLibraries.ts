import { addI18nMessages, useLocale } from '@arco-design/web-vue/es/locale'
import arcoEnUS from '@arco-design/web-vue/es/locale/lang/en-us'
import tdesignEnUS from 'tdesign-vue-next/es/locale/en_US'
import tdesignZhCN from 'tdesign-vue-next/es/locale/zh_CN'
import type { Locale } from './index'

addI18nMessages({ 'en-US': arcoEnUS })

export function applyArcoLocale(locale: Locale) {
  useLocale(locale)
}

export function tdesignGlobalConfig(locale: Locale) {
  return locale === 'en-US' ? tdesignEnUS : tdesignZhCN
}
