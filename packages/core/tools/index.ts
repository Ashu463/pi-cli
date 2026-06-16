
import { Tool } from "../model"
import { Bash, EditFile, ReadFile, WriteFile } from "./tools"

export const readFileTool: Tool = {
  name: "read_file",
  description: "Read the contents of a file at the given path. Returns the file content as text. Use this to inspect source code, config files, or any text-based file before editing it.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative or absolute path to the file" }
    },
    required: ["path"]
  },
  execute: ReadFile
}

export const writeFileTool: Tool = {
  name: "write_file",
  description: "Write content to a file, creating it if it doesn't exist or overwriting it if it does. Creates parent directories automatically. Use this to create new files or fully replace existing file content.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative or absolute path to the file" },
      content: { type: "string", description: "Full content to write to the file" }
    },
    required: ["path", "content"]
  },
  execute: WriteFile
}

export const editFileTool: Tool = {
  name: "edit_file",
  description: "Edit a file by replacing an exact, unique occurrence of old_string with new_string. old_string must match the file content exactly (including whitespace/indentation) and must appear exactly once in the file. Use read_file first to get the exact text to match.",
  input_schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative or absolute path to the file" },
      old_string: { type: "string", description: "Exact text to find (must be unique in the file)" },
      new_string: { type: "string", description: "Text to replace it with" }
    },
    required: ["path", "old_string", "new_string"]
  },
  execute: EditFile
}

export const bashTool: Tool = {
  name: "bash",
  description: "Execute a shell command and return its stdout/stderr output. Use for running builds, tests, git commands, listing files, etc. Avoid long-running or interactive commands.",
  input_schema: {
    type: "object",
    properties: {
      command: { type: "string", description: "The shell command to execute" },
      cwd: { type: "string", description: "Working directory to run the command in (optional)" },
    },
    required: ["command"]
  },
  execute: Bash
}

export const allTools: Tool[] = [readFileTool, writeFileTool, editFileTool, bashTool]