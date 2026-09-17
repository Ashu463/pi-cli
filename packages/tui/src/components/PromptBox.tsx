import { useRef } from "react"
import type { TextareaRenderable } from "@opentui/core"
import { theme } from "../theme"

interface Props {
  onSubmit: (value: string) => void
  focused: boolean
  placeholder: string
  meta: string
}

// A single-line <input> keeps the cursor 20% away from the right edge (opentui's default
// scrollMargin), so in a narrow terminal it scrolls early and hides the start of the line.
// A word-wrapping textarea shows the whole message instead, growing up to maxHeight.
const KEY_BINDINGS = [
  { name: "return", action: "submit" as const },
  { name: "return", shift: true, action: "newline" as const }
]

export function PromptBox({ onSubmit, focused, placeholder, meta }: Props) {
  const ref = useRef<TextareaRenderable>(null)

  const submit = () => {
    const editor = ref.current
    if (!editor) return
    const value = editor.plainText
    if (!value.trim()) return
    editor.clear()
    onSubmit(value)
  }

  return (
    <box
      width="100%"
      flexShrink={0}
      border={["left"]}
      borderColor={focused ? theme.gold : theme.border}
      backgroundColor={theme.panel}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
    >
      <textarea
        ref={ref}
        width="100%"
        minHeight={1}
        maxHeight={6}
        wrapMode="word"
        keyBindings={KEY_BINDINGS}
        onSubmit={submit}
        focused={focused}
        placeholder={placeholder}
        textColor={theme.text}
        focusedTextColor={theme.text}
        cursorColor={theme.gold}
        placeholderColor={theme.muted}
        backgroundColor={theme.panel}
        focusedBackgroundColor={theme.panel}
      />
      <box marginTop={1}>
        <text fg={theme.teal}>{meta}</text>
      </box>
    </box>
  )
}
