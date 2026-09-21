import { test, expect } from "bun:test"
import { testRender } from "@opentui/react/test-utils"
import fs from "fs"
import os from "os"
import path from "path"
import { trustDirectory } from "@repo/agent"
import { App } from "./src/App"

const collapse = (frame: string) => frame.replace(/[│\s]+/g, " ")

// React's reconciler (used by @opentui/react) schedules committing a state update via the
// `scheduler` package, which in Node resolves through the real task queue (MessageChannel /
// setTimeout), not microtasks. `renderOnce()` and `waitForVisualIdle()` only pump opentui's own
// draw loop, so a state-driven change (e.g. setTrusted swapping TrustGate for Home) can still be
// pending after both — confirmed by checking the file-write side effect fired instantly while
// the frame stayed stale for 10+ renderOnce() calls, and only updated once a real setTimeout
// task boundary was awaited. Typed input isn't affected: it updates opentui's own renderable
// state directly, without going through React at all.
const flushReact = () => new Promise(resolve => setTimeout(resolve, 0))

// AEON_HOME (not $HOME) isolates trust.ts's storage per test — Bun's os.homedir() snapshots
// $HOME once per process and ignores later changes, so mutating process.env.HOME here would
// silently leave every test sharing the same real trust file. Each test gets its own throwaway
// home + project dir. `pretrust: true` calls trustDirectory() before mounting, for tests that
// exercise what's *behind* the gate and aren't about the gate itself.
function withIsolatedEnv<T>(fn: (dir: string, fakeHome: string) => Promise<T>, opts: { pretrust?: boolean } = {}): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aeon-tui-trust-"))
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), "aeon-tui-home-"))
  const realAeonHome = process.env.AEON_HOME
  const realCwd = process.cwd()
  process.env.AEON_HOME = fakeHome
  process.chdir(dir)
  if (opts.pretrust) trustDirectory(dir)
  return fn(dir, fakeHome).finally(() => {
    process.chdir(realCwd)
    process.env.AEON_HOME = realAeonHome
    fs.rmSync(dir, { recursive: true, force: true })
    fs.rmSync(fakeHome, { recursive: true, force: true })
  })
}

test("home screen renders logo, tagline and prompt", () =>
  withIsolatedEnv(
    async () => {
      const { renderOnce, captureCharFrame, renderer } = await testRender(<App />, { width: 110, height: 30 })
      await renderOnce()
      const frame = captureCharFrame()
      expect(frame).toContain("███████")
      expect(frame).toContain("your personal coding companion")
      expect(frame).toContain("Ask anything")
      renderer.destroy()
    },
    { pretrust: true }
  ))

// regression: the old single-line <input> kept the cursor 20% from the right edge, so in a
// narrow terminal it scrolled early and hid the start of the line ("hi, who are you?" rendered
// as ", who are you?"). The prompt now wraps, so the whole message must stay visible.
for (const width of [60, 85, 110]) {
  test(`long typed message stays fully visible at width ${width}`, () =>
    withIsolatedEnv(
      async () => {
        const { renderOnce, captureCharFrame, mockInput, renderer } = await testRender(<App />, { width, height: 30 })
        await renderOnce()
        const typed = "hi, who are you? this line is deliberately longer than the prompt box is wide"
        await mockInput.typeText(typed)
        await renderOnce()
        expect(collapse(captureCharFrame())).toContain(typed)
        renderer.destroy()
      },
      { pretrust: true }
    ))
}

test("untrusted directory shows the trust gate, not the home screen", () =>
  withIsolatedEnv(async dir => {
    const { renderOnce, captureCharFrame, renderer } = await testRender(<App />, { width: 110, height: 30 })
    await renderOnce()
    const frame = captureCharFrame()
    expect(frame).toContain("wants to read and edit files in")
    expect(frame).toContain(fs.realpathSync(dir))
    expect(frame).not.toContain("Ask anything")
    renderer.destroy()
  }))

test("pressing y trusts the directory, persists it, and reveals the home screen", () =>
  withIsolatedEnv(async (dir, fakeHome) => {
    const { renderOnce, captureCharFrame, mockInput, renderer } = await testRender(<App />, { width: 110, height: 30 })
    await renderOnce()
    await mockInput.pressKeys(["y"])
    await flushReact()
    await renderOnce()
    const frame = captureCharFrame()
    expect(frame).toContain("Ask anything")
    expect(frame).not.toContain("wants to read and edit files in")

    const store = JSON.parse(fs.readFileSync(path.join(fakeHome, ".pi-cli", "trusted-dirs.json"), "utf-8"))
    expect(store.trusted).toEqual([fs.realpathSync(dir)])
    renderer.destroy()
  }))

// regression: declining used to call process.exit(0) directly, which skips the renderer's shutdown
// — the terminal stayed in raw mode with mouse tracking on, and the shell printed every mouse move
// as text ("35;65;7M…"). The renderer must be destroyed *before* the process exits.
test("pressing n exits instead of trusting, restoring the terminal first", () =>
  withIsolatedEnv(async (_dir, fakeHome) => {
    const { renderOnce, mockInput, renderer } = await testRender(<App />, { width: 110, height: 30 })
    await renderOnce()

    let destroyed = false
    const realDestroy = renderer.destroy.bind(renderer)
    renderer.destroy = () => {
      destroyed = true
      realDestroy()
    }

    const exitCalls: { code: unknown; rendererDestroyedFirst: boolean }[] = []
    const realExit = process.exit
    process.exit = ((code?: number) => {
      exitCalls.push({ code, rendererDestroyedFirst: destroyed })
    }) as typeof process.exit
    try {
      await mockInput.pressKeys(["n"])
      await flushReact()
      await renderOnce()
    } finally {
      process.exit = realExit
    }

    expect(exitCalls).toEqual([{ code: 0, rendererDestroyedFirst: true }])
    expect(fs.existsSync(path.join(fakeHome, ".pi-cli", "trusted-dirs.json"))).toBe(false)
  }))

test("an already-trusted directory skips the gate on next launch", () =>
  withIsolatedEnv(async () => {
    const first = await testRender(<App />, { width: 110, height: 30 })
    await first.renderOnce()
    await first.mockInput.pressKeys(["y"])
    await first.renderOnce()
    first.renderer.destroy()

    const second = await testRender(<App />, { width: 110, height: 30 })
    await second.renderOnce()
    expect(second.captureCharFrame()).toContain("Ask anything")
    second.renderer.destroy()
  }))
