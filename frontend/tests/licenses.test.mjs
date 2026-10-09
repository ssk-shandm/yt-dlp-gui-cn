import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { verifyInstalledLicenses } from '../scripts/verify-installed-licenses.mjs'
import { inspectLicenseMaterials, requiredLicenseFiles } from '../scripts/check-licenses.mjs'

const frontend = fileURLToPath(new URL('../', import.meta.url))

test('third-party license resources exist, are nonempty and are mapped into the installer', async () => {
  const status = await inspectLicenseMaterials()
  assert.ok(Array.isArray(status.pending))
  assert.equal(status.distribution.bundlesToolBinaries, false)
  assert.equal('bundledTools' in status, false)
  assert.ok(Array.isArray(status.historicalPending))
  assert.ok(requiredLicenseFiles.includes('ffmpeg/SOURCE-INFO.md'))
  assert.ok(requiredLicenseFiles.includes('yt-dlp/SOURCE-INFO.md'))
  assert.ok(!requiredLicenseFiles.some(file => file.includes('SOURCE-OFFER')))
})

test('license checker distinguishes material presence from release readiness', async () => {
  const status = await inspectLicenseMaterials()
  for (const mode of [[], ['--release']]) {
    const result = spawnSync(process.execPath, ['scripts/check-licenses.mjs', ...mode], { cwd: frontend, encoding: 'utf8', windowsHide: true })
    assert.equal(result.status, mode.length && status.pending.length ? 1 : 0, result.stderr)
    if (status.pending.length) assert.ok(result.stderr.includes(status.pending[0]))
  }
})

test('historical yt-dlp binary record matches the saved upstream checksum and notices state incomplete source coverage', async () => {
  const status = await inspectLicenseMaterials()
  const sums = await readFile(new URL('../../licenses/evidence/yt-dlp-SHA2-256SUMS.txt', import.meta.url), 'utf8')
  assert.ok(sums.includes(status.historicalTools['yt-dlp.exe'].sha256 + '  yt-dlp.exe'))
  const notice = await readFile(new URL('../../licenses/NOTICE.txt', import.meta.url), 'utf8')
  assert.ok(notice.includes('GPL-3.0-or-later'))
  assert.ok(notice.includes('GUI RELEASE REVIEW: INCOMPLETE'))
})

async function fixture(t) {
  const workspace = await mkdtemp(join(tmpdir(), 'ytdlp-license-test-'))
  t.after(() => rm(workspace, { recursive: true, force: true }))
  await cp(new URL('../../LICENSE', import.meta.url), join(workspace, 'LICENSE'))
  await cp(new URL('../../licenses/', import.meta.url), join(workspace, 'licenses'), { recursive: true })
  await mkdir(join(workspace, 'frontend/src-tauri'), { recursive: true })
  const config = JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url), 'utf8'))
  const configPath = join(workspace, 'frontend/src-tauri/tauri.conf.json')
  await writeFile(configPath, JSON.stringify(config))
  await cp(new URL('../package-lock.json', import.meta.url), join(workspace, 'frontend/package-lock.json'))
  await cp(new URL('../src-tauri/Cargo.lock', import.meta.url), join(workspace, 'frontend/src-tauri/Cargo.lock'))
  return { workspace, config, configPath }
}

test('GUI license inspection does not require historical local binaries', async t => {
  const { workspace } = await fixture(t)
  const status = await inspectLicenseMaterials(workspace)
  assert.equal(status.distribution.bundlesToolBinaries, false)
})

test('GUI-only license inspection rejects bundling tools or a bin directory', async t => {
  const { workspace, config, configPath } = await fixture(t)
  for (const path of ['../../bin', '../../bin/**', '../../bin/ffmpeg.exe', '../../FFPROBE.EXE']) {
    config.bundle.resources[path] = 'tools'
    await writeFile(configPath, JSON.stringify(config))
    await assert.rejects(inspectLicenseMaterials(workspace), /不得捆绑/)
    delete config.bundle.resources[path]
  }
  config.bundle.externalBin = ['binaries/yt-dlp']
  await writeFile(configPath, JSON.stringify(config))
  await assert.rejects(inspectLicenseMaterials(workspace), /不得捆绑/)
})

