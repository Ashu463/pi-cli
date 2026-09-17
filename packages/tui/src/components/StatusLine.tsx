import { useEffect, useState } from "react"
import { theme } from "../theme"

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

export function StatusLine({ text }: { text: string | null }) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!text) return
    const id = setInterval(() => setFrame(f => (f + 1) % FRAMES.length), 80)
    return () => clearInterval(id)
  }, [text])

  if (!text) return null

  return (
    <box flexDirection="row" marginTop={1} marginBottom={1} flexShrink={0}>
      <text fg={theme.gold}>{FRAMES[frame] + " "}</text>
      <text fg={theme.muted}>{text}</text>
    </box>
  )
}
