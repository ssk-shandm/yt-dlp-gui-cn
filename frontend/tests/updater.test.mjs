import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createUpdateController } from '../src/services/updateController.ts'
function fixture(overrides = {}) {
  const calls = []
  const deps = {
    isDesktop: () => true, activeTasks: () => false,
    check: async () => { calls.push('check'); return { version: '1.2.0', available: true } },
    install: async () => { calls.push('install') },
    readPreference: () => 'true', savePreference: (value) => calls.push(value),
    ...overrides,
  }
  const controller = createUpdateController(deps)
  controller.initializePreference()
  return { controller, calls, deps }
}
test('manual update downloads/installs even when automatic updates are off', async () => {
  const { controller, calls } = fixture({ readPreference: () => null })
  await controller.checkAndInstall()
  assert.deepEqual(calls, ['check', 'install'])
  assert.equal(controller.state.phase, 'installing')
})
test('latest release does not download or install', async () => {
  const { controller, calls } = fixture({ check: async () => ({ available: false, version: '1.1.0' }) })
  await controller.checkAndInstall()
  assert.equal(controller.state.phase, 'latest')
  assert.deepEqual(calls, [])
})
test('parallel update clicks are ignored', async () => {
  let finish
  const { controller, calls } = fixture({ check: () => new Promise((resolve) => { finish = resolve }) })
  const operation = controller.checkAndInstall()
  await controller.checkAndInstall()
  finish({ version: '1.2.0', available: true })
  await operation
  assert.deepEqual(calls, ['install'])
})
test('update waits for active tasks, then installs once', async () => {
  let active = true
  const { controller, calls } = fixture({ activeTasks: () => active })
  await controller.checkAndInstall('automatic')
  assert.equal(controller.state.phase, 'waiting')
  assert.deepEqual(calls, ['check'])
  active = false
  await controller.installPending()
  await controller.installPending()
  assert.deepEqual(calls, ['check', 'install'])
})
test('disabling automatic update cancels a deferred automatic install', async () => {
  const { controller, calls, deps } = fixture({ activeTasks: () => true })
  await controller.checkAndInstall('automatic')
  controller.state.autoCheck = false
  controller.savePreference()
  deps.activeTasks = () => false
  await controller.installPending()
  assert.equal(controller.state.phase, 'idle')
  assert.deepEqual(calls, ['check', 'false'])
})
test('disabling auto check during network request prevents automatic installation', async () => {
  let finish
  const { controller, calls } = fixture({ check: () => new Promise((resolve) => { finish = resolve }) })
  const operation = controller.checkAndInstall('automatic')
  controller.state.autoCheck = false
  controller.savePreference()
  finish({ available: true, version: '1.2.0' })
  await operation
  assert.deepEqual(calls, ['false'])
})
test('errors allow retry and never imply successful installation', async () => {
  const { controller, deps } = fixture({ install: async () => { throw new Error('signature rejected') } })
  await controller.checkAndInstall()
  assert.equal(controller.state.phase, 'error')
  assert.match(controller.state.message, /signature rejected/)
  deps.install = async () => {}
  await controller.checkAndInstall()
  assert.equal(controller.state.phase, 'installing')
})
test('browser preview cannot initiate native checks or installs', async () => {
  const { controller, calls } = fixture({ isDesktop: () => false })
  await controller.checkAndInstall()
  assert.equal(controller.state.phase, 'error')
  assert.deepEqual(calls, [])
})
test('missing storage or content-length is handled gracefully', () => {
  const { controller } = fixture({ readPreference: () => { throw new Error('denied') } })
  assert.equal(controller.state.autoCheck, true)
  assert.ok(controller.state.preferenceError)
  controller.progress({ downloaded: 50, total: null })
  assert.equal(controller.state.progress, null)
  controller.progress({ downloaded: 125, total: 100 })
  assert.equal(controller.state.progress, 100)
})
test('release updates use the GitHub Release NSIS installer directly', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
  const config = JSON.parse(read('../src-tauri/tauri.conf.json'))
  assert.equal(config.bundle.createUpdaterArtifacts, undefined)
  assert.equal(config.plugins, undefined)
  const rust = read('../src-tauri/src/updater.rs')
  const frontend = read('../src/services/updater.ts')
  assert.match(frontend, /api\.github\.com\/repos\/ssk-shandm\/yt-dlp-gui-cn\/releases\/latest/)
  assert.match(frontend, /fetch\(GITHUB_API_URL/)
  assert.match(rust, /ends_with\("-setup\.exe"\)/)
  assert.match(rust, /download_and_install_update/)
  assert.match(rust, /update-download-progress/)
})

test('Rust update commands are registered without the Tauri updater plugin', () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
  const rust = read('../src-tauri/src/lib.rs')
  for (const command of ['download_and_install_update', 'get_tool_info']) assert.match(rust, new RegExp('updater::' + command))
  assert.doesNotMatch(rust, /updater::check_app_update/)
  assert.doesNotMatch(rust, /tauri_plugin_updater/)
})

