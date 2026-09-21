import { useCallback, useMemo, useRef, useState } from "react"
import { useKeyboard } from "@opentui/react"
import { AgentCall, isDirectoryTrusted, trustDirectory } from "@repo/agent"
import type { AgentRequest, ToolCall } from "../../agent/models/model"
import { ToolCallBlock } from "./components/ToolCallBlock"
import { StatusLine } from "./components/StatusLine"
import { PromptBox } from "./components/PromptBox"
import { Footer } from "./components/Footer"
import { Home } from "./components/Home"
import { TrustGate } from "./components/TrustGate"
import { loadSettings } from "./settings"
import { theme } from "./theme"
import type { LogEntry } from "./types"

function toolDetail(call: ToolCall): string {
  if (call.name === "bash") return String(call.input.command ?? "")
  return String(call.input.path ?? "")
}

function truncate(text: string, max = 80): string {
  const oneLine = text.replace(/\n/g, " ")
  return oneLine.length > max ? oneLine.slice(0, max - 1) + "…" : oneLine
}

function LogLine({ entry }: { entry: LogEntry }) {
  if (entry.type === "user") {
    return (
      <box flexDirection="row" marginTop={1} border={["left"]} borderColor={theme.gold} paddingLeft={1}>
        <text fg={theme.text}>{entry.content}</text>
      </box>
    )
  }
  if (entry.type === "assistant") {
    if (!entry.content) return null
    return (
      <box marginTop={1} paddingLeft={2}>
        <text fg={theme.text}>{entry.content}</text>
      </box>
    )
  }
  return <ToolCallBlock entry={entry} />
}

export function App() {
  const cwd = useMemo(() => process.cwd(), [])
  const [trusted, setTrusted] = useState(() => isDirectoryTrusted(cwd))
  const settings = useMemo(() => loadSettings(), [])
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [running, setRunning] = useState(false)
  const [statusText, setStatusText] = useState<string | null>(null)
  const [awaitingConfirmId, setAwaitingConfirmId] = useState<string | null>(null)
  const confirmResolveRef = useRef<((approved: boolean) => void) | null>(null)

  const meta = settings ? `${settings.defaultProvider} · ${settings.defaultModel}` : "not logged in — run `nive login`"

  const handleToken = useCallback((delta: string) => {
    setEntries(prev => {
      const last = prev[prev.length - 1]
      if (last && last.type === "assistant") {
        return [...prev.slice(0, -1), { ...last, content: last.content + delta }]
      }
      return [...prev, { type: "assistant", content: delta }]
    })
  }, [])

  const handleToolCall = useCallback((call: ToolCall) => {
    setStatusText(`running ${call.name}…`)
    setEntries(prev => {
      if (prev.some(e => e.type === "tool" && e.id === call.id)) return prev
      return [...prev, { type: "tool", id: call.id, name: call.name, detail: toolDetail(call), status: "pending" }]
    })
  }, [])

  const handleToolResult = useCallback((call: ToolCall, result: string, isError: boolean) => {
    setStatusText("thinking…")
    setEntries(prev =>
      prev.map(e =>
        e.type === "tool" && e.id === call.id
          ? { ...e, status: isError ? "error" : "ok", resultSummary: truncate(result) }
          : e
      )
    )
  }, [])

  const handleRetry = useCallback((attempt: number, maxAttempts: number, error: string) => {
    setStatusText(`retrying (${attempt}/${maxAttempts})… ${truncate(error, 50)}`)
  }, [])

  const handleConfirm = useCallback((call: ToolCall): Promise<boolean> => {
    setStatusText("waiting for approval")
    setEntries(prev => [
      ...prev,
      { type: "tool", id: call.id, name: call.name, detail: toolDetail(call), status: "pending", awaitingConfirm: true }
    ])
    setAwaitingConfirmId(call.id)
    return new Promise<boolean>(resolve => {
      confirmResolveRef.current = resolve
    })
  }, [])

  useKeyboard(key => {
    if (!awaitingConfirmId || !confirmResolveRef.current) return
    if (key.name === "y" || key.name === "n" || key.name === "return" || key.name === "escape") {
      const approved = key.name === "y"
      confirmResolveRef.current(approved)
      confirmResolveRef.current = null
      const id = awaitingConfirmId
      setAwaitingConfirmId(null)
      setStatusText(approved ? "running…" : "thinking…")
      setEntries(prev => prev.map(e => (e.type === "tool" && e.id === id ? { ...e, awaitingConfirm: false } : e)))
    }
  })

  const handleSubmit = useCallback(
    async (value: string) => {
      const message = value.trim()
      if (!message || running) return
      setEntries(prev => [...prev, { type: "user", content: message }])

      if (!settings) {
        setEntries(prev => [...prev, { type: "assistant", content: "No provider configured. Run `nive login` and `nive set` first." }])
        return
      }

      setRunning(true)
      setStatusText("thinking…")
      try {
        const req: AgentRequest = {
          message,
          provider: settings.defaultProvider,
          model: settings.defaultModel,
          apiKey: settings.key,
          cwd: process.cwd(),
          onToken: handleToken,
          onToolCall: handleToolCall,
          onToolResult: handleToolResult,
          onRetry: handleRetry,
          confirmTool: handleConfirm
        }
        await AgentCall(req)
      } catch (e) {
        const errMessage = e instanceof Error ? e.message : String(e)
        setEntries(prev => [...prev, { type: "assistant", content: `Error: ${errMessage}` }])
      } finally {
        setRunning(false)
        setStatusText(null)
      }
    },
    [running, settings, handleToken, handleToolCall, handleToolResult, handleRetry, handleConfirm]
  )

  const handleTrustAnswer = useCallback(
    (approved: boolean) => {
      if (approved) {
        trustDirectory(cwd)
        setTrusted(true)
      } else {
        process.exit(0)
      }
    },
    [cwd]
  )

  const prompt = (
    <PromptBox
      onSubmit={handleSubmit}
      focused={!running && !awaitingConfirmId}
      placeholder={running ? "working…" : 'Ask anything… "Add a /health endpoint"'}
      meta={meta}
    />
  )

  return (
    <box width="100%" height="100%" flexDirection="column" backgroundColor={theme.bg} padding={1}>
      {!trusted ? (
        <TrustGate cwd={cwd} onAnswer={handleTrustAnswer} />
      ) : entries.length === 0 ? (
        <Home>{prompt}</Home>
      ) : (
        <box flexGrow={1} width="100%" flexDirection="column">
          <scrollbox flexGrow={1} width="100%" stickyScroll stickyStart="bottom">
            {entries.map((entry, i) => (
              <LogLine key={i} entry={entry} />
            ))}
          </scrollbox>
          <StatusLine text={statusText} />
          {prompt}
        </box>
      )}
      <box marginTop={1} flexShrink={0}>
        <Footer />
      </box>
    </box>
  )
}
