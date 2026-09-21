import { useKeyboard } from "@opentui/react"
import { theme } from "../theme"

interface Props {
  cwd: string
  onAnswer: (trusted: boolean) => void
}

export function TrustGate({ cwd, onAnswer }: Props) {
  useKeyboard(key => {
    if (key.name === "y") onAnswer(true)
    else if (key.name === "n" || key.name === "escape") onAnswer(false)
  })

  return (
    <box flexGrow={1} width="100%" alignItems="center" justifyContent="center" flexDirection="column">
      <ascii-font text="AEON" font="block" color={theme.logoGradient} />
      <box marginTop={1} marginBottom={2}>
        <text fg={theme.muted}>your personal coding companion</text>
      </box>
      <box width="100%" maxWidth={76} border={["left"]} borderColor={theme.amber} paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1} flexDirection="column">
        <text fg={theme.text}>AEON wants to read and edit files in:</text>
        <box marginTop={1}>
          <text fg={theme.gold}>{cwd}</text>
        </box>
        <box marginTop={1}>
          <text fg={theme.muted}>write/edit/bash still ask individually — this only covers read access and remembers your answer for this folder.</text>
        </box>
        <box flexDirection="row" justifyContent="flex-end" marginTop={1}>
          <text fg={theme.text}>y</text>
          <text fg={theme.muted}>{" trust   "}</text>
          <text fg={theme.text}>n</text>
          <text fg={theme.muted}>{" quit"}</text>
        </box>
      </box>
    </box>
  )
}
