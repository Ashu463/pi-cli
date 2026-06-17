
export interface AgentRequest{
    message: string,
    provider: string
    model: string,
    apiKey: string,
}

export interface LLMRequest{
    provider: string,
    model: string,
    apiKey: string, 
    llmContext: LLMContext
}
export interface LLMContext{
    content: string,
    systemPrompt: string,
    tools: ToolName[]
}

export type ToolName = "read" | "write" | "edit" | "bash"
type stopReason = "completed" | "toolCall" | "aborted" | "error"
export interface LLMResponse{
    output: string
    stopReason: stopReason
    toolCalls: ToolCall[] | undefined
    // tools?: Tool[] this to be made on agent side 
    // before calling tool
}
export interface ToolCall{
    id: string
    name: string
    input: Record<string, unknown>
}
export interface Tool {
  name: string
  description: string
  input_schema: Record<string, unknown>
  execute: (input: Record<string, unknown>) => Promise<string>
}
export interface ReadTool{
    name: "read"
    filePath: string
}
export interface WriteTool{
    name: "write"
    filePath: string
    content: string
}
export interface EditTool {
    name: "edit"
    filePath: string,
    content: string
}
export interface BashTool {
    name: "bash"
    executionDirectory: string,
    command: string
}
export interface AgentContext{

}