import { readFile, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { join, resolve, isAbsolute, relative as relativePath } from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
export const requiredLicenseFiles = [
  'README.md', 'NOTICE.txt', 'RELEASE-CHECKLIST.md', 'release-status.json',
  'yt-dlp/UNLICENSE.txt', 'yt-dlp/THIRD_PARTY_LICENSES.txt', 'yt-dlp/SOURCE-INFO.md',
  'evidence/yt-dlp-SHA2-256SUMS.txt',
  'ffmpeg/COPYING.LGPLv2.1.txt', 'ffmpeg/COPYING.GPLv2.txt',
  'ffmpeg/COPYING.GPLv3.txt', 'ffmpeg/SOURCE-INFO.md',
  'gui/README.md', 'gui/dependency-inventory.json', 'gui/DEPENDENCY-NOTICES.txt',
  'gui/INSTALLER-NOTICE.txt', 'gui/SOURCE-NOTICE.txt', 'gui/redistribution-materials.json', 'gui/review.json',
  'gui/webview2/runtime-consumer-terms.txt', 'gui/webview2/runtime-distributor-terms.txt',
  'gui/supplemental-index.json', 'gui/webview2/README.md', 'gui/webview2/LICENSE.txt',
  'gui/webview2/NOTICE.txt', 'gui/webview2/Microsoft.Web.WebView2.nuspec',
]

export async function inspectLicenseMaterials(workspace = root) {
  for (const relative of requiredLicenseFiles) {
    const info = await stat(join(workspace, 'licenses', relative))
    if (!info.isFile() || info.size === 0) throw new Error('许可材料为空或不是文件：' + relative)
  }
  const config = JSON.parse(await readFile(join(workspace, 'frontend/src-tauri/tauri.conf.json'), 'utf8'))
  if (config.bundle?.resources?.['../../licenses'] !== 'licenses') {
    throw new Error('打包配置没有将 licenses/ 映射到安装目录')
  }
  if (config.bundle?.resources?.['../../LICENSE'] !== 'LICENSE') throw new Error('项目 MIT 版权通知没有映射到安装目录')
  if (config.bundle?.licenseFile !== '../../licenses/gui/INSTALLER-NOTICE.txt') throw new Error('NSIS 缺少安装前许可告知')
  if (config.bundle?.windows?.webviewInstallMode?.type !== 'downloadBootstrapper' || config.bundle.windows.webviewInstallMode.silent !== true) throw new Error('正式 WebView2 分发方式必须是已审核的 downloadBootstrapper/silent 配置')
  const resources = config.bundle?.resources || {}
  const toolResource = /(?:^|[\\/])bin(?:[\\/]|$)|(?:yt-dlp|ffmpeg|ffprobe)(?:\.exe)?$/i
  const resourcePaths = Array.isArray(resources) ? resources : Object.entries(resources).flat()
  if ([...resourcePaths, ...(config.bundle?.externalBin || [])].some(path => toolResource.test(path))) {
    throw new Error('当前 GUI 配置不得捆绑下载工具或 bin/ 目录')
  }
  const status = JSON.parse(await readFile(join(workspace, 'licenses/release-status.json'), 'utf8'))
  for (const key of ['pending', 'historicalPending']) {
    if (!Array.isArray(status[key]) || status[key].some(item => typeof item !== 'string' || !item.trim())) {
      throw new Error('release-status.json 的 ' + key + ' 字段无效')
    }
  }
  if (status.distribution?.bundlesToolBinaries !== false || 'bundledTools' in status) {
    throw new Error('必须明确记录当前不内置工具，并将旧工具移入 historicalTools')
  }
  for (const name of ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe']) {
    if (!/^[a-f0-9]{64}$/.test(status.historicalTools?.[name]?.sha256 || '')) {
      throw new Error('缺少历史工具哈希记录：' + name)
    }
  }
  const inventory = JSON.parse(await readFile(join(workspace, 'licenses/gui/dependency-inventory.json'), 'utf8'))
  if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.packages) || !inventory.packages.length || !Array.isArray(inventory.unresolved)) {
    throw new Error('GUI 依赖许可清单格式无效')
  }
  for (const path of ['frontend/package-lock.json', 'frontend/src-tauri/Cargo.lock']) {
    const digest = createHash('sha256').update(await readFile(join(workspace, path))).digest('hex')
    if (digest !== inventory.lockfiles?.[path]) throw new Error('GUI 依赖许可清单与锁文件不一致，请重新收集：' + path)
  }
  const licenseRoot = resolve(workspace, 'licenses')
  const materialHashes = new Map()
  for (const pkg of inventory.packages) {
    if (!pkg.name || !pkg.version || !Array.isArray(pkg.materials)) throw new Error('GUI 依赖许可条目无效')
    if (!pkg.materials.length && !inventory.unresolved.some(item => item.id === `${pkg.ecosystem}:${pkg.name}@${pkg.version}`)) {
      throw new Error('GUI 依赖缺失许可材料且未标记待办：' + pkg.name)
    }
    for (const item of pkg.materials) {
      if (typeof item.file !== 'string') throw new Error('GUI 许可材料路径无效')
      const path = resolve(licenseRoot, item.file)
      const rel = relativePath(licenseRoot, path)
      if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('GUI 许可材料路径超出 licenses/：' + item.file)
      if (!materialHashes.has(path)) {
        const bytes = await readFile(path)
        if (!bytes.length) throw new Error('GUI 许可材料为空：' + item.file)
        materialHashes.set(path, createHash('sha256').update(bytes).digest('hex'))
      }
      if (materialHashes.get(path) !== item.sha256) throw new Error('GUI 许可材料哈希不一致：' + item.file)
    }
  }
  if (inventory.unresolved.length && !status.pending.length) {
    throw new Error('GUI 许可材料仍有未解决项，不得清空发布待办')
  }
  const supplement = JSON.parse(await readFile(join(licenseRoot, 'gui/supplemental-index.json'), 'utf8'))
  for (const item of supplement.entries.filter(item => item.incomplete)) {
    if (inventory.packages.some(pkg => item.id === pkg.ecosystem + ':' + pkg.name + '@' + pkg.version) && !inventory.unresolved.some(u => u.id === item.id)) throw new Error('不得隐藏上游不完整的版权通知：' + item.id)
  }
  const redistribution = JSON.parse(await readFile(join(licenseRoot, 'gui/redistribution-materials.json'), 'utf8'))
  if (redistribution.schemaVersion !== 1 || !Array.isArray(redistribution.sources) || !Array.isArray(redistribution.terms) || !Array.isArray(redistribution.materials)) throw new Error('源码及 WebView2 材料清单无效')
  if (redistribution.inventorySha256 !== createHash('sha256').update(await readFile(join(licenseRoot, 'gui/dependency-inventory.json'))).digest('hex')) throw new Error('源码/条款清单与依赖清单不一致，请运行 licenses:redistribution')
  for (const item of [...redistribution.sources, ...redistribution.materials, ...redistribution.terms.flatMap(term => term.materials)]) {
    const path = resolve(licenseRoot, item.file)
    const rel = relativePath(licenseRoot, path)
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('源码/条款路径超出 licenses/：' + item.file)
    if (createHash('sha256').update(await readFile(path)).digest('hex') !== item.sha256) throw new Error('源码/条款材料哈希不一致：' + item.file)
  }
  for (const pkg of inventory.packages.filter(pkg => pkg.ecosystem === 'cargo' && pkg.license === 'MPL-2.0')) {
    if (!redistribution.sources.some(source => source.id === 'cargo:' + pkg.name + '@' + pkg.version && source.license === 'MPL-2.0')) throw new Error('MPL 组件缺少准确版本源码：' + pkg.name)
  }
  for (const kind of ['consumer', 'distributor']) {
    if (!redistribution.terms.some(term => term.kind === kind && term.source.startsWith('https://developer.microsoft.com/microsoft-edge/api/eula/webview2?'))) throw new Error('WebView2 缺少 Microsoft 原始条款：' + kind)
  }
  const mit = await readFile(join(workspace, 'LICENSE'), 'utf8')
  const installerNotice = await readFile(join(licenseRoot, 'gui/INSTALLER-NOTICE.txt'), 'utf8')
  const consumer = await readFile(join(licenseRoot, 'gui/webview2/runtime-consumer-terms.txt'), 'utf8')
  if (!installerNotice.includes(mit) || !installerNotice.includes(consumer) || !installerNotice.includes('Microsoft Defender SmartScreen')) throw new Error('安装告知缺少 MIT 原文、WebView2 条款或 SmartScreen 提示')
  return status
}

export async function verifyHistoricalToolHashes(workspace = root) {
  const status = await inspectLicenseMaterials(workspace)
  for (const name of ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe']) {
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(join(workspace, 'bin', name))) hash.update(chunk)
    if (hash.digest('hex') !== status.historicalTools[name].sha256) {
      throw new Error('本地开发工具与历史许可记录不一致：' + name + '。请重新核对版本、许可证、通知、源码信息及哈希。')
    }
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const status = await inspectLicenseMaterials()
    console.log('许可说明存在、非空，且已配置为打包资源；当前 GUI 不内置第三方工具。')
    if (status.pending.length) {
      console.warn('当前 GUI 发布尚未完成：')
      for (const item of status.pending) console.warn('- ' + item)
      if (process.argv.includes('--release')) process.exitCode = 1
    } else {
      console.log('当前 GUI 待办已清空；这不是法律认证，仍需人工核验交付材料。')
    }
    if (status.historicalPending.length) {
      console.warn('历史工具重新分发待办（不代表当前随包内容）：')
      for (const item of status.historicalPending) console.warn('- ' + item)
    }
  } catch (error) {
    console.error('许可材料检查失败：' + error.message)
    process.exitCode = 1
  }
}
