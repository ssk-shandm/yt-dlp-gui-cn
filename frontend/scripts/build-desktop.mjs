import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { join } from "node:path"

const frontend = fileURLToPath(new URL("../", import.meta.url))
const result = spawnSync(
  process.execPath,
  [join(frontend, "node_modules/@tauri-apps/cli/tauri.js"), "build", "--bundles", "nsis", ...process.argv.slice(2)],
  { cwd: frontend, env: process.env, stdio: "inherit", windowsHide: true },
)
process.exitCode = result.status || 0
