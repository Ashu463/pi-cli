export type ToolStatus = "pending" | "ok" | "error"

export type LogEntry =
  | { type: "user"; content: string }
  | { type: "assistant"; content: string }
  | {
      type: "tool"
      id: string
      name: string
      detail: string
      status: ToolStatus
      // true only while actually waiting on a y/N keypress — distinct from "pending" because
      // most tool calls (read, or anything already approved) are briefly "pending" too, and
      // showing a "? allow this?" prompt for those would be misleading.
      awaitingConfirm?: boolean
      resultSummary?: string
    }
