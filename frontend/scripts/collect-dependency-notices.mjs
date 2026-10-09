// Build a traceable notice inventory from installed, lockfile-matching packages.
// This inventories materials, not redistribution approval or a legal certification.
import { readFile, readdir, mkdir, writeFile, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../../', import.meta.url))
const frontend = join(root, 'frontend')
const sha256 = data => createHash('sha256').update(data).digest('hex')
const notices = /^(licen[cs]e|copying|notice|copyright|patents|third[-_]party[-_]licen[cs]e)([-_.]|$)/i
const supplemental = JSON.parse(await readFile(join(root, 'licenses/gui/supplemental-index.json'), 'utf8'))
const inventory = { schemaVersion: 1, checkedAt: new Date().toISOString(), target: 'x86_64-pc-windows-msvc',
  scope: 'Installed npm runtime and build packages; Windows-filtered Cargo graph (conservative superset). Does not certify native SDK components or license compliance.',
  lockfiles: {}, packages: [], unresolved: [] }
for (const path of ['frontend/package-lock.json', 'frontend/src-tauri/Cargo.lock']) inventory.lockfiles[path] = sha256(await readFile(join(root, path)))
async function record(entry, dir) {
  const id = `${entry.ecosystem}:${entry.name}@${entry.version}`
  entry.materials = []
  const directoryName = `${entry.ecosystem}_${entry.name.replaceAll(/[^a-zA-Z0-9._-]/g, '_')}_${entry.version}`
  const output = join(root, 'licenses/gui/packages', directoryName)
  await mkdir(output, { recursive: true })
  const candidates = []
  async function scan(relative = '') {
    for (const item of await readdir(join(dir, relative), { withFileTypes: true })) {
      const path = join(relative, item.name)
      if (item.isFile() && notices.test(item.name)) candidates.push(path)
      // Do not traverse dependency installations, build output or symlinks.
      if (item.isDirectory() && !['node_modules', '.git', 'target'].includes(item.name)) await scan(path)
    }
  }
  await scan()
  for (const path of candidates.sort()) {
    const bytes = await readFile(join(dir, path))
    if (!bytes.length) continue
    const name = path.replaceAll(/[\\/]/g, '_')
    await copyFile(join(dir, path), join(output, name))
    entry.materials.push({ file: `gui/packages/${directoryName}/${name}`, sourcePath: path.replaceAll('\\', '/'), sha256: sha256(bytes) })
  }
  if (!entry.materials.length) {
    const extra = supplemental.entries.find(item => item.id === id)
    if (extra) {
      entry.supplementalRevision = extra.revision
      if (extra.incomplete) inventory.unresolved.push({ id, reason: extra.reason })
      for (const material of extra.materials) {
        const bytes = await readFile(join(root, 'licenses', material.file))
        if (sha256(bytes) !== material.sha256) throw new Error('Supplemental notice hash mismatch: ' + id)
        entry.materials.push(material)
      }
    }
  }
  if (!entry.materials.length) inventory.unresolved.push({ id, reason: 'No collected notice for this exact installed version' })
  inventory.packages.push(entry)
}
const lock = JSON.parse(await readFile(join(frontend, 'package-lock.json'), 'utf8'))
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.link || !existsSync(join(frontend, path))) continue // links are recorded at their target; other-platform optional packages are not built here
  const dir = join(frontend, path)
  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
  if (pkg.version !== entry.version) throw new Error('npm install/lock mismatch: ' + path)
  await record({ ecosystem: 'npm', name: pkg.name, version: pkg.version, license: pkg.license || entry.license || 'UNKNOWN',
    developmentOnly: !!entry.dev, lockPath: path, integrity: entry.integrity,
    repository: typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url,
    source: entry.resolved }, dir)
}
const result = spawnSync('cargo', ['metadata', '--offline', '--locked', '--filter-platform', inventory.target, '--format-version', '1', '--manifest-path', 'src-tauri/Cargo.toml'], { cwd: frontend, encoding: 'utf8', maxBuffer: 30e6, windowsHide: true })
if (result.status) throw new Error(result.stderr)
const metadata = JSON.parse(result.stdout)
const resolved = new Set(metadata.resolve.nodes.map(node => node.id))
for (const pkg of metadata.packages.filter(pkg => resolved.has(pkg.id) && pkg.source)) {
  const source = `https://crates.io/api/v1/crates/${pkg.name}/${pkg.version}/download`
  await record({ ecosystem: 'cargo', name: pkg.name, version: pkg.version, license: pkg.license || 'UNKNOWN', repository: pkg.repository, source }, dirname(pkg.manifest_path))
}
inventory.packages.sort((a, b) => `${a.ecosystem}:${a.name}@${a.version}`.localeCompare(`${b.ecosystem}:${b.name}@${b.version}`))
await writeFile(join(root, 'licenses/gui/dependency-inventory.json'), JSON.stringify(inventory, null, 2) + '\n')
await writeFile(join(root, 'licenses/gui/DEPENDENCY-NOTICES.txt'), 'GUI DEPENDENCY NOTICE INVENTORY\n\nThis material inventory is not a legal certification. Includes development packages conservatively.\nNative SDK/runtime terms and review decisions are in webview2/README.md, review.json and release-status.json. MPL source archives are indexed in SOURCE-NOTICE.txt.\n\n' + inventory.packages.map(pkg => `${pkg.ecosystem}: ${pkg.name} ${pkg.version}\nDeclared license: ${typeof pkg.license === 'string' ? pkg.license : JSON.stringify(pkg.license)}\nSource: ${pkg.source || pkg.repository || 'See inventory'}\nNotices: ${pkg.materials.map(item => item.file).join(', ') || 'UNRESOLVED'}\n`).join('\n'))
console.log('Inventoried packages:', inventory.packages.length, 'unresolved:', inventory.unresolved.length)
for (const item of inventory.unresolved) console.warn(item.id, item.reason)
if (inventory.unresolved.length) process.exitCode = 1
