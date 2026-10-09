import { i18n } from './index'
import type { CodedError } from '@/types/desktop'

export function isCodedError(value: unknown): value is CodedError {
  return typeof value === 'object' && value !== null && typeof (value as CodedError).code === 'string'
}

export function translateCode(code: string, detail = ''): string {
  return i18n.global.t('codes.' + code, { detail })
}

export function kindName(kind: string): string {
  return i18n.global.t('codes.kind.' + kind)
}

export function errorText(error: unknown): string {
  if (isCodedError(error)) return translateCode(error.code, error.detail)
  if (error instanceof Error) return error.message
  return String(error)
}
