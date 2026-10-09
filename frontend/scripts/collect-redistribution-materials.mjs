// Retrieve original Microsoft terms and lockfile-verified source archives.
// This does not invent missing copyright notices or certify legal compliance.
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative as relativePath } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
const root = fileURLToPath(new URL('../../', import.meta.url))
const licenseRoot = join(root, 'licenses')
const gui = join(licenseRoot, 'gui')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const inventory = JSON.parse(await readFile(join(gui, 'dependency-inventory.json'), 'utf8'))
const review = JSON.parse(await readFile(join(gui, 'review.json'), 'utf8'))
if (inventory.packages.some(pkg => !review.decisions.some(decision => decision.id === pkg.ecosystem + ':' + pkg.name + '@' + pkg.version && decision.declared === pkg.license))) throw new Error('Dependency review is stale; review license choices for the updated inventory first')
const lock = await readFile(join(root, 'frontend/src-tauri/Cargo.lock'), 'utf8')
const curl = (url, output) => {
  const result = spawnSync('curl.exe', ['--fail', '--silent', '--show-error', '--location', '--proto', '=https', '--proto-redir', '=https', '--max-time', '90', url, '-o', output], { windowsHide: true, encoding: 'utf8' })
  if (result.status !== 0) throw new Error('Download failed: ' + url + '\n' + result.stderr)
}
await mkdir(join(gui, 'sources'), { recursive: true })
const cargo = process.env.CARGO_HOME || join(homedir(), '.cargo')
const registry = join(cargo, 'registry')
const cacheDirs = await readdir(join(registry, 'cache'))
const sourceDirs = await readdir(join(registry, 'src'))
const sources = []
// MPL portions are furnished locally; extra source archives preserve embedded
// per-file copyright notices for composite licenses (not a source offer).
for (const pkg of inventory.packages.filter(p => p.ecosystem === 'cargo' && (p.license === 'MPL-2.0' || ['ring', 'dpi', 'brotli', 'unicode-ident'].includes(p.name)))) {
  const name = `${pkg.name}-${pkg.version}`
  const block = lock.split('[[package]]').find(s => s.includes(`name = "${pkg.name}"`) && s.includes(`version = "${pkg.version}"`))
  const expected = block?.match(/checksum = "([a-f0-9]{64})"/)?.[1]
  if (!expected) throw new Error('No registry checksum: ' + name)
  const file = `gui/sources/${name}.crate`
  const destination = join(licenseRoot, file)
  const cached = cacheDirs.map(dir => join(registry, 'cache', dir, name + '.crate')).find(existsSync)
  if (cached) await copyFile(cached, destination)
  else curl(pkg.source, destination)
  if (hash(await readFile(destination)) !== expected) throw new Error('Archive checksum mismatch: ' + name)
  const installed = sourceDirs.map(dir => join(registry, 'src', dir, name)).find(existsSync)
  if (!installed) throw new Error('Missing installed crate source: ' + name)
  const extracted = join(root, 'frontend/src-tauri/target/license-research/sources', name)
  await mkdir(extracted, { recursive: true })
  const listing = spawnSync('tar', ['-tzf', name + '.crate'], { cwd: dirname(destination), encoding: 'utf8', windowsHide: true })
  if (listing.status || listing.stdout.trim().split('\n').some(path => !path.startsWith(name + '/') || path.split('/').includes('..') || path.includes('\\'))) throw new Error('Unsafe source archive: ' + name)
  const unpack = spawnSync('tar', ['-xzf', relativePath(extracted, destination)], { cwd: extracted, encoding: 'utf8', windowsHide: true })
  if (unpack.status) throw new Error(unpack.stderr)
  let verifiedFiles = 0
  async function compare(relative = '') {
    for (const item of await readdir(join(extracted, name, relative), { withFileTypes: true })) {
      const path = join(relative, item.name)
      if (item.isDirectory()) await compare(path)
      else if (item.isFile()) {
        if (hash(await readFile(join(extracted, name, path))) !== hash(await readFile(join(installed, path)))) throw new Error('Locally modified crate source: ' + name + '/' + path)
        verifiedFiles++
      } else throw new Error('Unsupported source archive entry: ' + path)
    }
  }
  await compare()
  sources.push({ id: 'cargo:' + pkg.name + '@' + pkg.version, license: pkg.license, file, sha256: expected, source: pkg.source, modification: 'No local changes: published archive files verified byte-for-byte against installed crate', verifiedFiles })
  console.log('Source verified:', name)
}
const terms = []
// These endpoints are used by Microsoft's own download page EULA dialog.
for (const [kind, field, query] of [['distributor', 'evergreenHtml', ''], ['consumer', 'consumerHtml', '&consumer=true']]) {
  const source = `https://developer.microsoft.com/microsoft-edge/api/eula/webview2?locale=en-us${query}`
  const jsonFile = `gui/webview2/runtime-${kind}-terms.json`
  curl(source, join(licenseRoot, jsonFile))
  const payload = JSON.parse(await readFile(join(licenseRoot, jsonFile), 'utf8'))
  if (payload.locale !== 'en-us' || !payload[field]?.includes('MICROSOFT EDGE WEBVIEW2 RUNTIME')) throw new Error('Unexpected Microsoft terms payload')
  // Preserve the unmodified HTML plus the original JSON, and produce plain text
  // for NSIS. Fail rather than silently dropping any unknown HTML entity.
  const html = payload[field]
  const htmlFile = `gui/webview2/runtime-${kind}-terms.html`
  await writeFile(join(licenseRoot, htmlFile), html)
  let text = html.replace(/<\/(?:p|h[1-6]|li|div)>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/[\t\r ]+/g, ' ')
  text = text.replace(/&(?:nbsp|amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, entity => {
    const named = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }
    if (named[entity]) return named[entity]
    return String.fromCodePoint(parseInt(entity.slice(entity[2].toLowerCase() === 'x' ? 3 : 2, -1), entity[2].toLowerCase() === 'x' ? 16 : 10))
  }).split('\n').map(s => s.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
  if (/&(?:\w+|#\w+);/.test(text)) throw new Error('Unknown HTML entity in terms')
  const textFile = `gui/webview2/runtime-${kind}-terms.txt`
  await writeFile(join(licenseRoot, textFile), text)
  terms.push({ kind, source, materials: await Promise.all([jsonFile, htmlFile, textFile].map(async file => ({ file, sha256: hash(await readFile(join(licenseRoot, file))) }))) })
}
const prefix = `安装前告知 / INSTALLATION NOTICE\n\nyt-dlp GUI 自有代码采用 MIT License，版权通知及原文见下文；第三方组件不受本项目 MIT 许可证覆盖。\n\n本安装器采用 Microsoft WebView2 Evergreen downloadBootstrapper 模式。已有满足要求的运行时会被复用；缺失时从 Microsoft 下载引导程序并安装运行时，需要联网，不提供完整离线运行时。WebView2 由 Microsoft 独立维护及自动更新，卸载 GUI 不会移除共享运行时。\n\n本软件使用 Microsoft Defender SmartScreen；该功能可能收集并向 Microsoft 发送用户信息。Microsoft 隐私声明：https://aka.ms/privacy 。SmartScreen 说明：https://learn.microsoft.com/en-us/microsoft-edge/privacy-whitepaper#smartscreen 。WebView2 本身也可能按 Microsoft 条款收集使用信息。本告知不表示 GUI 自行实施同等数据收集。\n\n使用 WebView2 适用 Microsoft 的独立条款，不是本项目 MIT；原始最终用户条款全文附在本告知末尾。继续安装表示同意适用于 WebView2 的 Microsoft 条款；不同意可取消安装。MIT 代码不因该告知被重新许可。静默/自动部署的管理员或分发者须在部署前另行提供通知并取得适当同意，不能将 /S 视为用户已阅读或同意。\n\nGUI 安装包不内置 yt-dlp / FFmpeg / ffprobe；这些工具由用户选择后从上游另行下载，其许可证、版本及安装记录在 bin/licenses/。\n\nGUI 的原始第三方通知在 licenses/gui/DEPENDENCY-NOTICES.txt 及 packages/、supplemental/、webview2/。MPL 组件的准确版本源码随包提供于 licenses/gui/sources/，使用方式见 SOURCE-NOTICE.txt。\n\n=== GUI MIT LICENSE (original, unchanged) ===\n\n`
const notice = prefix + await readFile(join(root, 'LICENSE'), 'utf8') + '\n\n=== MICROSOFT WEBVIEW2 END-USER TERMS (official English text) ===\n\n' + await readFile(join(gui, 'webview2/runtime-consumer-terms.txt'), 'utf8')
// Tauri prepends the UTF-8 BOM in its generated NSIS license_file.
await writeFile(join(gui, 'INSTALLER-NOTICE.txt'), notice)
const sourceNotice = `GUI THIRD-PARTY SOURCE AND COPYRIGHT NOTICE\n\nMPL-2.0 source is supplied with this installer, under the original upstream MPL-2.0 terms. No local changes were found in the published crate files. These archives contain the preferred form for modification, not merely generated JavaScript or license identifiers.\n\nOpen licenses/gui/sources/ in the installation directory. Each .crate is a gzip-compressed tar archive; extract it with 7-Zip or: tar -xzf <name-version>.crate\nThe extracted upstream source includes its copyright/license notices; the accompanying license texts remain in packages/ or supplemental/. For selectors the full MPL-2.0 text is in supplemental/cargo_selectors_0.38.0-LICENSE-MPL-2.0.txt.\n\n` + sources.map(s => `${s.id}\nLicense: ${s.license}\nLocal archive: ${s.file}\nUpstream exact-version archive: ${s.source}\nSHA-256: ${s.sha256}\nModification status: ${s.modification}\n`).join('\n') + `\nlightningcss and its npm Windows binding are build-time tools, not deployed executables. Their original notices remain in the conservative inventory; their MPL metadata does not relicense CSS/JS output. If later distributing the build tools themselves, include their preferred-form source and re-review that separate delivery.\n\nring uses ISC, Apache-2.0, MIT and additional vendored component notices. The unmodified ring archive is also supplied to retain file-level attribution (including BoringSSL and fiat); do not describe all of ring as MIT or as OpenSSL-licensed merely because it derives from BoringSSL. dpi, brotli and unicode-ident archives likewise preserve composite-license notices.\n\nThese GUI component source archives do NOT provide Corresponding Source for separately downloaded yt-dlp/FFmpeg or for Microsoft's independent runtime.\n`
await writeFile(join(gui, 'SOURCE-NOTICE.txt'), sourceNotice)
const materials = await Promise.all(['gui/INSTALLER-NOTICE.txt', 'gui/SOURCE-NOTICE.txt', 'gui/review.json'].map(async file => ({ file, sha256: hash(await readFile(join(licenseRoot, file))) })))
await writeFile(join(gui, 'redistribution-materials.json'), JSON.stringify({ schemaVersion: 1, checkedAt: new Date().toISOString(), inventorySha256: hash(await readFile(join(gui, 'dependency-inventory.json'))), sources, terms, materials }, null, 2) + '\n')
console.log('Saved original Microsoft runtime terms, installer notice and source index.')
