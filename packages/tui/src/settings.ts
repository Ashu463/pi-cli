import fs from "fs"
import os from "os"
import path from "path"

export interface Settings {
  key: string
  defaultProvider: string
  defaultModel: string
}

// same file the CLI's `login`/`set` commands already write to (~/.pi-cli/settings.json) —
// the TUI reads whatever provider/model/key was already configured, doesn't reconfigure them.
export function loadSettings(): Settings | null {
  try {
    const file = path.join(os.homedir(), ".pi-cli", "settings.json")
    return JSON.parse(fs.readFileSync(file, "utf-8"))
  } catch {
    return null
  }
}
