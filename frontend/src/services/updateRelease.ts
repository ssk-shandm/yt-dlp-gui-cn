import type { UpdateInfo } from './updateController'

interface ReleaseAsset {
  name?: unknown
  browser_download_url?: unknown
  digest?: unknown
}

export interface ReleaseData { tag_name?: unknown; html_url?: unknown; body?: unknown; assets?: unknown }

export function normalizeSha256(value: unknown): string {
  if (value == null || value === '') {
    throw new Error('该 Release 缺少安装包 SHA-256，已停止自动安装。请到发布页核实后手动安装。')
  }
  if (typeof value !== 'string' || !/^sha256:[0-9a-f]{64}$/i.test(value)) {
    throw new Error('安装包 SHA-256 格式无效，已停止自动安装')
  }
  return value.slice(7).toLowerCase()
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const pb = b.split('.').map((part) => Number.parseInt(part, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}

export function parseRelease(data: ReleaseData, currentVersion: string, releasesUrl: string): UpdateInfo {
  const remoteVersion = String(data.tag_name ?? '').replace(/^v/i, '')
  if (!/^\d+\.\d+\.\d+$/.test(remoteVersion)) throw new Error('最新 Release 的版本号无效')
  if (compareVersions(remoteVersion, currentVersion) <= 0) {
    return { version: currentVersion, available: false }
  }
  const installer = Array.isArray(data.assets)
    ? (data.assets as ReleaseAsset[]).find((asset) => asset && typeof asset.name === 'string'
      && /_x64-setup\.exe$/i.test(asset.name))
    : undefined
  return {
    version: remoteVersion,
    available: true,
    releaseUrl: typeof data.html_url === 'string' ? data.html_url : releasesUrl,
    releaseNotes: typeof data.body === 'string' ? data.body : '',
    installerUrl: typeof installer?.browser_download_url === 'string' ? installer.browser_download_url : null,
    installerName: typeof installer?.name === 'string' ? installer.name : null,
    installerSha256: installer ? normalizeSha256(installer.digest) : null,
  }
}
