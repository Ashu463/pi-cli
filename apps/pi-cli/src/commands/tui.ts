import { Command } from "commander"

export async function launchTui(): Promise<void> {
  try {
    const { runTui } = await import("@repo/tui")
    await runTui()
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (/FFI|render library/i.test(message)) {
      console.error(
        [
          "AEON's terminal UI needs the Bun runtime (its renderer loads a native library that doesn't run on Node yet).",
          "",
          "  Install Bun:  curl -fsSL https://bun.sh/install | bash",
          "",
          "Everything else works on Node today — try:",
          '  aeon run --p "your question"'
        ].join("\n")
      )
      process.exitCode = 1
      return
    }
    throw e
  }
}

export const tui = new Command("tui").description("open the AEON terminal UI (default)").action(launchTui)
