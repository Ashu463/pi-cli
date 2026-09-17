import type { LogEntry } from "../types"
import { theme } from "../theme"

type ToolEntry = Extract<LogEntry, { type: "tool" }>

function borderColor(entry: ToolEntry): string {
  if (entry.status === "ok") return theme.teal
  if (entry.status === "error") return theme.error
  return entry.awaitingConfirm ? theme.amber : theme.border
}

export function ToolCallBlock({ entry }: { entry: ToolEntry }) {
  return (
    <box border={["left"]} borderColor={borderColor(entry)} paddingLeft={1} marginTop={1}>
      <box flexDirection="row">
        <text fg={theme.text}>{entry.name}</text>
        <text fg={theme.muted}>{"  " + entry.detail}</text>
      </box>
      {entry.awaitingConfirm && <text fg={theme.amber}>{`? allow this ${entry.name}? (y/N)`}</text>}
      {entry.status === "ok" && <text fg={theme.teal}>{"✓ " + (entry.resultSummary ?? "done")}</text>}
      {entry.status === "error" && !entry.awaitingConfirm && (
        <text fg={theme.error}>{"✗ " + (entry.resultSummary ?? "failed")}</text>
      )}
    </box>
  )
}
