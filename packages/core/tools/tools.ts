import fs from 'fs'
import path from 'path'
import { exitCode } from 'process'


export async function ReadFile(input: Record<string, unknown>): Promise<string> {
  const filePath: string = input.path as string
  try {
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    
    return content
  } catch (e: any) {
    return `Error reading file: ${e.message}`
  }
}

export async function WriteFile(input: Record<string, unknown>): Promise<string> {
  const filePath: string = input.path as string
  const content: string = input.content as string
  try {
    if(!fs.existsSync(filePath))
    fs.mkdir(path.dirname(filePath), (err) =>{
        console.log("Error occurred while creating directory")
    })

    fs.writeFileSync(filePath, content, "utf-8")
    return `Successfully wrote ${content.length} chars to ${filePath}`
  } catch (e: any) {
    return `Error writing file: ${e.message}`
  }
}

export async function EditFile(input: Record<string, unknown>): Promise<string> {
  const filePath = input.path as string
  const oldStr = input.old_string as string
  const newStr = input.new_string as string

  try {
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"))

    const occurrences = content.split(oldStr).length - 1
    if (occurrences === 0) {
      return `Error: old_string not found in ${filePath}`
    }
    if (occurrences > 1) {
      return `Error: old_string found ${occurrences} times in ${filePath}, must be unique. Add more surrounding context.`
    }

    const updated = content.replace(oldStr, newStr)
    await fs.writeFileSync(filePath, updated, "utf-8")
    return `Successfully edited ${filePath}`
  } catch (e: any) {
    if (e.code === "ENOENT") return `Error: file not found at ${filePath}`
    return `Error editing file: ${e.message}`
  }
}

export async function Bash(input: Record<string, unknown>): Promise<string> {
  const command = input.command as string
  const cwd = (input.cwd as string) ?? process.cwd()

  try {
    // const process = Bun.spawn(["bash", "-c", command], {
    //   cwd,
    //   stdout: "pipe",
    //   stderr: "pipe"
    // })

    // const timeout = setTimeout(() => process.kill(), 30000)

    // const [stdout, stderr, exitCode] = await Promise.all([
    //   new Response(process.stdout).text(),
    //   new Response(process.stderr).text(),
    //   process.exited
    // ])

    // clearTimeout(timeout)

    // const MAX_LEN = 20_000
    // let output = stdout + (stderr ? `\n[stderr]\n${stderr}` : "")
    // if (output.length > MAX_LEN) {
    //   output = output.slice(0, MAX_LEN) + `\n... [truncated]`
    // }

    // return `Exit code: ${exitCode}\n${output}`
    const process = Bun.spawnSync({
        cmd: ["bash", "-c", command],
        cwd: cwd, 
        stdout: "pipe",
        stderr: "pipe"
    })
    let output = new TextDecoder().decode(process.stdout)
    const stdErr = new TextDecoder().decode(process.stderr)
    if(stdErr){
        output += stdErr
    }
    return `Exit code: ${process.exitCode} \n ${output}`
  } catch (e: any) {
    return `Error executing command: ${e.message}`
  }
}