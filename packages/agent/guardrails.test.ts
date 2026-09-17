import { test, expect, beforeAll, afterAll } from "bun:test"
import fs from "fs"
import os from "os"
import path from "path"
import { ReadFile, WriteFile, Bash } from "./tools/tools"

let root: string
let outside: string

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "aeon-guard-"))
  fs.mkdirSync(path.join(root, "src"))
  fs.writeFileSync(path.join(root, "src/app.ts"), "export const ok = true")
  fs.writeFileSync(path.join(root, ".env"), "DEEPSEEK_API_KEY=sk-secret")

  outside = fs.mkdtempSync(path.join(os.tmpdir(), "aeon-outside-"))
  fs.writeFileSync(path.join(outside, "secrets.txt"), "TOP SECRET")
  fs.symlinkSync(outside, path.join(root, "escape-link"))
})

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true })
  fs.rmSync(outside, { recursive: true, force: true })
})

test("reads a normal file inside the project", async () => {
  expect(await ReadFile({ path: "src/app.ts" }, root)).toBe("export const ok = true")
})

test("refuses traversal out of the project", async () => {
  const result = await ReadFile({ path: "../../etc/passwd" }, root)
  expect(result).toContain("outside the working directory")
})

test("refuses absolute paths out of the project", async () => {
  const result = await ReadFile({ path: path.join(outside, "secrets.txt") }, root)
  expect(result).toContain("outside the working directory")
  expect(result).not.toContain("TOP SECRET")
})

test("refuses symlinks that point outside the project", async () => {
  const result = await ReadFile({ path: "escape-link/secrets.txt" }, root)
  expect(result).toContain("outside the working directory")
  expect(result).not.toContain("TOP SECRET")
})

test("refuses secret files even inside the project", async () => {
  const result = await ReadFile({ path: ".env" }, root)
  expect(result).toContain("secret or credential file")
  expect(result).not.toContain("sk-secret")
})

test("refuses writing outside the project", async () => {
  const target = path.join(outside, "pwned.txt")
  const result = await WriteFile({ path: target, content: "x" }, root)
  expect(result).toContain("outside the working directory")
  expect(fs.existsSync(target)).toBe(false)
})

test("bash ignores a model-supplied cwd and stays in the project", async () => {
  const result = await Bash({ command: "pwd", cwd: outside }, root)
  expect(result).toContain(fs.realpathSync(root))
  expect(result).not.toContain(fs.realpathSync(outside))
})

test("bash blocks credential snooping", async () => {
  const result = await Bash({ command: "cat ~/.ssh/id_rsa" }, root)
  expect(result).toContain("Refused")
})

test("bash still runs ordinary commands", async () => {
  expect(await Bash({ command: "echo hello" }, root)).toContain("hello")
})
