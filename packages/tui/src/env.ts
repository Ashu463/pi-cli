import os from "os"

export const VERSION = "0.3.0"

export function displayCwd(): string {
  const cwd = process.cwd()
  const home = os.homedir()
  const short = cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd
  const branch = gitBranch()
  return branch ? `${short}:${branch}` : short
}

function gitBranch(): string | null {
  try {
    const proc = Bun.spawnSync(["git", "rev-parse", "--abbrev-ref", "HEAD"], { stdout: "pipe", stderr: "ignore" })
    if (proc.exitCode !== 0) return null
    return new TextDecoder().decode(proc.stdout).trim() || null
  } catch {
    return null
  }
}