test('GUI-only license inspection rejects stale bundledTools status', async t => {
  const { workspace } = await fixture(t)
  const statusPath = join(workspace, 'licenses/release-status.json')
  const status = JSON.parse(await readFile(statusPath, 'utf8'))
  status.bundledTools = status.historicalTools
  await writeFile(statusPath, JSON.stringify(status))
  await assert.rejects(inspectLicenseMaterials(workspace), /historicalTools/)
})

test('current GUI notice and source leads explicitly separate historical tools', async () => {
  const notice = await readFile(new URL('../../licenses/NOTICE.txt', import.meta.url), 'utf8')
  assert.ok(notice.includes('does NOT bundle yt-dlp.exe, ffmpeg.exe or ffprobe.exe'))
  for (const file of ['yt-dlp/SOURCE-INFO.md', 'ffmpeg/SOURCE-INFO.md']) {
    const text = await readFile(new URL('../../licenses/' + file, import.meta.url), 'utf8')
    assert.ok(text.includes('历史工具记录'))
    assert.doesNotMatch(text, /本安装包(?:中的|分发的)/)
  }
})

test('dependency material checker rejects modified notice bytes and stale lockfiles', async t => {
  const { workspace } = await fixture(t)
  const inventory = JSON.parse(await readFile(join(workspace, 'licenses/gui/dependency-inventory.json'), 'utf8'))
  const material = inventory.packages.find(pkg => pkg.materials.length).materials[0]
  const path = join(workspace, 'licenses', material.file)
  const original = await readFile(path)
  await writeFile(path, 'altered notice')
  await assert.rejects(inspectLicenseMaterials(workspace), /哈希不一致/)
  await writeFile(path, original)
  await writeFile(join(workspace, 'frontend/package-lock.json'), '{}')
  await assert.rejects(inspectLicenseMaterials(workspace), /锁文件不一致/)
})

test('unresolved dependency materials cannot be hidden by clearing pending', async t => {
  const { workspace } = await fixture(t)
  const inventoryPath = join(workspace, 'licenses/gui/dependency-inventory.json')
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'))
  inventory.unresolved = [{ id: 'npm:example@1.0.0', reason: 'test-only unresolved notice' }]
  await writeFile(inventoryPath, JSON.stringify(inventory))
  const path = join(workspace, 'licenses/release-status.json')
  const status = JSON.parse(await readFile(path, 'utf8'))
  status.pending = []
  await writeFile(path, JSON.stringify(status))
  await assert.rejects(inspectLicenseMaterials(workspace), /不得清空/)
})

