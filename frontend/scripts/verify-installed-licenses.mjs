// Byte-for-byte verification of installed license resources; not a legal review.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile, lstat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
async function tree(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const name = prefix + entry.name
    assert.ok(!entry.isSymbolicLink(), 'Symlink in license resources: ' + name)
    if (entry.isDirectory()) files.push(...await tree(join(directory, entry.name), name + '/'))
    else { assert.ok(entry.isFile(), 'Not a regular license file: ' + name); files.push(name) }
  }
  return files.sort()
}
export async function verifyInstalledLicenses(installDirectory, workspace = root) {
  const installed = resolve(installDirectory)
  assert.notEqual(installed, resolve(workspace), 'Use an installed directory, not the workspace')
  for (const name of ['LICENSE', 'licenses']) {
    assert.ok(!(await lstat(join(installed, name))).isSymbolicLink(), 'Installed resource is a symlink: ' + name)
  }
  const names = await tree(join(workspace, 'licenses'))
  assert.deepEqual(await tree(join(installed, 'licenses')), names, 'Missing or extra installed license files')
  const manifest = createHash('sha256')
  let totalBytes = 0
  for (const name of ['LICENSE', ...names.map(name => 'licenses/' + name)]) {
    const expected = await readFile(join(workspace, name))
    const actual = await readFile(join(installed, name))
    assert.ok(expected.equals(actual), 'Installed license bytes differ: ' + name)
    totalBytes += actual.length
    manifest.update(name + '\0' + createHash('sha256').update(actual).digest('hex') + '\n')
  }
  return { checkedAt: new Date().toISOString(), installDirectory: installed, files: names.length + 1, totalBytes, manifestSha256: manifest.digest('hex') }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    assert.ok(process.argv[2], 'Usage: npm run licenses:installed -- <installed-directory>')
    console.log(JSON.stringify(await verifyInstalledLicenses(process.argv[2]), null, 2))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
