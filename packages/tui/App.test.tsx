import { test, expect } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import { App } from "./src/App"

const collapse = (frame: string) => frame.replace(/[│\s]+/g, " ")

test("home screen renders logo, tagline and prompt", async () => {
  const { renderOnce, captureCharFrame, renderer } = await testRender(<App />, { width: 110, height: 30 })
  await renderOnce()
  const frame = captureCharFrame()
  expect(frame).toContain("███████")
  expect(frame).toContain("your personal coding companion")
  expect(frame).toContain("Ask anything")
  renderer.destroy()
})

// regression: the old single-line <input> kept the cursor 20% from the right edge, so in a
// narrow terminal it scrolled early and hid the start of the line ("hi, who are you?" rendered
// as ", who are you?"). The prompt now wraps, so the whole message must stay visible.
for (const width of [60, 85, 110]) {
  test(`long typed message stays fully visible at width ${width}`, async () => {
    const { renderOnce, captureCharFrame, mockInput, renderer } = await testRender(<App />, { width, height: 30 })
    await renderOnce()
    const typed = "hi, who are you? this line is deliberately longer than the prompt box is wide"
    await mockInput.typeText(typed)
    await renderOnce()
    expect(collapse(captureCharFrame())).toContain(typed)
    renderer.destroy()
  })
}
