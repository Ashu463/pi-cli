import { theme } from "../theme"
import { VERSION, displayCwd } from "../env"

const cwd = displayCwd()

export function Footer() {
  return (
    <box flexDirection="row" justifyContent="space-between" width="100%" paddingLeft={1} paddingRight={1}>
      <text fg={theme.muted}>{cwd}</text>
      <text fg={theme.muted}>{VERSION}</text>
    </box>
  )
}
