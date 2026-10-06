import { access, constants } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const missing = []
for (const name of ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe']) {
  try { await access(fileURLToPath(new URL('../../bin/' + name, import.meta.url)), constants.R_OK) }
  catch { missing.push(name) }
}
if (missing.length) {
  console.error('缺少打包工具：' + missing.join(', ') + '\n请将官方 Windows x64 可执行文件放入项目根目录 bin/，参见 docs/BUILD.md。')
  process.exitCode = 1
} else console.log('Windows 打包工具检查通过。')
