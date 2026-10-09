// Opt-in Windows integration test. Launches the built app with local CDP only,
// serves generated media on loopback, restores settings and removes its own temp data.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer, request as httpRequest } from 'node:http'
import { createServer as createTcpServer } from 'node:net'
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm, copyFile, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, dirname, join, relative, isAbsolute, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(frontend, '..')
const executable = resolve(process.argv[2] || join(frontend, 'src-tauri/target/release/yt-dlp-gui-cn.exe'))
const temporary = await mkdtemp(join(tmpdir(), 'ytdlp-tauri-smoke-'))
const downloadPath = join(temporary, '中文 下载')
await mkdir(downloadPath)
let app, browser, page, originalSettings, server, localProxy
const proxyRequests = []
let proxyMediaBytes = 0
const failures = []
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const slowRequests = new Set()
async function cdpPort() {
  const listener = createTcpServer(); listener.listen(0, '127.0.0.1'); await once(listener, 'listening')
  const port = listener.address().port; await new Promise((r) => listener.close(r)); return port
}
async function powershell(command) {
  const child = spawn(join(process.env.SystemRoot || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true })
  let text = ''; child.stdout.on('data', (chunk) => { text += chunk.toString() }); const [code] = await once(child, 'exit')
  assert.equal(code, 0, 'Process inspection failed'); return text.trim() ? JSON.parse(text) : []
}
async function closeApplication() {
  if (app && app.exitCode === null) assert.equal(await powershell(`(Get-Process -Id ${app.pid}).CloseMainWindow() | ConvertTo-Json -Compress`), true, 'Native window close request failed')
}
async function ownedProcesses() {
  const ids = await powershell(`$all = Get-CimInstance Win32_Process; $parents = @(${app.pid}); $owned = @(); do { $children = @($all | Where-Object { $_.ParentProcessId -in $parents }); $owned += $children; $parents = @($children | Select-Object -ExpandProperty ProcessId) } while ($parents.Count); @($owned | Where-Object { $_.Name -in @('yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe') } | Select-Object -ExpandProperty ProcessId) | ConvertTo-Json -Compress`)
  return Array.isArray(ids) ? ids : [ids]
}
async function assertProcessesGone(ids) {
  if (!ids.length) throw new Error('No owned child processes observed')
  for (let i = 0; i < 20; i++) {
    const live = await powershell(`@(Get-Process -Id ${ids.join(',')} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id) | ConvertTo-Json -Compress; exit 0`)
    if (Array.isArray(live) && live.length === 0) return
    await wait(250)
  }
  throw new Error('Owned child process survived cancellation/exit: ' + ids.join(','))
}
async function waitForRequests(count) {
  for (let i = 0; i < 100; i++) { if (slowRequests.size >= count) return; await wait(100) }
  throw new Error('Slow task did not connect')
}

