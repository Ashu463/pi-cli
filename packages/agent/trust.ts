import fs from "fs"
import os from "os"
import path from "path"

// Separate from confirmTool (which asks per write/edit/bash call, every time) — this is a
// one-time "may AEON operate in this directory at all" gate, checked once per directory and
// remembered, the same way VS Code's workspace trust or Claude Code's directory trust work.
// Without it, running `aeon` in any folder starts reading files in it immediately.

interface TrustStore {
  trusted: string[]
}

// AEON_HOME overrides where the trust store lives — real purpose is test isolation (Bun's
// os.homedir() snapshots $HOME once and ignores later changes, so tests can't fake it via
// process.env.HOME), but it's a normal, harmless override for anyone who wants one too.
function trustFilePath(): string {
  const home = process.env.AEON_HOME || os.homedir()
  return path.join(home, ".pi-cli", "trusted-dirs.json")
}

function normalize(dir: string): string {
  try {
    return fs.realpathSync(path.resolve(dir))
  } catch {
    return path.resolve(dir)
  }
}

function readStore(): TrustStore {
  try {
    const parsed = JSON.parse(fs.readFileSync(trustFilePath(), "utf-8"))
    return { trusted: Array.isArray(parsed.trusted) ? parsed.trusted : [] }
  } catch {
    return { trusted: [] }
  }
}

export function isDirectoryTrusted(dir: string): boolean {
  return readStore().trusted.includes(normalize(dir))
}

export function trustDirectory(dir: string): void {
  const real = normalize(dir)
  const store = readStore()
  if (store.trusted.includes(real)) return
  store.trusted.push(real)
  const file = trustFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(store, null, 2))
}
