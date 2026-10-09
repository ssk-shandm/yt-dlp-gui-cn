import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url))
const frontend = join(root, 'frontend')
const target = join(root, 'licenses/gui/supplemental')
await mkdir(target, { recursive: true })
const indexPath = join(root, 'licenses/gui/supplemental-index.json')
const entries = JSON.parse(await readFile(indexPath, 'utf8').catch(() => '{"entries":[]}')).entries
async function saveIndex() { await writeFile(indexPath, JSON.stringify({ checkedAt: new Date().toISOString().slice(0, 10), entries }, null, 2) + '\n') }
const pattern = /^(licen[cs]e|copying|notice|copyright|patents)([-_.]|$)/i
async function hasNotice(dir) { return (await readdir(dir)).some(n => pattern.test(n)) }
async function get(url) {
  const result = spawnSync('curl.exe', ['--fail', '--silent', '--show-error', '--location', '--proto', '=https', '--proto-redir', '=https', '--max-time', '30', url], { encoding: 'utf8', maxBuffer: 8e6, windowsHide: true })
  if (result.status) throw new Error(`${result.stderr.includes('404') ? '404:' : 'Download failed:'} ${url}: ${result.stderr}`)
  return result.stdout
}
async function collect(id, base, candidates, ref) {
  const found = []
  for (const candidate of candidates) {
    try {
      const url = `${base}/${ref}/${candidate}`
      const text = await get(url)
      if (text.length < 100 || !/license|licence|permission|redistribution/i.test(text)) continue
      const file = `${id.replaceAll(/[^a-zA-Z0-9._-]/g, '_')}-${candidate.replaceAll('/', '_')}`
      await writeFile(join(target, file), text)
      found.push({ file: `gui/supplemental/${file}`, url, sha256: createHash('sha256').update(text).digest('hex') })
      // Pick one permissive alternative for OR expressions, but retain all root license files for AND expressions elsewhere.
      break
    } catch (error) {
      if (!error.message.startsWith('404:')) console.warn(error.message)
    }
  }
  if (!found.length) throw new Error(`Cannot find upstream license for ${id} at ${ref}`)
  entries.push({ id, revision: ref, materials: found })
  await saveIndex()
  console.log(id, found[0].url)
}
const lock = JSON.parse(await readFile(join(frontend, 'package-lock.json'), 'utf8'))
for (const [key, record] of Object.entries(lock.packages)) {
  if (!key || !existsSync(join(frontend, key))) continue
  const dir = join(frontend, key)
  if (await hasNotice(dir)) continue
  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  const id = `npm:${pkg.name}@${pkg.version}`
  if (entries.some(entry => entry.id === id)) continue
  // Native bindings use notices from the exact same-version parent npm package.
  const parentName = pkg.name === '@rolldown/binding-win32-x64-msvc' ? 'rolldown' : pkg.name === '@tauri-apps/cli-win32-x64-msvc' ? '@tauri-apps/cli' : null
  if (parentName) {
    const parentDir = join(frontend, 'node_modules', parentName)
    const parent = JSON.parse(await readFile(join(parentDir, 'package.json'), 'utf8'))
    if (parent.version !== pkg.version) throw new Error('Binding/parent version mismatch: ' + pkg.name)
    const materials = []
    for (const name of (await readdir(parentDir)).filter(name => pattern.test(name) || /^THIRD-PARTY-LICENSE/i.test(name))) {
      const text = await readFile(join(parentDir, name), 'utf8')
      const file = `${id.replaceAll(/[^a-zA-Z0-9._-]/g, '_')}-${name}`
      await writeFile(join(target, file), text)
      materials.push({ file: `gui/supplemental/${file}`, sourcePackage: `${parentName}@${parent.version}`, sourcePath: name, sha256: createHash('sha256').update(text).digest('hex') })
    }
    if (!materials.length) throw new Error('Parent notices missing: ' + parentName)
    entries.push({ id, revision: `npm:${parentName}@${parent.version}`, materials })
    await saveIndex(); console.log(id, 'same-version parent notices'); continue
  }
  const readmeName = (await readdir(dir)).find(name => /^readme(?:\.|$)/i.test(name))
  const readme = readmeName ? await readFile(join(dir, readmeName), 'utf8') : ''
  if (/copyright/i.test(readme) && /permission is hereby granted|redistribution and use in source and binary forms|permission to use, copy, modify/i.test(readme)) {
    const file = `${id.replaceAll(/[^a-zA-Z0-9._-]/g, '_')}-README-NOTICE.md`
    await writeFile(join(target, file), readme)
    entries.push({ id, revision: `npm:${pkg.name}@${pkg.version}`, materials: [{ file: `gui/supplemental/${file}`, sourcePackage: `${pkg.name}@${pkg.version}`, sourcePath: readmeName, sha256: createHash('sha256').update(readme).digest('hex') }] })
    await saveIndex(); console.log(id, 'embedded published notice'); continue
  }
  if (pkg.name === 'natural-compare' && pkg.version === '1.4.0') {
    const url = 'https://lauri.rooden.ee/mit-license.txt'
    const text = await get(url)
    if (!text.includes('Copyright (c) Lauri Rooden') || !text.includes('Permission is hereby granted')) throw new Error('Unexpected author license')
    const file = `${id.replaceAll(/[^a-zA-Z0-9._-]/g, '_')}-AUTHOR-LICENSE.txt`
    await writeFile(join(target, file), text)
    entries.push({ id, revision: 'Published 1.4.0 README links to author MIT license; author URL fetched over HTTPS', materials: [{ file: `gui/supplemental/${file}`, url, sha256: createHash('sha256').update(text).digest('hex') }] })
    await saveIndex(); console.log(id, url); continue
  }
  const metadata = JSON.parse(await get(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/${pkg.version}`))
  const repo = (typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url)?.replace(/^git\+/, '').replace(/^git:/, 'https:').replace(/\.git$/, '')
  if (!repo?.startsWith('https://github.com/')) throw new Error(`Unsupported source: ${repo}`)
  let ref = metadata.gitHead
  if (!ref && ['@rolldown/binding-win32-x64-msvc', '@tauri-apps/cli-win32-x64-msvc'].includes(pkg.name)) {
    const parent = pkg.name.startsWith('@rolldown/') ? 'rolldown' : '@tauri-apps/cli'
    const parentMetadata = JSON.parse(await get(`https://registry.npmjs.org/${encodeURIComponent(parent)}/${pkg.version}`))
    ref = parentMetadata.gitHead
  }
  if (!ref && pkg.name === 'boolbase' && pkg.version === '1.0.0') {
    ref = 'be0bcd8a4e917a0a5895e95b523fbbed05a64871'
    const upstreamSource = await get(`${repo.replace('github.com', 'raw.githubusercontent.com')}/${ref}/index.js`)
    const localSource = await readFile(join(dir, 'index.js'), 'utf8')
    if (upstreamSource.replaceAll('\r\n', '\n') !== localSource.replaceAll('\r\n', '\n')) throw new Error('boolbase source did not match licensed upstream revision')
  }
  if (!ref && pkg.name === 'keyv' && pkg.version === '4.5.4') {
    ref = 'e4d608eccdfc094b80f6e9545c5307ee0810af72'
    const upstreamSource = await get(`${repo.replace('github.com', 'raw.githubusercontent.com')}/${ref}/packages/keyv/src/index.js`)
    const localSource = await readFile(join(dir, 'src/index.js'), 'utf8')
    if (upstreamSource.replaceAll('\r\n', '\n') !== localSource.replaceAll('\r\n', '\n')) throw new Error('keyv source did not match licensed upstream revision')
  }
  if (!ref) throw new Error(`No published gitHead: ${pkg.name}`)
  await collect(`npm:${pkg.name}@${pkg.version}`, repo.replace('github.com', 'raw.githubusercontent.com'), ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'License.txt', 'LICENCE', 'LICENSE-MIT', 'LICENSE-MIT.txt', 'packages/keyv/LICENSE', 'packages/api/LICENSE', 'packages/core/LICENSE', 'license.txt', 'LICENSE-MIT.md'], ref)
}
const output = spawnSync('cargo', ['metadata', '--offline', '--locked', '--filter-platform', 'x86_64-pc-windows-msvc', '--format-version', '1', '--manifest-path', 'src-tauri/Cargo.toml'], { cwd: frontend, encoding: 'utf8', maxBuffer: 25e6, windowsHide: true })
if (output.status) throw new Error(output.stderr)
const metadata = JSON.parse(output.stdout)
const nodes = new Set(metadata.resolve.nodes.map(n => n.id))
for (const pkg of metadata.packages.filter(p => nodes.has(p.id) && p.source)) {
  const dir = dirname(pkg.manifest_path)
  if (await hasNotice(dir)) continue
  if (entries.some(entry => entry.id === `cargo:${pkg.name}@${pkg.version}`)) continue
  if (pkg.name === 'selectors' && pkg.version === '0.38.0') {
    const url = 'https://www.mozilla.org/media/MPL/2.0/index.815ca599c9df.txt'
    const text = await get(url)
    if (!text.includes('Mozilla Public License Version 2.0')) throw new Error('Unexpected MPL license')
    const file = 'cargo_selectors_0.38.0-LICENSE-MPL-2.0.txt'
    await writeFile(join(target, file), text)
    entries.push({ id: `cargo:${pkg.name}@${pkg.version}`, revision: 'Published crate declares MPL-2.0; license authority text',
      materials: [{ file: `gui/supplemental/${file}`, url, sha256: createHash('sha256').update(text).digest('hex') }] })
    await saveIndex(); console.log(pkg.name, url); continue
  }
  const vcs = JSON.parse(await readFile(join(dir, '.cargo_vcs_info.json'), 'utf8'))
  await collect(`cargo:${pkg.name}@${pkg.version}`, pkg.repository.replace('github.com', 'raw.githubusercontent.com'), ['LICENSE', 'LICENSE-MIT', 'LICENSE-MIT.txt', 'LICENSE.txt', 'LICENSE.md', 'COPYING', 'LICENSE-APACHE', 'COPYING.BSD'], vcs.git.sha1)
}
await saveIndex()