import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const repo = new URL('../../', import.meta.url)
const tauri = new URL('../src-tauri/', import.meta.url)
const read = (url) => readFileSync(url, 'utf8')

test('configured Windows bundle icons and project license exist', () => {
  const config = JSON.parse(read(new URL('tauri.conf.json', tauri)))
  const icons = new Set([...config.bundle.icon, config.bundle.windows.nsis.installerIcon, config.bundle.windows.nsis.uninstallerIcon])
  for (const icon of icons) assert.ok(existsSync(new URL(icon, tauri)), `Missing configured icon: ${icon}`)
  // External bin tools are local inputs; tools:check validates them before packaging.
  const license = Object.entries(config.bundle.resources).find(([, destination]) => destination === 'LICENSE')
  assert.ok(license, 'Project license must be bundled')
  assert.ok(existsSync(new URL(license[0], tauri)), 'Missing project license')
  for (const source of ['frontend/app-icon.png', 'frontend/src-tauri/icons/icon.png', '视频下载工具图标设计.png'])
    assert.ok(existsSync(new URL(source, repo)), `Missing icon source: ${source}`)
})

test('retired implementation and unused demo sources are not active repository files', () => {
  for (const path of ['legacy/python-eel/', 'frontend/src/stores/counter.ts', 'frontend/src/assets/test.jpg', 'frontend/app-icon-jpeg.png', 'test-write-permission.txt'])
    assert.equal(existsSync(new URL(path, repo)), false, `Retired file returned: ${path}`)
})

test('all relative Markdown document links point to existing files', () => {
  const docs = new URL('docs/', repo)
  const pages = [new URL('readme.md', repo), ...readdirSync(docs).filter((name) => name.endsWith('.md')).map((name) => new URL(name, docs))]
  for (const page of pages) {
    for (const [, href] of read(page).matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
      if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('#') || href.startsWith('//')) continue
      const target = new URL(href, page)
      target.hash = ''
      target.search = ''
      assert.ok(existsSync(target), `${page.pathname}: broken link ${href}`)
    }
  }
})

test('current and future release notes use user-facing sections without validation reports', () => {
  const docs = new URL('docs/', repo)
  // v2.0.0 remains a historical release; the new policy starts at v2.0.1.
  const notes = readdirSync(docs).filter((name) => {
    if (name === 'RELEASE_TEMPLATE.md') return true
    const match = /^RELEASE_v(\d+)\.(\d+)\.(\d+)\.md$/.exec(name)
    if (!match) return false
    const [major, minor, patch] = match.slice(1).map(Number)
    return major > 2 || (major === 2 && (minor > 0 || patch >= 1))
  })
  assert.ok(notes.includes('RELEASE_TEMPLATE.md'), 'Release template is required')
  assert.ok(notes.includes('RELEASE_v2.0.1.md'), 'Updated v2.0.1 notes are required')
  for (const name of notes) {
    const text = read(new URL(name, docs))
    for (const section of ['更新内容', '下载与安装', '使用须知', '文件信息'])
      assert.ok(text.includes('## ' + section), `${name}: missing ${section}`)
    assert.doesNotMatch(text, /^#{1,6}\s+.*(?:验证|测试|验收|\b(?:validation|verification|tests?|testing)\b)/im, name)
    assert.doesNotMatch(text, /自动化测试|单元测试|烟测|\b(?:clippy|ESLint)\b|cargo (?:fmt|test)|\d+\s*\/\s*\d+\s*通过/i, name)
  }
})