async function run(exe, args, cwd = temporary) {
  const child = spawn(exe, args, { cwd, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
  let error = ''
  child.stderr.on('data', (chunk) => { error += chunk.toString() })
  const [code] = await once(child, 'exit')
  if (code !== 0) throw new Error(exe + ' failed: ' + error)
}
async function invoke(command, args = {}) {
  return page.evaluate(({ command, args }) => window.__TAURI_INTERNALS__.invoke(command, args), { command, args })
}
async function waitTask(taskId) {
  for (let i = 0; i < 120; i++) {
    const all = await page.evaluate(() => window.__smokeEvents)
    const result = all.findLast((e) => e.taskId === taskId && e.status !== 'running')
    if (result) return result
    await wait(500)
  }
  throw new Error('Task timeout: ' + taskId)
}
try {
  // Run an isolated GUI copy: tools are no longer bundled with the installer.
  // Never copy tools into or alter the user's application directory.
  const appDirectory = join(temporary, 'app')
  await mkdir(appDirectory)
  const testExecutable = join(appDirectory, basename(executable))
  await copyFile(executable, testExecutable)
  await copyFile(join(root, 'LICENSE'), join(appDirectory, 'LICENSE'))
  await cp(join(root, 'licenses'), join(appDirectory, 'licenses'), { recursive: true })
  await run(join(root, 'bin/ffmpeg.exe'), ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:r=10', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', join(temporary, 'sample.mp4')])
  await run(join(root, 'bin/ffmpeg.exe'), ['-hide_banner', '-loglevel', 'error', '-i', join(temporary, 'sample.mp4'), '-frames:v', '1', join(temporary, 'poster.jpg')])
  await run(join(root, 'bin/ffmpeg.exe'), ['-hide_banner', '-loglevel', 'error', '-i', join(temporary, 'sample.mp4'), '-c', 'copy', '-f', 'dash', join(temporary, 'sample.mpd')])
  await writeFile(join(temporary, 'en.vtt'), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nTauri smoke test\n')
  await writeFile(join(temporary, 'watch.html'), '<html><head><title>Tauri smoke test</title><meta property="og:description" content="local smoke description"></head><body><video controls src="/sample.mp4" poster="/poster.jpg"><track kind="subtitles" src="/en.vtt" srclang="en"></video></body></html>')
  server = createServer(async (request, response) => {
    const name = new URL(request.url, 'http://localhost').pathname.slice(1)
    if (/^slow-\d+\.mp4$/.test(name)) {
      slowRequests.add(response); response.once('close', () => slowRequests.delete(response)); return
    }
    if (!name || name.includes('/') || name.includes('..')) { response.writeHead(404).end(); return }
    try {
      const data = await readFile(join(temporary, name))
      const mime = name.endsWith('.mp4') ? 'video/mp4' : name.endsWith('.mpd') ? 'application/dash+xml' : name.endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.jpg') ? 'image/jpeg' : name.endsWith('.vtt') ? 'text/vtt' : 'application/octet-stream'
      const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
      const start = range ? Number(range[1]) : 0
      const end = range?.[2] ? Number(range[2]) : data.length - 1
      response.writeHead(range ? 206 : 200, { 'Content-Type': mime, 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', ...(range ? { 'Content-Range': 'bytes ' + start + '-' + end + '/' + data.length } : {}) })
      response.end(request.method === 'HEAD' ? undefined : data.subarray(start, end + 1))
    } catch { response.writeHead(404).end() }
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = 'http://127.0.0.1:' + server.address().port
  // CDP is enabled only in this test process environment, not in shipping configuration.
  const port = await cdpPort()
  app = spawn(testExecutable, [], { cwd: temporary, windowsHide: true, stdio: 'ignore', env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=' + port, WEBVIEW2_USER_DATA_FOLDER: join(temporary, 'webview') } })
  for (let i = 0; i < 60; i++) {
    try { browser = await chromium.connectOverCDP('http://127.0.0.1:' + port); break } catch { await wait(500) }
  }
  assert.ok(browser, 'WebView2 CDP endpoint did not start')
  for (let i = 0; i < 60; i++) {
    page = browser.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith('about:'))
    if (page) break
    await wait(500)
  }
  assert.ok(page, 'No application page found')
  page.on('pageerror', (error) => failures.push(String(error)))
  await page.waitForFunction(() => !!window.__TAURI_INTERNALS__)
  await page.waitForTimeout(1000)
  const missingTools = await invoke('get_tool_status')
  assert.equal(missingTools.installed, false)
  assert.deepEqual([...missingTools.missing].sort(), ['ffmpeg.exe', 'ffprobe.exe', 'yt-dlp.exe'])
  const toolDialog = page.getByRole('dialog', { name: '准备你的下载工具', exact: true })
  await toolDialog.waitFor()
  await assert.rejects(invoke('analyze_url', { url: base + '/watch.html' }), /缺少下载工具/)
  const installedBin = join(appDirectory, 'bin')
  await mkdir(installedBin)
  for (const name of ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe']) {
    await copyFile(join(root, 'bin', name), join(installedBin, name))
  }
  const installedTools = await invoke('get_tool_status')
  assert.equal(installedTools.installed, true)
  assert.deepEqual(installedTools.missing, [])
  assert.equal(resolve(installedTools.binPath), installedBin)
  assert.ok(installedTools.ytdlpVersion && installedTools.ffmpegVersion && installedTools.ffprobeVersion)
  await toolDialog.getByRole('button', { name: '稍后安装', exact: true }).click()
  await toolDialog.waitFor({ state: 'hidden' })
  console.log('PASS GUI-only first run, missing-tool guard, setup dialog and isolated local tool detection')
  originalSettings = await invoke('get_settings')
  assert.equal(originalSettings.concurrentFragments >= 1 && originalSettings.concurrentFragments <= 16, true)
  await invoke('save_settings', { settings: { downloadPath, retryTimes: '3' } })
  assert.equal((await invoke('get_settings')).downloadPath, downloadPath)
  await page.evaluate(async () => {
    window.__smokeEvents = []; window.__smokeLogs = []
    const handler = window.__TAURI_INTERNALS__.transformCallback((event) => window.__smokeEvents.push(event.payload))
    await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', { event: 'task-status', target: { kind: 'Any' }, handler });
    const logger = window.__TAURI_INTERNALS__.transformCallback((event) => window.__smokeLogs.push(event.payload));
    await window.__TAURI_INTERNALS__.invoke('plugin:event|listen', { event: 'terminal-output', target: { kind: 'Any' }, handler: logger })
  })
  const metadata = await invoke('analyze_url', { url: base + '/watch.html' })
  assert.ok(metadata.formats.length)
  console.log('PASS real metadata parsing; formats:', metadata.formats.length, 'subtitles:', metadata.subtitles.length)
  // Exercise the Vue service and stores through the actual input/button, not only IPC.
  await page.getByPlaceholder('粘贴视频链接').fill(base + '/watch.html')
  await page.getByRole('button', { name: '分析链接', exact: true }).click()
  await page.getByRole('button', { name: '快速下载', exact: true }).waitFor()
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === '快速下载' && !b.disabled))
  await page.waitForFunction(() => document.querySelector('img[alt="视频封面预览"]')?.naturalWidth > 0)
  console.log('PASS Vue analyze action, store hydration and cover rendering')
  for (const kind of ['quick', 'format', 'thumbnail', 'description', 'subtitle']) {
    const request = { url: base + '/watch.html', kind, formatId: metadata.formats[0].id, language: 'en' }
    const result = await waitTask(await invoke('start_download', { request }))
    assert.equal(result.status, 'success', kind + ': ' + result.message)
    console.log('PASS', kind)
  }
  assert.equal(await page.getByLabel('分片并发数').inputValue(), '8')
  await page.getByLabel('分片并发数').selectOption('4')
  for (let i = 0; (await invoke('get_settings')).concurrentFragments !== 4; i++) {
    assert.ok(i < 40, 'Parallelism setting was not persisted'); await wait(50)
  }
  console.log('PASS parallelism defaults, UI selection and persisted IPC setting')
  const dash = await invoke('analyze_url', { url: base + '/sample.mpd' })
  const video = dash.formats.find((f) => f.vcodec !== 'none' && f.acodec === 'none')
  const audio = dash.formats.find((f) => f.acodec !== 'none' && f.vcodec === 'none')
  assert.ok(video && audio, 'DASH fixture should offer separate video/audio streams')
  const combined = await waitTask(await invoke('start_download', { request: { url: base + '/sample.mpd', kind: 'combined', videoId: video.id, audioId: audio.id, containerFormat: 'mp4' } }))
  assert.equal(combined.status, 'success', combined.message + ': ' + JSON.stringify(await page.evaluate(() => window.__smokeLogs)))
  console.log('PASS combined download and FFmpeg merge')
  await assert.rejects(invoke('analyze_url', { url: 'file:///C:/Windows/win.ini' }))
  const invalid = await waitTask(await invoke('start_download', { request: { url: base + '/missing', kind: 'quick' } }))
  assert.equal(invalid.status, 'error')
  console.log('PASS URL validation and failed task event')
  const sitesId = await invoke('list_supported_sites')
  assert.equal((await waitTask(sitesId)).status, 'success')
  console.log('PASS supported sites')
  const files = await readdir(downloadPath)
  assert.ok(files.some((name) => name.endsWith('.mp4')))
  assert.ok(files.some((name) => name.endsWith('.jpg')))
  assert.ok(files.some((name) => name.endsWith('.description')))
  assert.ok(files.some((name) => name.endsWith('.vtt')))
  assert.deepEqual(failures, [])
  console.log('PASS generated files:', files.join(', '))
  console.log('PASS no WebView page errors')
  const slowIds = []
  for (let i = 0; i < 4; i++) slowIds.push(await invoke('start_download', { request: { url: base + '/slow-' + i + '.mp4', kind: 'quick' } }))
  await waitForRequests(4)
  await assert.rejects(invoke('start_download', { request: { url: base + '/slow-5.mp4', kind: 'quick' } }), /4/)
  const cancelledPids = await ownedProcesses()
  assert.ok(cancelledPids.length >= 4)
  for (const taskId of slowIds) await invoke('cancel_task', { taskId })
  for (const taskId of slowIds) assert.equal((await waitTask(taskId)).status, 'cancelled')
  await assertProcessesGone(cancelledPids)
  console.log('PASS four-task limit, cancellation events and owned process cleanup')
  await invoke('save_settings', { settings: originalSettings }); originalSettings = undefined
  await invoke('start_download', { request: { url: base + '/slow-6.mp4', kind: 'quick' } })
  await waitForRequests(1)
  const exitPids = await ownedProcesses()
  assert.ok(exitPids.length)
  await closeApplication()
  await Promise.race([once(app, 'exit'), wait(10000)])
  assert.notEqual(app.exitCode, null, 'Normal application close did not exit')
  assert.equal(app.exitCode, 0)
  await assertProcessesGone(exitPids)
  console.log('PASS normal application close with active task; no owned child remains')
} finally {
  if (page && originalSettings) await invoke('save_settings', { settings: originalSettings }).catch(console.error)
  await closeApplication().catch(() => {})
  if (browser) await browser.close().catch(() => {})
  if (app && app.exitCode === null) {
    await Promise.race([once(app, 'exit'), wait(3000)])
    if (app.exitCode === null) await run(join(process.env.SystemRoot || 'C:/Windows', 'System32/taskkill.exe'), ['/PID', String(app.pid), '/T', '/F']).catch(() => {})
  }
  if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)) }
  // Verify the computed recursive-delete target stays in the explicitly created temp directory.
  const rel = relative(resolve(tmpdir()), resolve(temporary))
  if (!isAbsolute(rel) && !rel.startsWith('..') && rel.startsWith('ytdlp-tauri-smoke-')) await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 })
}
