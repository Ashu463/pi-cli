import os from "os"
import { spawnSync } from "node:child_process"

export const VERSION = "0.3.2"

export function displayCwd(): string {
  const cwd = process.cwd()
  const home = os.homedir()
  const short = cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd
  const branch = gitBranch()
  return branch ? `${short}:${branch}` : short
}

// node:child_process rather than Bun.spawnSync so the published CLI runs on plain node too.
function gitBranch(): string | null {
  try {
    const proc = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf-8" })
    if (proc.status !== 0) return null
    return proc.stdout?.trim() || null
  } catch {
    return null
  }
}