test('notice inventory paths cannot escape the license resource directory', async t => {
  const { workspace } = await fixture(t)
  const path = join(workspace, 'licenses/gui/dependency-inventory.json')
  const inventory = JSON.parse(await readFile(path, 'utf8'))
  inventory.packages[0].materials[0].file = '../../LICENSE'
  await writeFile(path, JSON.stringify(inventory))
  await assert.rejects(inspectLicenseMaterials(workspace), /超出/)
})
test('installed license verification detects missing, modified and extra resources', async t => {
  const workspace = await mkdtemp(join(tmpdir(), 'ytdlp-license-resources-'))
  t.after(() => rm(workspace, { recursive: true, force: true }))
  const installed = join(workspace, 'installed')
  await mkdir(join(workspace, 'licenses/subfolder'), { recursive: true })
  await writeFile(join(workspace, 'LICENSE'), 'project license')
  await writeFile(join(workspace, 'licenses/subfolder/notice.txt'), 'upstream notice')
  await mkdir(installed)
  await cp(join(workspace, 'LICENSE'), join(installed, 'LICENSE'))
  await cp(join(workspace, 'licenses'), join(installed, 'licenses'), { recursive: true })
  const report = await verifyInstalledLicenses(installed, workspace)
  assert.equal(report.files, 2)
  assert.match(report.manifestSha256, /^[a-f0-9]{64}$/)
  assert.deepEqual((await verifyInstalledLicenses(installed, workspace)).manifestSha256, report.manifestSha256)
  await writeFile(join(installed, 'LICENSE'), 'changed')
  await assert.rejects(verifyInstalledLicenses(installed, workspace), /bytes differ/)
  await cp(join(workspace, 'LICENSE'), join(installed, 'LICENSE'))
  await writeFile(join(installed, 'licenses/extra.txt'), 'extra')
  await assert.rejects(verifyInstalledLicenses(installed, workspace), /Missing or extra/)
  await rm(join(installed, 'licenses/extra.txt'))
  await rm(join(installed, 'licenses/subfolder/notice.txt'))
  await assert.rejects(verifyInstalledLicenses(installed, workspace), /Missing or extra/)
})

// Distribution choices are deliberate, not Tauri defaults.
test('license checker rejects missing install notice, root MIT mapping and changed WebView2 strategy', async t => {
  const { workspace, config, configPath } = await fixture(t)
  delete config.bundle.licenseFile
  await writeFile(configPath, JSON.stringify(config))
  await assert.rejects(inspectLicenseMaterials(workspace), /安装前许可告知/)
  config.bundle.licenseFile = '../../licenses/gui/INSTALLER-NOTICE.txt'
  config.bundle.windows.webviewInstallMode.type = 'skip'
  await writeFile(configPath, JSON.stringify(config))
  await assert.rejects(inspectLicenseMaterials(workspace), /WebView2 分发方式/)
  config.bundle.windows.webviewInstallMode.type = 'downloadBootstrapper'
  delete config.bundle.resources['../../LICENSE']
  await writeFile(configPath, JSON.stringify(config))
  await assert.rejects(inspectLicenseMaterials(workspace), /MIT 版权通知/)
})

test('source archive and Microsoft terms tampering is detected', async t => {
  const { workspace } = await fixture(t)
  const manifest = JSON.parse(await readFile(join(workspace, 'licenses/gui/redistribution-materials.json'), 'utf8'))
  for (const item of [manifest.sources[0], manifest.terms[0].materials[0]]) {
    const path = join(workspace, 'licenses', item.file)
    const original = await readFile(path)
    await writeFile(path, 'modified')
    await assert.rejects(inspectLicenseMaterials(workspace), /条款材料哈希不一致/)
    await writeFile(path, original)
  }
})

test('a missing exact-version MPL source cannot pass just because licenses exist', async t => {
  const { workspace } = await fixture(t)
  const path = join(workspace, 'licenses/gui/redistribution-materials.json')
  const manifest = JSON.parse(await readFile(path, 'utf8'))
  manifest.sources = manifest.sources.filter(s => !s.id.startsWith('cargo:selectors@'))
  await writeFile(path, JSON.stringify(manifest))
  await assert.rejects(inspectLicenseMaterials(workspace), /MPL 组件缺少准确版本源码/)
})

test('GUI notices remain independently accessible after tool installation', async () => {
  const tools = await readFile(new URL('../src-tauri/src/tools.rs', import.meta.url), 'utf8')
  const gui = tools.slice(tools.indexOf('pub fn open_gui_licenses'))
  assert.match(gui, /resource_dir/)
  assert.match(gui, /join\("gui"\)/)
  assert.doesNotMatch(gui, /tool_directory/)
  const about = await readFile(new URL('../src/pages/关于/AboutPage.vue', import.meta.url), 'utf8')
  assert.match(about, /GUI 版权通知、源码与 WebView2 条款/)
  assert.match(about, /Microsoft Defender SmartScreen/)
})
