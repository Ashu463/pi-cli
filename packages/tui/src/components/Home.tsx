import type { ReactNode } from "react"
import { theme } from "../theme"

export function Home({ children }: { children: ReactNode }) {
  return (
    <box flexGrow={1} width="100%" alignItems="center" justifyContent="center" flexDirection="column">
      <ascii-font text="AEON" font="block" color={theme.logoGradient} />
      <box marginTop={1} marginBottom={2}>
        <text fg={theme.muted}>your personal coding companion</text>
      </box>
      <box width="100%" maxWidth={76} flexDirection="column">
        {children}
        <box flexDirection="row" justifyContent="flex-end" marginTop={1}>
          <text fg={theme.text}>enter</text>
          <text fg={theme.muted}>{" send   "}</text>
          <text fg={theme.text}>ctrl+c</text>
          <text fg={theme.muted}>{" quit"}</text>
        </box>
      </box>
    </box>
  )
}
