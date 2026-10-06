import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createPinia, setActivePinia } from 'pinia'
import { useTaskStore } from '../src/stores/taskStore.ts'
import { useTerminalStore } from '../src/stores/terminalStore.ts'
import { useSettingsStore } from '../src/stores/settingsStore.ts'
import { useUrlStore } from '../src/stores/urlStore.ts'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
test('task events update one task rather than append duplicate rows', () => {
  setActivePinia(createPinia())
  const store = useTaskStore()
  store.updateTask({ taskId: 1, title: '下载', status: 'running', message: '开始' })
  store.updateTask({ taskId: 1, title: '下载', status: 'success', message: '完成' })
  assert.equal(store.tasks.length, 1)
  assert.equal(store.tasks[0].status, 'success')
})
test('task history is bounded without discarding active tasks', () => {
  setActivePinia(createPinia())
  const store = useTaskStore()
  store.updateTask({ taskId: 1, title: '下载', status: 'running', message: '' })
  for (let taskId = 2; taskId <= 250; taskId++)
    store.updateTask({ taskId, title: '下载', status: 'success', message: '' })
  assert.equal(store.tasks.length, 201)
  assert.equal(store.tasks.find((task) => task.taskId === 1).status, 'running')
})
test('terminal preserves plain text and limits retained output', () => {
  setActivePinia(createPinia())
  const store = useTerminalStore()
  for (let i = 0; i < 2100; i++) store.addLine(String(i))
  store.addLine('<script>alert(1)</script>')
  assert.equal(store.state.output.length, 2000)
  assert.equal(store.state.output.at(-1), '<script>alert(1)</script>')
  assert.doesNotMatch(read('../src/pages/终端显示/components/MiniTerminal.vue'), /v-html/)
})
test('settings use string retries and can hydrate from native configuration', () => {
  setActivePinia(createPinia())
  const store = useSettingsStore()
  assert.equal(store.retryTimes, '10')
  assert.equal(store.initialized, false)
  store.applySettings({ downloadPath: 'C:\\测试 下载', retryTimes: 'infinite' })
  assert.equal(store.retryTimes, 'infinite')
  assert.match(store.downloadPath, /测试/)
})
test('versions, NSIS configuration, resources and capabilities agree', () => {
  const config = JSON.parse(read('../src-tauri/tauri.conf.json'))
  const pkg = JSON.parse(read('../package.json'))
  const cargo = read('../src-tauri/Cargo.toml')
  assert.equal(config.version, pkg.version)
  assert.match(cargo, new RegExp('version = "' + pkg.version.replaceAll('.', '\\.') + '"'))
  assert.deepEqual(config.bundle.targets, ['nsis'])
  assert.equal(config.bundle.windows.nsis.installMode, 'currentUser')
  for (const name of ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe'])
    assert.equal(config.bundle.resources['../../bin/' + name], 'bin/' + name)
  assert.match(config.app.security.csp, /object-src 'none'/)
  const capability = JSON.parse(read('../src-tauri/capabilities/main.json'))
  assert.deepEqual(capability.permissions.slice(0, 2), ['core:default', 'dialog:allow-open'])
  assert.deepEqual(capability.permissions[2], {
    identifier: 'opener:allow-open-url',
    allow: [
      { url: 'https://github.com/ssk-shandm/yt-dlp-gui-cn' },
      { url: 'https://github.com/ssk-shandm/yt-dlp-gui-cn/releases' },
      { url: 'https://github.com/ssk-shandm/yt-dlp-gui-cn/blob/main/LICENSE' },
    ],
  })
  assert.equal(capability.permissions.length, 3)
})
test('each frontend invoke has a registered Rust command, no Eel entry remains', () => {
  const service = read('../src/services/desktop.ts')
  const rust = read('../src-tauri/src/lib.rs')
  for (const match of service.matchAll(/invoke(?:<[^>]+>)?\('([^']+)'/g)) assert.ok(rust.includes(match[1]), match[1])
  assert.doesNotMatch(read('../src/main.ts') + read('../index.html'), /eel/)
  assert.ok(readdirSync(fileURLToPath(new URL('../../docs/', import.meta.url))).includes('CHANGELOG.md'))
})

test('thumbnail starts empty and resets without restoring a sample image', () => {
  setActivePinia(createPinia())
  const store = useUrlStore()
  assert.equal(store.thumbnailUrl, '')
  store.setThumbnailUrl('https://example.com/cover.jpg')
  assert.equal(store.thumbnailUrl, 'https://example.com/cover.jpg')
  store.resetThumbnail()
  assert.equal(store.thumbnailUrl, '')
})

test('Windows icon contains small and large sizes and all configured PNG icons are square', () => {
  const config = JSON.parse(read('../src-tauri/tauri.conf.json'))
  const ico = readFileSync(new URL('../src-tauri/icons/icon.ico', import.meta.url))
  assert.equal(ico.readUInt16LE(0), 0)
  assert.equal(ico.readUInt16LE(2), 1)
  const sizes = []
  for (let index = 0; index < ico.readUInt16LE(4); index++) {
    const offset = 6 + index * 16
    const width = ico[offset] || 256
    const height = ico[offset + 1] || 256
    assert.equal(width, height)
    sizes.push(width)
    assert.ok(ico.readUInt32LE(offset + 12) + ico.readUInt32LE(offset + 8) <= ico.length)
  }
  for (const size of [16, 32, 48, 256]) assert.ok(sizes.includes(size), `Missing ${size}px ICO entry`)
  for (const path of config.bundle.icon.filter((path) => path.endsWith('.png'))) {
    const png = readFileSync(new URL(`../src-tauri/${path}`, import.meta.url))
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    assert.equal(png.readUInt32BE(16), png.readUInt32BE(20))
  }
})
