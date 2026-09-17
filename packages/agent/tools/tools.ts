import fs from 'fs'
import path from 'path'
import { logger } from '../logger'
import { BASH_TIMEOUT_MS, BASH_MAX_OUTPUT_LEN } from '../config/systemConfig'
import { GuardrailError, assertBashAllowed, resolveWithinCwd } from '../guardrails'

function refusal(e: unknown, fallback: string): string | null {
  if (e instanceof GuardrailError) return e.message
  return `${fallback}: ${e instanceof Error ? e.message : String(e)}`
}

export async function ReadFile(input: Record<string, unknown>, cwd: string): Promise<string> {
  try {
    const filePath = resolveWithinCwd(input.path as string, cwd)
    return fs.readFileSync(filePath, "utf-8")
  } catch (e) {
    return refusal(e, "Error reading file")!
  }
}

export async function WriteFile(input: Record<string, unknown>, cwd: string): Promise<string> {
  const content: string = input.content as string
  try {
    const filePath = resolveWithinCwd(input.path as string, cwd)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, "utf-8")
    return `Successfully wrote ${content.length} chars to ${filePath}`
  } catch (e) {
    return refusal(e, "Error writing file")!
  }
}

export async function EditFile(input: Record<string, unknown>, cwd: string): Promise<string> {
  const oldStr = input.old_string as string
  const newStr = input.new_string as string

  try {
    const filePath = resolveWithinCwd(input.path as string, cwd)
    const content = fs.readFileSync(filePath, "utf-8")

    const occurrences = content.split(oldStr).length - 1
    if (occurrences === 0) {
      return `Error: old_string not found in ${filePath}`
    }
    if (occurrences > 1) {
      return `Error: old_string found ${occurrences} times in ${filePath}, must be unique. Add more surrounding context.`
    }

    const updated = content.replace(oldStr, newStr)
    fs.writeFileSync(filePath, updated, "utf-8")
    return `Successfully edited ${filePath}`
  } catch (e: any) {
    if (e?.code === "ENOENT") return `Error: file not found at ${input.path}`
    return refusal(e, "Error editing file")!
  }
}

export async function Bash(input: Record<string, unknown>, cwd: string): Promise<string> {
  const command = input.command as string

  try {
    assertBashAllowed(command)
    const workingDir = fs.realpathSync(path.resolve(cwd))

    const proc = Bun.spawnSync({
        cmd: ["bash", "-c", command],
        cwd: workingDir,
        stdout: "pipe",
        stderr: "pipe",
        timeout: BASH_TIMEOUT_MS
    })
    let output = new TextDecoder().decode(proc.stdout)
    const stdErr = new TextDecoder().decode(proc.stderr)
    if(stdErr){
        output += stdErr
    }
    if (output.length > BASH_MAX_OUTPUT_LEN) {
      output = output.slice(0, BASH_MAX_OUTPUT_LEN) + `\n... [truncated]`
    }
    if (proc.signalCode === "SIGTERM") {
      return `Command timed out after ${BASH_TIMEOUT_MS}ms\n${output}`
    }
    return `Exit code: ${proc.exitCode} \n ${output}`
  } catch (e) {
    return refusal(e, "Error executing command")!
  }
}
