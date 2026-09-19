import { Command } from "commander"

// Imported lazily so config commands (login/set/list) don't pay the cost of booting the
// terminal renderer, and so they still work on a machine where the TUI can't start.
export async function launchTui(): Promise<void> {
  try {
    const { runTui } = await import("@repo/tui")
    await runTui()
  } catch (e) {
    // OpenTUI renders through a native FFI library that currently only loads under Bun —
    // its node entry point throws "native FFI is not available for this runtime yet".
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
