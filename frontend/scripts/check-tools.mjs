import { access, constants } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { verifyHistoricalToolHashes } from './check-licenses.mjs'

const execFileAsync = promisify(execFile)
const toolDir = fileURLToPath(new URL('../../bin/', import.meta.url))
const paths = Object.fromEntries(['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe'].map((name) => [name, fileURLToPath(new URL('../../bin/' + name, import.meta.url))]))
const missing = []
for (const name of Object.keys(paths)) {
  try { await access(paths[name], constants.R_OK) }
  catch { missing.push(name) }
}
if (missing.length === Object.keys(paths).length) {
  console.log('没有历史本地开发工具，跳过 tools:check；GUI 构建不依赖这些 EXE。')
  process.exit(0)
}
if (missing.length) {
  console.error('本地开发工具不完整：' + missing.join(', ') + '\n如需使用这些可选工具，请放入项目根目录 bin/；参阅 docs/BUILD.md。')
  process.exit(1)
}

try {
  await verifyHistoricalToolHashes()
} catch (error) {
  console.error('历史工具/许可记录检查失败：' + error.message)
  process.exit(1)
}

for (const name of Object.keys(paths)) {
  try {
    const args = name === 'yt-dlp.exe' ? ['--version'] : ['-hide_banner', '-version']
    const { stdout } = await execFileAsync(paths[name], args, { windowsHide: true, maxBuffer: 1024 * 1024 })
    const firstLine = stdout.split(/\r?\n/, 1)[0]
    if (!firstLine) throw new Error('没有版本输出')
    console.log(`${name}: ${firstLine}`)
  } catch (error) {
    console.error(`${name} failed to start; verify that the executable is complete: ${error.message}`)
    process.exit(1)
  }
}

console.log(`Windows x64 历史本地开发工具检查通过（非安装包内容：${toolDir}）。`)
console.warn('注意：此检查只核验历史开发工具，不表示当前 GUI 内置工具或已完成工具分发审核。')
